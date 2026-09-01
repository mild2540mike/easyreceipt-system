import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import vm from "node:vm"

const scriptSource = readFileSync(new URL("./Code.gs", import.meta.url), "utf8")

function loadScript(globals = {}) {
  const context = vm.createContext({ ...globals })
  vm.runInContext(scriptSource, context, { filename: "Code.gs" })
  return context
}

function plain(value) {
  return JSON.parse(JSON.stringify(value))
}

class FakeRange {
  constructor(sheet, key) {
    this.sheet = sheet
    this.key = key
  }

  record(name, value = true) {
    this.sheet.calls.push({ key: this.key, name, value })
    return this
  }

  breakApart() {
    return this.record("breakApart")
  }

  clear() {
    return this.record("clear")
  }

  merge() {
    return this.record("merge")
  }

  setValue(value) {
    return this.record("setValue", value)
  }

  setValues(value) {
    return this.record("setValues", plain(value))
  }

  setNumberFormats(value) {
    return this.record("setNumberFormats", plain(value))
  }

  setNumberFormat(value) {
    return this.record("setNumberFormat", value)
  }

  setFontWeight(value) {
    return this.record("setFontWeight", value)
  }

  setFontSize(value) {
    return this.record("setFontSize", value)
  }

  setFontColor(value) {
    return this.record("setFontColor", value)
  }

  setBackground(value) {
    return this.record("setBackground", value)
  }

  setHorizontalAlignment(value) {
    return this.record("setHorizontalAlignment", value)
  }

  setVerticalAlignment(value) {
    return this.record("setVerticalAlignment", value)
  }

  setBorder(...value) {
    return this.record("setBorder", value)
  }

  createFilter() {
    this.sheet.filterRange = this.key
    return this.record("createFilter")
  }
}

class FakeSheet {
  constructor(lastRow = 10) {
    this.calls = []
    this.lastRow = lastRow
    this.filterRange = null
    this.frozenRows = 0
    this.removedFilter = false
  }

  getRange(...args) {
    const key = args.length === 1 ? args[0] : args.join(":")
    return new FakeRange(this, key)
  }

  getLastRow() {
    return this.lastRow
  }

  getMaxRows() {
    return 100
  }

  getMaxColumns() {
    return 26
  }

  getFilter() {
    return {
      remove: () => {
        this.removedFilter = true
      },
    }
  }

  insertRowsAfter() {
    throw new Error("Unexpected row insertion")
  }

  insertColumnsAfter() {
    throw new Error("Unexpected column insertion")
  }

  setFrozenRows(value) {
    this.frozenRows = value
  }

  setColumnWidth(column, width) {
    this.calls.push({ key: `column:${column}`, name: "width", value: width })
  }

  setRowHeight(row, height) {
    this.calls.push({ key: `row:${row}`, name: "height", value: height })
  }
}

function findCall(sheet, key, name) {
  return sheet.calls.find((call) => call.key === key && call.name === name)
}

describe("Google Apps Script inventory sync", () => {
  it("validates API rows and keeps quantities and prices numeric", () => {
    const context = loadScript()
    const result = context.validateInventoryPayload_({
      exportedAt: "2026-09-02T03:00:00.000Z",
      branches: [
        {
          id: "branch-a",
          code: "BKK",
          name: "สาขากรุงเทพ",
          inventory: [
            {
              ingredientName: "ข้าวสาร",
              unit: "กก.",
              onHand: "12.5",
              latestPrice: "65",
            },
          ],
        },
      ],
    })

    assert.deepEqual(plain(result.branches[0].inventory), [
      {
        ingredientName: "ข้าวสาร",
        unit: "กก.",
        onHand: 12.5,
        latestPrice: 65,
      },
    ])
    assert.equal(context.quantityNumberFormat_("กก."), '#,##0.### "กก."')
    assert.equal(context.safeSheetText_("=IMPORTDATA(\"bad\")"), "'=IMPORTDATA(\"bad\")")
    assert.throws(
      () =>
        context.validateInventoryPayload_({
          exportedAt: "invalid",
          branches: [],
        }),
      /เวลาส่งออก/
    )
  })

  it("requires a shared integration token with at least 32 characters", () => {
    const context = loadScript({
      PropertiesService: {
        getScriptProperties: () => ({
          getProperties: () => ({
            API_BASE_URL: "https://api.example.com/api/v1",
            INTEGRATION_TOKEN: "a".repeat(31),
            SYNC_INTERVAL_MINUTES: "2",
            SPREADSHEET_ID: "sheet-1",
          }),
        }),
      },
    })

    assert.throws(() => context.getSyncConfig_(), /อย่างน้อย 32 ตัวอักษร/)
  })

  it("accepts an integration token longer than 32 characters", () => {
    const context = loadScript({
      PropertiesService: {
        getScriptProperties: () => ({
          getProperties: () => ({
            API_BASE_URL: "https://api.example.com/api/v1",
            INTEGRATION_TOKEN: "a".repeat(64),
            SYNC_INTERVAL_MINUTES: "2",
            SPREADSHEET_ID: "sheet-1",
          }),
        }),
      },
    })

    assert.equal(context.getSyncConfig_().integrationToken.length, 64)
  })

  it("requires the sync interval to be a positive whole number", () => {
    const context = loadScript({
      PropertiesService: {
        getScriptProperties: () => ({
          getProperties: () => ({
            API_BASE_URL: "https://api.example.com/api/v1",
            INTEGRATION_TOKEN: "a".repeat(32),
            SYNC_INTERVAL_MINUTES: "0",
            SPREADSHEET_ID: "sheet-1",
          }),
        }),
      },
    })

    assert.throws(() => context.getSyncConfig_(), /จำนวนเต็มตั้งแต่ 1/)
  })

  it("captures the active spreadsheet ID when the property is missing", () => {
    const propertyValues = {
      API_BASE_URL: "https://api.example.com/api/v1",
      INTEGRATION_TOKEN: "a".repeat(32),
      SYNC_INTERVAL_MINUTES: "2",
    }
    const context = loadScript({
      PropertiesService: {
        getScriptProperties: () => ({
          getProperties: () => ({ ...propertyValues }),
          setProperty: (key, value) => {
            propertyValues[key] = value
          },
        }),
      },
      SpreadsheetApp: {
        getActiveSpreadsheet: () => ({ getId: () => "sheet-from-context" }),
      },
    })

    const config = context.getSyncConfig_()

    assert.equal(config.spreadsheetId, "sheet-from-context")
    assert.equal(propertyValues.SPREADSHEET_ID, "sheet-from-context")
  })

  it("replaces the authored range and applies headers, formats, filter, and freeze", () => {
    const sheet = new FakeSheet(12)
    const spreadsheet = {
      getSheetByName: (name) => {
        assert.equal(name, "คลัง-BKK")
        return sheet
      },
      insertSheet: () => {
        throw new Error("Existing sheet should be reused")
      },
    }
    const context = loadScript({
      SpreadsheetApp: { BorderStyle: { SOLID: "SOLID" } },
      Utilities: {
        formatDate: () => "02/09/2026 10:00",
      },
    })

    context.updateInventorySheet_(spreadsheet, {
      branch: { id: "branch-a", code: "BKK", name: "สาขากรุงเทพ" },
      exportedAt: "2026-09-02T03:00:00.000Z",
      inventory: [
        {
          ingredientName: "ข้าวสาร",
          unit: "กก.",
          onHand: 12.5,
          latestPrice: 65,
        },
        {
          ingredientName: "ไข่ไก่",
          unit: "ฟอง",
          onHand: 0,
          latestPrice: 4.25,
        },
      ],
    })

    assert.equal(sheet.removedFilter, true)
    assert.equal(sheet.frozenRows, 5)
    assert.equal(sheet.filterRange, "5:1:3:3")
    assert.deepEqual(findCall(sheet, "A5:C5", "setValues").value, [
      ["วัตถุดิบ", "คงเหลือ", "ราคาล่าสุด"],
    ])
    assert.deepEqual(findCall(sheet, "6:1:2:3", "setValues").value, [
      ["ข้าวสาร", 12.5, 65],
      ["ไข่ไก่", 0, 4.25],
    ])
    assert.deepEqual(
      findCall(sheet, "6:2:2:1", "setNumberFormats").value,
      [['#,##0.### "กก."'], ['#,##0.### "ฟอง"']]
    )
    assert.equal(
      findCall(sheet, "6:3:2:1", "setNumberFormat").value,
      '"฿"#,##0.00'
    )
    assert.ok(findCall(sheet, "1:1:12:3", "clear"))
  })

  it("keeps only the header when the API returns no inventory", () => {
    const sheet = new FakeSheet(9)
    const context = loadScript({
      SpreadsheetApp: { BorderStyle: { SOLID: "SOLID" } },
      Utilities: { formatDate: () => "02/09/2026 10:00" },
    })

    context.updateInventorySheet_(
      {
        getSheetByName: () => sheet,
        insertSheet: () => sheet,
      },
      {
        branch: { id: "branch-a", code: "BKK", name: "สาขากรุงเทพ" },
        exportedAt: "2026-09-02T03:00:00.000Z",
        inventory: [],
      }
    )

    assert.equal(sheet.filterRange, null)
    assert.ok(findCall(sheet, "A5:C5", "setValues"))
    assert.ok(findCall(sheet, "1:1:9:3", "clear"))
  })

  it("recreates a single scheduled trigger when setup is run repeatedly", () => {
    const propertyValues = {
      API_BASE_URL: "https://api.example.com/api/v1",
      INTEGRATION_TOKEN: "a".repeat(32),
      SYNC_INTERVAL_MINUTES: "2",
    }
    const properties = {
      setProperty: (key, value) => {
        propertyValues[key] = value
      },
      getProperties: () => ({ ...propertyValues }),
    }
    const triggers = [{ handler: "unrelatedTask" }]
    const scriptApp = {
      getProjectTriggers: () => [...triggers],
      deleteTrigger: (trigger) => {
        triggers.splice(triggers.indexOf(trigger), 1)
      },
      newTrigger: (handler) => ({
        timeBased: () => ({
          everyMinutes: (minutes) => ({
            create: () => triggers.push({ handler, minutes }),
          }),
        }),
      }),
    }
    triggers[0].getHandlerFunction = () => triggers[0].handler
    const originalNewTrigger = scriptApp.newTrigger
    scriptApp.newTrigger = (handler) => {
      const builder = originalNewTrigger(handler)
      const originalCreate = builder.timeBased().everyMinutes(1).create
      return {
        timeBased: () => ({
          everyMinutes: (minutes) => ({
            create: () => {
              originalCreate()
              const created = triggers[triggers.length - 1]
              created.minutes = minutes
              created.getHandlerFunction = () => created.handler
            },
          }),
        }),
      }
    }
    const context = loadScript({
      SpreadsheetApp: { getActiveSpreadsheet: () => ({ getId: () => "sheet-1" }) },
      PropertiesService: { getScriptProperties: () => properties },
      ScriptApp: scriptApp,
    })
    let syncCount = 0
    context.syncInventory = () => {
      syncCount += 1
      return { ok: true }
    }

    context.setupInventorySync()
    context.setupInventorySync()

    assert.equal(propertyValues.SPREADSHEET_ID, "sheet-1")
    assert.equal(syncCount, 2)
    assert.equal(
      triggers.filter((trigger) => trigger.handler === "scheduledInventorySync")
        .length,
      1
    )
    assert.equal(
      triggers.find((trigger) => trigger.handler === "scheduledInventorySync")
        .minutes,
      1
    )
  })

  it("syncs every returned branch into its own inventory tab", () => {
    const updatedBranches = []
    let toastMessage = ""
    const context = loadScript({
      PropertiesService: {
        getScriptProperties: () => ({
          getProperties: () => ({
            API_BASE_URL: "https://api.example.com/api/v1",
            INTEGRATION_TOKEN: "a".repeat(32),
            SYNC_INTERVAL_MINUTES: "2",
            SPREADSHEET_ID: "sheet-1",
          }),
          setProperty: () => {},
        }),
      },
      LockService: {
        getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }),
      },
      UrlFetchApp: {
        fetch: (url) => {
          assert.equal(
            url,
            "https://api.example.com/api/v1/integrations/google-sheets/inventory"
          )
          return {
            getResponseCode: () => 200,
            getContentText: () =>
              JSON.stringify({
                exportedAt: "2026-09-02T03:00:00.000Z",
                branches: [
                  {
                    id: "branch-a",
                    code: "A",
                    name: "สาขา A",
                    inventory: [
                      {
                        ingredientName: "ข้าวสาร",
                        unit: "กก.",
                        onHand: 1,
                        latestPrice: 65,
                      },
                    ],
                  },
                  {
                    id: "branch-b",
                    code: "B",
                    name: "สาขา B",
                    inventory: [],
                  },
                ],
              }),
            getHeaders: () => ({ "Content-Type": "application/json" }),
          }
        },
      },
      SpreadsheetApp: {
        openById: () => ({
          toast: (message) => {
            toastMessage = message
          },
        }),
      },
    })
    context.updateInventorySheet_ = (_spreadsheet, branchPayload) => {
      updatedBranches.push(plain(branchPayload))
    }

    const result = context.syncInventory()

    assert.deepEqual(
      updatedBranches.map((item) => item.branch.code),
      ["A", "B"]
    )
    assert.equal(result.branchCount, 2)
    assert.equal(result.itemCount, 1)
    assert.match(toastMessage, /2 สาขา 1 รายการ/)
  })

  it("checks every minute but calls the API only after the configured interval", () => {
    const propertyValues = {
      API_BASE_URL: "https://api.example.com/api/v1",
      INTEGRATION_TOKEN: "a".repeat(32),
      SYNC_INTERVAL_MINUTES: "2",
      SPREADSHEET_ID: "sheet-1",
      LAST_SUCCESSFUL_SYNC_AT_MS: String(Date.now()),
    }
    let fetchCount = 0
    const context = loadScript({
      PropertiesService: {
        getScriptProperties: () => ({
          getProperties: () => ({ ...propertyValues }),
          setProperty: (key, value) => {
            propertyValues[key] = value
          },
        }),
      },
      LockService: {
        getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }),
      },
      UrlFetchApp: {
        fetch: () => {
          fetchCount += 1
          return {
            getResponseCode: () => 200,
            getContentText: () =>
              JSON.stringify({
                exportedAt: "2026-09-02T03:00:00.000Z",
                branches: [],
              }),
            getHeaders: () => ({ "Content-Type": "application/json" }),
          }
        },
      },
      SpreadsheetApp: {
        openById: () => ({ toast: () => {} }),
      },
    })

    const skipped = context.scheduledInventorySync()

    assert.equal(skipped.skipped, true)
    assert.equal(skipped.syncIntervalMinutes, 2)
    assert.equal(fetchCount, 0)

    propertyValues.LAST_SUCCESSFUL_SYNC_AT_MS = String(Date.now() - 121_000)
    const completed = context.scheduledInventorySync()

    assert.equal(completed.branchCount, 0)
    assert.equal(fetchCount, 1)
    assert.ok(
      Number(propertyValues.LAST_SUCCESSFUL_SYNC_AT_MS) > Date.now() - 5_000
    )
  })

  it("does not open or modify the spreadsheet when the API request fails", () => {
    let released = false
    let spreadsheetOpened = false
    const context = loadScript({
      PropertiesService: {
        getScriptProperties: () => ({
          getProperties: () => ({
            API_BASE_URL: "https://api.example.com/api/v1",
            INTEGRATION_TOKEN: "a".repeat(32),
            SYNC_INTERVAL_MINUTES: "2",
            SPREADSHEET_ID: "sheet-1",
          }),
          setProperty: () => {},
        }),
      },
      LockService: {
        getScriptLock: () => ({
          tryLock: () => true,
          releaseLock: () => {
            released = true
          },
        }),
      },
      UrlFetchApp: {
        fetch: () => ({
          getResponseCode: () => 503,
          getContentText: () => "temporarily unavailable",
        }),
      },
      SpreadsheetApp: {
        openById: () => {
          spreadsheetOpened = true
        },
      },
    })

    assert.throws(() => context.syncInventory(), /HTTP 503/)
    assert.equal(spreadsheetOpened, false)
    assert.equal(released, true)
  })

  it("reports the endpoint and content type when a successful response is HTML", () => {
    const context = loadScript({
      UrlFetchApp: {
        fetch: (_url, options) => {
          assert.equal(options.followRedirects, false)
          return {
            getResponseCode: () => 200,
            getContentText: () => "<!doctype html><html><body>Frontend</body></html>",
            getHeaders: () => ({ "Content-Type": "text/html; charset=utf-8" }),
          }
        },
      },
    })

    assert.throws(
      () =>
        context.fetchInventory_({
          apiBaseUrl: "https://app.example.com/api/v1",
          integrationToken: "a".repeat(32),
        }),
      (error) =>
        /app\.example\.com/.test(error.message) &&
        /text\/html/.test(error.message) &&
        /Frontend/.test(error.message)
    )
  })

  it("reports the redirect target without following it with the token", () => {
    const context = loadScript({
      UrlFetchApp: {
        fetch: (_url, options) => {
          assert.equal(options.followRedirects, false)
          return {
            getResponseCode: () => 302,
            getContentText: () => "",
            getHeaders: () => ({
              Location: "https://api.example.com/api/v1/integrations/google-sheets/inventory",
            }),
          }
        },
      },
    })

    assert.throws(
      () =>
        context.fetchInventory_({
          apiBaseUrl: "https://example.com/api/v1",
          integrationToken: "a".repeat(32),
        }),
      (error) =>
        /HTTP 302/.test(error.message) &&
        /api\.example\.com/.test(error.message)
    )
  })
})

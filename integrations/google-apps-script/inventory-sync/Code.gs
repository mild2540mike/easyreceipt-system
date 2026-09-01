var INVENTORY_SHEET_PREFIX = "คลัง-";
var MANUAL_SYNC_HANDLER_NAME = "syncInventory";
var SCHEDULED_SYNC_HANDLER_NAME = "scheduledInventorySync";
var LAST_SUCCESSFUL_SYNC_AT_PROPERTY = "LAST_SUCCESSFUL_SYNC_AT_MS";
var BANGKOK_TIME_ZONE = "Asia/Bangkok";
var REQUIRED_PROPERTY_KEYS = [
  "API_BASE_URL",
  "INTEGRATION_TOKEN",
  "SYNC_INTERVAL_MINUTES",
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("timetoeat")
    .addItem("ซิงก์คลังตอนนี้", MANUAL_SYNC_HANDLER_NAME)
    .addToUi();
}

function setupInventorySync() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("กรุณาเปิด Apps Script จาก Google Sheet ที่ต้องการซิงก์");
  }

  var properties = PropertiesService.getScriptProperties();
  properties.setProperty("SPREADSHEET_ID", spreadsheet.getId());
  getSyncConfig_();

  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    var handlerName = trigger.getHandlerFunction();

    if (
      handlerName === MANUAL_SYNC_HANDLER_NAME ||
      handlerName === SCHEDULED_SYNC_HANDLER_NAME
    ) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Apps Script does not support everyMinutes(2). Check once a minute and
  // use SYNC_INTERVAL_MINUTES to decide when the API should actually be called.
  ScriptApp.newTrigger(SCHEDULED_SYNC_HANDLER_NAME)
    .timeBased()
    .everyMinutes(1)
    .create();

  return syncInventory();
}

function syncInventory() {
  return runInventorySync_(true);
}

function scheduledInventorySync() {
  return runInventorySync_(false);
}

function runInventorySync_(forceSync) {
  var lock = LockService.getScriptLock();

  if (!lock.tryLock(30000)) {
    throw new Error("มีการซิงก์คลังทำงานอยู่ กรุณาลองใหม่อีกครั้ง");
  }

  try {
    var config = getSyncConfig_();

    if (!forceSync && !isScheduledSyncDue_(config)) {
      return {
        skipped: true,
        syncIntervalMinutes: config.syncIntervalMinutes,
      };
    }

    var payload = fetchInventory_(config);
    var spreadsheet = SpreadsheetApp.openById(config.spreadsheetId);
    var totalItems = 0;

    payload.branches.forEach(function (branchPayload) {
      updateInventorySheet_(spreadsheet, {
        branch: {
          id: branchPayload.id,
          code: branchPayload.code,
          name: branchPayload.name,
        },
        exportedAt: payload.exportedAt,
        inventory: branchPayload.inventory,
      });
      totalItems += branchPayload.inventory.length;
    });
    PropertiesService.getScriptProperties().setProperty(
      LAST_SUCCESSFUL_SYNC_AT_PROPERTY,
      String(Date.now())
    );
    spreadsheet.toast(
      "ซิงก์สำเร็จ " +
        payload.branches.length +
        " สาขา " +
        totalItems +
        " รายการ",
      "timetoeat",
      5
    );

    return {
      branchCount: payload.branches.length,
      itemCount: totalItems,
      exportedAt: payload.exportedAt,
    };
  } finally {
    lock.releaseLock();
  }
}

function isScheduledSyncDue_(config) {
  if (!config.lastSuccessfulSyncAtMs) {
    return true;
  }

  return (
    Date.now() - config.lastSuccessfulSyncAtMs >=
    config.syncIntervalMinutes * 60 * 1000
  );
}

function getSyncConfig_() {
  var properties = PropertiesService.getScriptProperties();
  var values = properties.getProperties();
  var missingKeys = REQUIRED_PROPERTY_KEYS.filter(function (key) {
    return !String(values[key] || "").trim();
  });

  if (missingKeys.length > 0) {
    throw new Error(
      "กรุณาตั้งค่า Script Properties: " + missingKeys.join(", ")
    );
  }

  var apiBaseUrl = String(values.API_BASE_URL).trim().replace(/\/+$/, "");

  if (!/^https:\/\//i.test(apiBaseUrl)) {
    throw new Error("API_BASE_URL ต้องเป็น HTTPS ที่ Google เข้าถึงได้");
  }

  var integrationToken = String(values.INTEGRATION_TOKEN).trim();

  if (integrationToken.length < 32) {
    throw new Error("INTEGRATION_TOKEN ต้องมีความยาวอย่างน้อย 32 ตัวอักษร");
  }

  var syncIntervalText = String(values.SYNC_INTERVAL_MINUTES).trim();

  if (!/^\d+$/.test(syncIntervalText) || Number(syncIntervalText) < 1) {
    throw new Error("SYNC_INTERVAL_MINUTES ต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป");
  }

  var syncIntervalMinutes = Number(syncIntervalText);
  var lastSuccessfulSyncAtMs = Number(
    values[LAST_SUCCESSFUL_SYNC_AT_PROPERTY] || 0
  );

  var spreadsheetId = String(values.SPREADSHEET_ID || "").trim();

  if (!spreadsheetId) {
    var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    if (!activeSpreadsheet) {
      throw new Error(
        "ไม่พบ SPREADSHEET_ID กรุณาเปิดสคริปต์จาก Google Sheet แล้วรัน setupInventorySync"
      );
    }

    spreadsheetId = activeSpreadsheet.getId();
    properties.setProperty("SPREADSHEET_ID", spreadsheetId);
  }

  return {
    apiBaseUrl: apiBaseUrl,
    integrationToken: integrationToken,
    spreadsheetId: spreadsheetId,
    syncIntervalMinutes: syncIntervalMinutes,
    lastSuccessfulSyncAtMs:
      isFinite(lastSuccessfulSyncAtMs) && lastSuccessfulSyncAtMs > 0
        ? lastSuccessfulSyncAtMs
        : 0,
  };
}

function fetchInventory_(config) {
  var endpoint = config.apiBaseUrl + "/integrations/google-sheets/inventory";
  var response = UrlFetchApp.fetch(endpoint, {
    method: "get",
    headers: { "X-Integration-Token": config.integrationToken },
    muteHttpExceptions: true,
    followRedirects: false,
  });
  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();
  var responseHeaders = response.getHeaders ? response.getHeaders() : {};

  if (statusCode >= 300 && statusCode < 400) {
    var redirectLocation =
      responseHeaders.Location || responseHeaders.location || "ไม่ระบุ";

    throw new Error(
      "API redirect (HTTP " +
        statusCode +
        ") ไปที่: " +
        redirectLocation +
        " กรุณาเปลี่ยน API_BASE_URL ให้เป็น URL ปลายทางโดยตรง"
    );
  }

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(
      "เรียก API ไม่สำเร็จ (HTTP " +
        statusCode +
        "): " +
        responseText.slice(0, 300)
    );
  }

  var payload;

  try {
    payload = JSON.parse(responseText.replace(/^\uFEFF/, ""));
  } catch (_error) {
    var contentType =
      responseHeaders["Content-Type"] ||
      responseHeaders["content-type"] ||
      "ไม่ระบุ";
    var preview = responseText
      .slice(0, 180)
      .replace(/\s+/g, " ")
      .trim();

    throw new Error(
      "API ส่งข้อมูลที่ไม่ใช่ JSON กรุณาตรวจ API_BASE_URL: " +
        endpoint +
        " | Content-Type: " +
        contentType +
        (preview ? " | Response: " + preview : "")
    );
  }

  return validateInventoryPayload_(payload);
}

function validateInventoryPayload_(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("รูปแบบข้อมูลจาก API ไม่ถูกต้อง");
  }

  if (
    typeof payload.exportedAt !== "string" ||
    isNaN(new Date(payload.exportedAt).getTime())
  ) {
    throw new Error("เวลาส่งออกจาก API ไม่ถูกต้อง");
  }

  if (!Array.isArray(payload.branches)) {
    throw new Error("รายการสาขาจาก API ไม่ถูกต้อง");
  }

  var branches = payload.branches.map(function (branch, branchIndex) {
    return validateBranchInventory_(branch, branchIndex);
  });

  return {
    exportedAt: payload.exportedAt,
    branches: branches,
  };
}

function validateBranchInventory_(branch, branchIndex) {
  if (
    !branch ||
    typeof branch.id !== "string" ||
    typeof branch.code !== "string" ||
    typeof branch.name !== "string" ||
    !Array.isArray(branch.inventory)
  ) {
    throw new Error("ข้อมูลสาขาลำดับที่ " + (branchIndex + 1) + " ไม่ถูกต้อง");
  }

  var inventory = branch.inventory.map(function (item, index) {
    var onHand = Number(item && item.onHand);
    var latestPrice = Number(item && item.latestPrice);

    if (
      !item ||
      typeof item.ingredientName !== "string" ||
      !item.ingredientName.trim() ||
      typeof item.unit !== "string" ||
      !item.unit.trim() ||
      !isFinite(onHand) ||
      !isFinite(latestPrice) ||
      onHand < 0 ||
      latestPrice < 0
    ) {
      throw new Error("ข้อมูลวัตถุดิบลำดับที่ " + (index + 1) + " ไม่ถูกต้อง");
    }

    return {
      ingredientName: item.ingredientName,
      unit: item.unit,
      onHand: onHand,
      latestPrice: latestPrice,
    };
  });

  return {
    id: branch.id,
    code: branch.code,
    name: branch.name,
    inventory: inventory,
  };
}

function updateInventorySheet_(spreadsheet, payload) {
  var sheetName = inventorySheetName_(payload.branch);
  var sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  var desiredLastRow = Math.max(5, payload.inventory.length + 5);
  var clearLastRow = Math.max(5, sheet.getLastRow(), desiredLastRow);

  if (sheet.getMaxRows() < desiredLastRow) {
    sheet.insertRowsAfter(
      sheet.getMaxRows(),
      desiredLastRow - sheet.getMaxRows()
    );
  }

  if (sheet.getMaxColumns() < 3) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      3 - sheet.getMaxColumns()
    );
  }

  var existingFilter = sheet.getFilter();

  if (existingFilter) {
    existingFilter.remove();
  }

  sheet.getRange(1, 1, clearLastRow, 3).breakApart().clear();
  sheet.getRange("A1:C1").merge();
  sheet.getRange("A1").setValue("คลังวัตถุดิบ");
  sheet.getRange("A2").setValue("สาขา");
  sheet
    .getRange("B2:C2")
    .merge()
    .setValue(safeSheetText_(payload.branch.name));
  sheet.getRange("A3").setValue("ซิงก์ล่าสุด");
  sheet
    .getRange("B3:C3")
    .merge()
    .setValue(
      Utilities.formatDate(
        new Date(payload.exportedAt),
        BANGKOK_TIME_ZONE,
        "dd/MM/yyyy HH:mm"
      )
    );
  sheet
    .getRange("A5:C5")
    .setValues([["วัตถุดิบ", "คงเหลือ", "ราคาล่าสุด"]]);

  sheet
    .getRange("A1")
    .setFontWeight("bold")
    .setFontSize(20)
    .setFontColor("#0f172a")
    .setVerticalAlignment("middle");
  sheet.getRange("A2:A3").setFontWeight("bold").setFontColor("#475569");
  sheet
    .getRange("A5:C5")
    .setFontWeight("bold")
    .setFontColor("#0f172a")
    .setBackground("#f1f5f9")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  if (payload.inventory.length > 0) {
    var values = payload.inventory.map(function (item) {
      return [safeSheetText_(item.ingredientName), item.onHand, item.latestPrice];
    });
    var quantityFormats = payload.inventory.map(function (item) {
      return [quantityNumberFormat_(item.unit)];
    });

    sheet.getRange(6, 1, values.length, 3).setValues(values);
    sheet
      .getRange(6, 2, values.length, 1)
      .setNumberFormats(quantityFormats)
      .setHorizontalAlignment("right");
    sheet
      .getRange(6, 3, values.length, 1)
      .setNumberFormat('"฿"#,##0.00')
      .setHorizontalAlignment("right");
    sheet.getRange(5, 1, values.length + 1, 3).createFilter();
  }

  sheet
    .getRange(5, 1, payload.inventory.length + 1, 3)
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true,
      "#e2e8f0",
      SpreadsheetApp.BorderStyle.SOLID
    )
    .setVerticalAlignment("middle");
  sheet.setFrozenRows(5);
  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 160);
  sheet.setColumnWidth(3, 150);
  sheet.setRowHeight(1, 34);
  sheet.setRowHeight(5, 28);
}

function quantityNumberFormat_(unit) {
  var safeUnit = String(unit || "").trim().replace(/"/g, '""');

  return safeUnit ? '#,##0.### "' + safeUnit + '"' : "#,##0.###";
}

function safeSheetText_(value) {
  var text = String(value);

  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function inventorySheetName_(branch) {
  var code = String(branch.code || branch.id || "สาขา")
    .trim()
    .replace(/[\[\]\*\/\\\?\:]/g, "-");

  return (INVENTORY_SHEET_PREFIX + code).slice(0, 100);
}

import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { aggregateBranchReportTotals } from "./reporting"

describe("branch report totals", () => {
  const branches = [
    { id: "school-a", name: "โรงเรียน ก" },
    { id: "school-b", name: "โรงเรียน ข" },
    { id: "school-c", name: "โรงเรียน ค" },
  ]

  it("combines every date into one total per accessible school", () => {
    assert.deepEqual(
      aggregateBranchReportTotals(branches, [
        { branchId: "school-a", total: 100.25 },
        { branchId: "school-b", total: 60 },
        { branchId: "school-a", total: 25.5 },
      ]),
      [
        { branchId: "school-a", branchName: "โรงเรียน ก", total: 125.75 },
        { branchId: "school-b", branchName: "โรงเรียน ข", total: 60 },
        { branchId: "school-c", branchName: "โรงเรียน ค", total: 0 },
      ]
    )
  })

  it("ignores totals from schools outside the accessible order", () => {
    assert.deepEqual(
      aggregateBranchReportTotals(branches, [
        { branchId: "school-outside", total: 999 },
      ]),
      branches.map((branch) => ({
        branchId: branch.id,
        branchName: branch.name,
        total: 0,
      }))
    )
  })
})

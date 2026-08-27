export type BranchReportTotalItem = {
  branchId: string
  branchName: string
  total: number
}

type BranchIdentity = {
  id: string
  name: string
}

type BranchDatedTotal = {
  branchId: string
  total: number
}

export function aggregateBranchReportTotals(
  branches: BranchIdentity[],
  items: BranchDatedTotal[]
): BranchReportTotalItem[] {
  const totalByBranchId = new Map(branches.map((branch) => [branch.id, 0]))

  for (const item of items) {
    if (!totalByBranchId.has(item.branchId)) {
      continue
    }

    totalByBranchId.set(
      item.branchId,
      (totalByBranchId.get(item.branchId) ?? 0) + item.total
    )
  }

  return branches.map((branch) => ({
    branchId: branch.id,
    branchName: branch.name,
    total:
      Math.round(((totalByBranchId.get(branch.id) ?? 0) + Number.EPSILON) * 100) /
      100,
  }))
}

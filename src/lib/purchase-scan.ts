export function uniquePurchaseBillName(
  requestedName: string,
  existingNames: Iterable<string>
) {
  const baseName = requestedName.trim() || "บิลจากรูป"
  const usedNames = new Set(
    [...existingNames].map((name) => name.trim()).filter(Boolean)
  )

  if (!usedNames.has(baseName)) {
    return baseName
  }

  let suffix = 2

  while (usedNames.has(`${baseName} (${suffix})`)) {
    suffix += 1
  }

  return `${baseName} (${suffix})`
}

export function roundQuantity(value: number) {
  return Math.round(value * 1000) / 1000
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

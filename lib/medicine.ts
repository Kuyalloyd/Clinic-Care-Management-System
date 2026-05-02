export const MEDICINE_UNIT_SUGGESTIONS = [
  'pcs',
  'tablets',
  'capsules',
  'boxes',
  'bottles',
  'packs',
  'strips',
  'vials',
  'tubes',
  'ml',
]

const NUMERIC_ONLY_PATTERN = /^\d+([.,]\d+)?$/

export function isValidMedicineUnit(value?: string | null) {
  const normalized = String(value || '').trim()
  if (!normalized) return true
  return !NUMERIC_ONLY_PATTERN.test(normalized)
}

export function normalizeMedicineUnit(value?: string | null) {
  const normalized = String(value || '').trim()
  if (!normalized || !isValidMedicineUnit(normalized)) {
    return 'pcs'
  }

  return normalized
}

export function formatMedicineAmount(amount: number | string, unit?: string | null) {
  return `${amount} ${normalizeMedicineUnit(unit)}`.trim()
}

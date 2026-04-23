export function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '')
  return /[,"\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function downloadCsv(filename: string, headers: string[], rows: unknown[][], bom = true): void {
  const csv = [headers, ...rows].map(row => row.map(escapeCsvCell).join(',')).join('\n')
  const content = bom ? '﻿' + csv : csv
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const money = (v) => brl.format(Number(v || 0))
export const pct = (v) => `${Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
export const num = (v) => Number(v || 0).toLocaleString('pt-BR')
export const date = (v) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—')
export const dateTime = (v) => (v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—')

// Converte "1.234,56" ou "1234.56" em número
export function parseMoney(v) {
  if (typeof v === 'number') return v
  if (!v) return 0
  let s = String(v).replace(/[^\d,.-]/g, '')
  if (s.includes(',') && s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

export function monthRange(offset = 0) {
  const d = new Date()
  const start = new Date(d.getFullYear(), d.getMonth() + offset, 1)
  const end = new Date(d.getFullYear(), d.getMonth() + offset + 1, 0)
  const iso = (x) => x.toISOString().slice(0, 10)
  return { inicio: iso(start), fim: iso(end) }
}

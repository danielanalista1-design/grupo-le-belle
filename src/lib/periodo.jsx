import { monthRange } from './format'

export function PeriodoPicker({ value, onChange }) {
  const presets = [
    ['Este mês', monthRange(0)],
    ['Mês passado', monthRange(-1)],
    ['Últimos 3 meses', { inicio: monthRange(-2).inicio, fim: monthRange(0).fim }],
    ['Este ano', { inicio: `${new Date().getFullYear()}-01-01`, fim: `${new Date().getFullYear()}-12-31` }],
  ]
  return (
    <div className="flex flex-wrap items-end gap-2">
      {presets.map(([l, r]) => (
        <button key={l} onClick={() => onChange(r)}
          className={`btn ${value.inicio === r.inicio && value.fim === r.fim ? 'bg-ink text-white' : 'btn-ghost'}`}>{l}</button>
      ))}
      <div className="flex items-end gap-2">
        <div><label className="label">De</label><input type="date" className="input" value={value.inicio} onChange={(e) => onChange({ ...value, inicio: e.target.value })} /></div>
        <div><label className="label">Até</label><input type="date" className="input" value={value.fim} onChange={(e) => onChange({ ...value, fim: e.target.value })} /></div>
      </div>
    </div>
  )
}

// fim do dia em São Paulo para filtros de data
export const ate = (fim) => `${fim}T23:59:59-03:00`
export const de = (inicio) => `${inicio}T00:00:00-03:00`

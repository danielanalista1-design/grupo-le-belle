import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Brand } from '../App'

const PAPEL = { socio: 'Sócio', parceiro: 'Parceiro', creator: 'Creator' }

export default function Layout({ member, menu, current, go, children }) {
  const [open, setOpen] = useState(false)
  const papel = member.role === 'parceiro' ? (member.categoria === 'distribuidor' ? 'Distribuidor' : 'Revendedor') : PAPEL[member.role]
  return (
    <div className="min-h-screen md:flex">
      <aside className={`${open ? 'block' : 'hidden'} md:block md:w-64 shrink-0 bg-gradient-to-b from-[#16171B] to-ink text-white md:min-h-screen md:sticky md:top-0 md:h-screen`}>
        <div className="p-6 hidden md:block">
          <p className="font-display text-xl font-semibold tracking-tight"><span className="txt-silver">Grupo</span> <span className="txt-blue">Le Belle</span></p>
          <div className="mt-3 h-px bg-gradient-to-r from-silver/60 via-silver/20 to-transparent" />
        </div>
        <nav className="px-3 pb-4 md:pb-0 space-y-1">
          {menu.map(([k, l]) => (
            <button key={k} onClick={() => { go(k); setOpen(false) }}
              className={`w-full text-left rounded-xl px-4 py-2.5 text-sm font-medium ${current === k ? 'bg-blue text-white shadow-[0_4px_14px_rgba(0,122,255,0.35)]' : 'text-silver-light/75 hover:bg-white/5 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </nav>
        <div className="p-4 md:absolute md:bottom-0 md:w-64 border-t border-white/10">
          <p className="text-sm font-semibold truncate">{member.nome}</p>
          <p className="text-xs text-silver">{papel}</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-3 text-xs text-white/60 hover:text-white">Sair</button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 bg-ink text-white">
          <p className="font-display font-semibold tracking-tight"><span className="txt-silver">Grupo</span> <span className="txt-blue">Le Belle</span></p>
          <button onClick={() => setOpen(!open)} className="rounded-lg border border-white/20 px-3 py-1 text-sm">Menu</button>
        </header>
        <main className="p-4 md:p-8 max-w-7xl">{children}</main>
      </div>
    </div>
  )
}

export function Stat({ label, value, hint, tone }) {
  const tones = { silver: 'from-silver-light to-white border-silver/50', leaf: 'from-blue-light to-white border-blue/20', none: 'from-white to-white' }
  return (
    <div className={`card p-5 bg-gradient-to-b ${tones[tone || 'none']}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-silver-dark">{label}</p>
      <p className="font-display text-[26px] font-bold tracking-tight mt-1">{value}</p>
      {hint && <p className="text-xs text-ink/50 mt-1">{hint}</p>}
    </div>
  )
}

export function Empty({ children }) {
  return <p className="text-sm text-ink/50 py-8 text-center">{children}</p>
}

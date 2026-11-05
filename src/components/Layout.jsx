import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Brand } from '../App'

const PAPEL = { socio: 'Sócio', parceiro: 'Parceiro', creator: 'Creator' }

export default function Layout({ member, menu, current, go, children }) {
  const [open, setOpen] = useState(false)
  const papel = member.role === 'parceiro' ? (member.categoria === 'distribuidor' ? 'Distribuidor' : 'Revendedor') : PAPEL[member.role]
  return (
    <div className="min-h-screen md:flex">
      <aside className={`${open ? 'block' : 'hidden'} md:block md:w-64 shrink-0 bg-ink text-white md:min-h-screen`}>
        <div className="p-6 hidden md:block">
          <p className="font-display text-lg font-extrabold">Grupo <span className="text-gold-light">Le Belle</span></p>
        </div>
        <nav className="px-3 pb-4 md:pb-0 space-y-1">
          {menu.map(([k, l]) => (
            <button key={k} onClick={() => { go(k); setOpen(false) }}
              className={`w-full text-left rounded-xl px-4 py-2.5 text-sm font-medium ${current === k ? 'bg-white/10 text-gold-light' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
              {l}
            </button>
          ))}
        </nav>
        <div className="p-4 md:absolute md:bottom-0 md:w-64 border-t border-white/10">
          <p className="text-sm font-semibold truncate">{member.nome}</p>
          <p className="text-xs text-white/50">{papel}</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-3 text-xs text-white/60 hover:text-white">Sair</button>
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 bg-ink text-white">
          <p className="font-display font-extrabold">Grupo <span className="text-gold-light">Le Belle</span></p>
          <button onClick={() => setOpen(!open)} className="rounded-lg border border-white/20 px-3 py-1 text-sm">Menu</button>
        </header>
        <main className="p-4 md:p-8 max-w-7xl">{children}</main>
      </div>
    </div>
  )
}

export function Stat({ label, value, hint, tone }) {
  const tones = { gold: 'from-gold-light/40 to-white', leaf: 'from-green-100 to-white', none: 'from-white to-white' }
  return (
    <div className={`card p-5 bg-gradient-to-b ${tones[tone || 'none']}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="font-display text-2xl font-extrabold mt-1">{value}</p>
      {hint && <p className="text-xs text-ink/50 mt-1">{hint}</p>}
    </div>
  )
}

export function Empty({ children }) {
  return <p className="text-sm text-ink/50 py-8 text-center">{children}</p>
}

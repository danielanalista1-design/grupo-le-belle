import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { date, pct } from '../../lib/format'
import { Empty } from '../../components/Layout'
import { Modal } from './Vendas'

const PAPEL = { socio: 'Sócio', parceiro: 'Parceiro', creator: 'Creator' }
const ST = { pendente: 'bg-amber-100 text-amber-800', aprovado: 'bg-green-100 text-green-800', bloqueado: 'bg-red-100 text-red-700' }

export default function Parceiros() {
  const [membros, setMembros] = useState([])
  const [convites, setConvites] = useState([])
  const [filtro, setFiltro] = useState('pendente')
  const [edit, setEdit] = useState(null)
  const [novoConvite, setNovoConvite] = useState(false)

  async function load() {
    const [{ data: m }, { data: c }] = await Promise.all([
      supabase.from('glb_members').select('*').order('created_at', { ascending: false }),
      supabase.from('glb_invites').select('*').order('created_at', { ascending: false }),
    ])
    setMembros(m || []); setConvites(c || [])
  }
  useEffect(() => { load() }, [])

  const lista = membros.filter((m) => filtro === 'todos' || m.status === filtro || (filtro === 'parceiros' && m.role === 'parceiro'))
  const pend = membros.filter((m) => m.status === 'pendente').length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="h1">Parceiros e acessos</h1><p className="text-ink/60 text-sm">Aprove cadastros, defina a categoria e convide pessoas.</p></div>
        <button className="btn-gold" onClick={() => setNovoConvite(true)}>Convidar por e-mail</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[['pendente', `Aguardando (${pend})`], ['aprovado', 'Aprovados'], ['bloqueado', 'Bloqueados'], ['todos', 'Todos']].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`btn ${filtro === k ? 'bg-ink text-white' : 'btn-ghost'}`}>{l}</button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        {lista.length === 0 ? <Empty>Ninguém nesta lista.</Empty> : (
          <table className="table">
            <thead><tr><th>Nome</th><th>Contato</th><th>Local</th><th>Papel</th><th>Status</th><th>Desde</th><th></th></tr></thead>
            <tbody>{lista.map((m) => (
              <tr key={m.user_id}>
                <td className="font-medium">{m.nome}<div className="text-xs text-ink/50">{m.documento}</div></td>
                <td className="text-xs">{m.email}<br />{m.telefone}</td>
                <td className="text-xs">{[m.cidade, m.uf].filter(Boolean).join(' / ') || '—'}</td>
                <td>{m.role === 'parceiro' ? (m.categoria === 'distribuidor' ? 'Distribuidor' : 'Revendedor') : PAPEL[m.role]}{m.role === 'socio' && <div className="text-xs text-ink/50">{pct(m.participacao_pct)}</div>}</td>
                <td><span className={`pill ${ST[m.status]}`}>{m.status}</span></td>
                <td className="text-xs">{date(m.created_at)}</td>
                <td><button className="text-xs font-semibold text-gold-dark hover:underline" onClick={() => setEdit(m)}>{m.status === 'pendente' ? 'Analisar' : 'Editar'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {convites.length > 0 && (
        <div className="card p-5">
          <h2 className="h2 mb-2">Convites ainda não usados</h2>
          <table className="table"><thead><tr><th>E-mail</th><th>Nome</th><th>Papel</th><th></th></tr></thead>
            <tbody>{convites.map((c) => (
              <tr key={c.email}><td>{c.email}</td><td>{c.nome}</td><td>{c.role === 'parceiro' ? (c.categoria === 'distribuidor' ? 'Distribuidor' : 'Revendedor') : PAPEL[c.role]}</td>
                <td><button className="text-xs text-red-700 hover:underline" onClick={async () => { await supabase.from('glb_invites').delete().eq('email', c.email); load() }}>Cancelar</button></td></tr>
            ))}</tbody></table>
          <p className="text-xs text-ink/50 mt-2">A pessoa cria a conta com o e-mail convidado em "Criar conta" e o acesso é liberado sozinho.</p>
        </div>
      )}

      {edit && <MembroForm m={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
      {novoConvite && <ConviteForm onClose={() => setNovoConvite(false)} onSaved={() => { setNovoConvite(false); load() }} />}
    </div>
  )
}

function MembroForm({ m, onClose, onSaved }) {
  const [v, setV] = useState({ nome: m.nome, telefone: m.telefone || '', documento: m.documento || '', cidade: m.cidade || '', uf: m.uf || '', categoria: m.categoria || 'revendedor', status: m.status, participacao_pct: m.participacao_pct ?? '' })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })
  async function salvar(status) {
    setErr('')
    const dados = { ...v, status: status || v.status }
    if (m.role !== 'parceiro') delete dados.categoria
    if (m.role !== 'socio') delete dados.participacao_pct; else dados.participacao_pct = Number(v.participacao_pct)
    const { error } = await supabase.from('glb_members').update(dados).eq('user_id', m.user_id)
    if (error) setErr(error.message); else onSaved()
  }
  return (
    <Modal titulo={m.nome} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="label">Nome</label><input className="input" value={v.nome} onChange={set('nome')} /></div>
        <div><label className="label">WhatsApp</label><input className="input" value={v.telefone} onChange={set('telefone')} /></div>
        <div><label className="label">CPF / CNPJ</label><input className="input" value={v.documento} onChange={set('documento')} /></div>
        <div><label className="label">Cidade</label><input className="input" value={v.cidade} onChange={set('cidade')} /></div>
        <div><label className="label">UF</label><input className="input" value={v.uf} maxLength={2} onChange={set('uf')} /></div>
        {m.role === 'parceiro' && (
          <div className="col-span-2"><label className="label">Categoria comercial</label>
            <select className="input" value={v.categoria} onChange={set('categoria')}>
              <option value="revendedor">Revendedor · preços CAT. MICRO-DISTRIBUIDOR</option>
              <option value="distribuidor">Distribuidor · preços CAT. DISTRIBUIDOR</option>
            </select></div>
        )}
        {m.role === 'socio' && <div className="col-span-2"><label className="label">Participação (%)</label><input type="number" className="input" value={v.participacao_pct} onChange={set('participacao_pct')} /></div>}
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {m.status !== 'bloqueado' && m.role !== 'socio' && <button className="btn-danger" onClick={() => salvar('bloqueado')}>Bloquear</button>}
        <button className="btn-ghost" onClick={() => salvar()}>Salvar</button>
        {m.status !== 'aprovado' && <button className="btn-gold" onClick={() => salvar('aprovado')}>Aprovar acesso</button>}
      </div>
    </Modal>
  )
}

function ConviteForm({ onClose, onSaved }) {
  const [v, setV] = useState({ email: '', nome: '', role: 'parceiro', categoria: 'revendedor' })
  const [err, setErr] = useState('')
  async function salvar(e) {
    e.preventDefault(); setErr('')
    const dados = { email: v.email.trim().toLowerCase(), nome: v.nome, role: v.role, categoria: v.role === 'parceiro' ? v.categoria : null }
    const { error } = await supabase.from('glb_invites').upsert(dados, { onConflict: 'email' })
    if (error) setErr(error.message); else onSaved()
  }
  return (
    <Modal titulo="Convidar por e-mail" onClose={onClose}>
      <form onSubmit={salvar} className="space-y-3">
        <div><label className="label">E-mail</label><input type="email" className="input" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
        <div><label className="label">Nome</label><input className="input" required value={v.nome} onChange={(e) => setV({ ...v, nome: e.target.value })} /></div>
        <div><label className="label">Categoria</label>
          <select className="input" value={v.categoria} onChange={(e) => setV({ ...v, categoria: e.target.value })}>
            <option value="revendedor">Revendedor</option><option value="distribuidor">Distribuidor</option>
          </select></div>
        <p className="text-xs text-ink/50">Para convidar creators, use a tela Creators (o convite fica ligado ao cupom).</p>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-gold">Enviar convite</button></div>
      </form>
    </Modal>
  )
}

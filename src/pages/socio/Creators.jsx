import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { money, pct, monthRange, date } from '../../lib/format'
import { de, ate } from '../../lib/periodo'
import { Empty } from '../../components/Layout'
import { Modal } from './Vendas'

export default function Creators() {
  const [mes, setMes] = useState(monthRange(0).inicio.slice(0, 7))
  const [creators, setCreators] = useState([])
  const [resumo, setResumo] = useState({})
  const [pagos, setPagos] = useState({})
  const [convites, setConvites] = useState({})
  const [edit, setEdit] = useState(null)

  async function load() {
    const [y, m] = mes.split('-').map(Number)
    const inicio = `${mes}-01`
    const fim = new Date(y, m, 0).toISOString().slice(0, 10)
    const [{ data: c }, { data: v }, { data: p }, { data: inv }] = await Promise.all([
      supabase.from('glb_creators').select('*').order('nome'),
      supabase.from('glb_v_sales').select('creator_id, status, valor_produtos, comissao_creator').not('creator_id', 'is', null).gte('data_venda', de(inicio)).lte('data_venda', ate(fim)),
      supabase.from('glb_creator_payouts').select('*').eq('mes', inicio),
      supabase.from('glb_invites').select('email, creator_id').eq('role', 'creator'),
    ])
    setCreators(c || [])
    const r = {}
    ;(v || []).filter((x) => x.status === 'pago').forEach((x) => {
      r[x.creator_id] = r[x.creator_id] || { qtd: 0, valor: 0, comissao: 0 }
      r[x.creator_id].qtd++; r[x.creator_id].valor += Number(x.valor_produtos); r[x.creator_id].comissao += Number(x.comissao_creator)
    })
    setResumo(r)
    setPagos(Object.fromEntries((p || []).map((x) => [x.creator_id, x])))
    setConvites(Object.fromEntries((inv || []).map((x) => [x.creator_id, x.email])))
  }
  useEffect(() => { load() }, [mes])

  async function marcarPago(c) {
    const valor = resumo[c.id]?.comissao || 0
    const atual = pagos[c.id]
    if (atual?.pago_em) {
      if (!confirm('Desmarcar o pagamento deste mês?')) return
      await supabase.from('glb_creator_payouts').update({ pago_em: null }).eq('id', atual.id)
    } else {
      await supabase.from('glb_creator_payouts').upsert({ creator_id: c.id, mes: `${mes}-01`, valor, pago_em: new Date().toISOString() }, { onConflict: 'creator_id,mes' })
    }
    load()
  }

  const total = Object.values(resumo).reduce((a, r) => ({ valor: a.valor + r.valor, comissao: a.comissao + r.comissao }), { valor: 0, comissao: 0 })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="h1">Creators</h1><p className="text-ink/60 text-sm">Cadastro, cupons e fechamento mensal das comissões.</p></div>
        <div className="flex items-end gap-2">
          <div><label className="label">Mês</label><input type="month" className="input" value={mes} onChange={(e) => setMes(e.target.value)} /></div>
          <button className="btn-primary" onClick={() => setEdit({})}>Novo creator</button>
        </div>
      </div>
      <div className="flex gap-6 text-sm"><span>Vendido com cupons: <b>{money(total.valor)}</b></span><span>Comissões do mês: <b>{money(total.comissao)}</b></span></div>
      <div className="card overflow-x-auto">
        {creators.length === 0 ? <Empty>Nenhum creator cadastrado.</Empty> : (
          <table className="table">
            <thead><tr><th>Creator</th><th>Cupom</th><th>Comissão</th><th>Acesso</th><th className="text-right">Vendas</th><th className="text-right">Vendido</th><th className="text-right">A pagar</th><th>Pagamento</th><th></th></tr></thead>
            <tbody>{creators.map((c) => {
              const r = resumo[c.id] || { qtd: 0, valor: 0, comissao: 0 }
              const p = pagos[c.id]
              return (
                <tr key={c.id} className={c.ativo ? '' : 'opacity-50'}>
                  <td className="font-medium">{c.nome}<div className="text-xs text-ink/50">{c.handle}{c.pix ? ` · Pix: ${c.pix}` : ''}</div></td>
                  <td><span className="pill bg-sand font-mono">{c.cupom}</span></td>
                  <td>{pct(c.comissao_pct)}</td>
                  <td className="text-xs">{c.user_id ? <span className="text-leaf font-semibold">Ativo</span> : convites[c.id] ? <span className="text-ink/60">Convite: {convites[c.id]}</span> : <span className="text-ink/40">Sem login</span>}</td>
                  <td className="text-right">{r.qtd}</td>
                  <td className="text-right">{money(r.valor)}</td>
                  <td className="text-right font-semibold">{money(r.comissao)}</td>
                  <td>
                    <button onClick={() => marcarPago(c)} disabled={!r.comissao && !p?.pago_em}
                      className={`pill ${p?.pago_em ? 'bg-green-100 text-green-800' : 'bg-sand text-ink/70'} disabled:opacity-40`}>
                      {p?.pago_em ? `Pago em ${date(p.pago_em)}` : 'Marcar pago'}
                    </button>
                  </td>
                  <td><button className="text-xs font-semibold text-blue hover:underline" onClick={() => setEdit({ ...c, email: convites[c.id] || '' })}>Editar</button></td>
                </tr>
              )
            })}</tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-ink/50">O cupom precisa existir também na Yampi, com o mesmo código. Cada creator vê só as próprias vendas e comissões no login dele.</p>
      {edit && <CreatorForm c={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
    </div>
  )
}

function CreatorForm({ c, onClose, onSaved }) {
  const novo = !c.id
  const [v, setV] = useState({ nome: c.nome || '', handle: c.handle || '', pix: c.pix || '', cupom: c.cupom || '', comissao_pct: c.comissao_pct ?? 15, ativo: c.ativo ?? true, email: c.email || '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function salvar(e) {
    e.preventDefault(); setBusy(true); setErr('')
    const dados = { nome: v.nome, handle: v.handle || null, pix: v.pix || null, cupom: v.cupom.trim().toUpperCase(), comissao_pct: Number(v.comissao_pct), ativo: v.ativo }
    const res = novo ? await supabase.from('glb_creators').insert(dados).select('id').single() : await supabase.from('glb_creators').update(dados).eq('id', c.id).select('id').single()
    if (res.error) { setErr(res.error.message.includes('duplicate') ? 'Esse cupom já está em uso.' : res.error.message); setBusy(false); return }
    if (v.email && !c.user_id) {
      const { error } = await supabase.from('glb_invites').upsert({ email: v.email.trim().toLowerCase(), role: 'creator', nome: v.nome, creator_id: res.data.id }, { onConflict: 'email' })
      if (error) { setErr('Creator salvo, mas o convite falhou: ' + error.message); setBusy(false); return }
    }
    setBusy(false); onSaved()
  }

  return (
    <Modal titulo={novo ? 'Novo creator' : `Editar ${c.nome}`} onClose={onClose}>
      <form onSubmit={salvar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Nome</label><input className="input" required value={v.nome} onChange={set('nome')} /></div>
          <div><label className="label">@ Instagram / TikTok</label><input className="input" value={v.handle} onChange={set('handle')} /></div>
          <div><label className="label">Chave Pix</label><input className="input" value={v.pix} onChange={set('pix')} /></div>
          <div><label className="label">Cupom</label><input className="input uppercase font-mono" required value={v.cupom} onChange={set('cupom')} placeholder="ANA15" /></div>
          <div><label className="label">Comissão (%)</label><input type="number" step="0.01" min="0" max="100" className="input" value={v.comissao_pct} onChange={set('comissao_pct')} /></div>
        </div>
        {!c.user_id && (
          <div><label className="label">E-mail para login do creator</label><input type="email" className="input" value={v.email} onChange={set('email')} placeholder="opcional" />
            <p className="text-xs text-ink/50 mt-1">O creator cria a conta com este e-mail e o acesso é liberado sozinho.</p></div>
        )}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.ativo} onChange={set('ativo')} /> Ativo</label>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button></div>
      </form>
    </Modal>
  )
}

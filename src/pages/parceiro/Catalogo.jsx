import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { money, num } from '../../lib/format'
import { LOJAS } from '../../lib/labels'
import { Empty } from '../../components/Layout'
import { FORMA } from '../socio/Pedidos'

export default function Catalogo({ member, onDone }) {
  const [itens, setItens] = useState([])
  const [cfg, setCfg] = useState({ minimo_revendedor: 10, minimo_distribuidor: 100, upgrade_automatico: true })
  const [qtd, setQtd] = useState({})
  const [forma, setForma] = useState('aprovacao')
  const [obs, setObs] = useState('')
  const [busca, setBusca] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.rpc('glb_catalogo').then(({ data }) => setItens(data || []))
    supabase.from('glb_settings').select('minimo_revendedor, minimo_distribuidor, upgrade_automatico').eq('id', 1).single().then(({ data }) => data && setCfg(data))
  }, [])

  const unidades = Object.values(qtd).reduce((a, b) => a + (Number(b) || 0), 0)
  const subtotal = itens.reduce((a, p) => a + (Number(qtd[p.id]) || 0) * Number(p.preco), 0)
  const vaiSubir = member.categoria === 'revendedor' && cfg.upgrade_automatico && unidades >= cfg.minimo_distribuidor
  const faltam = cfg.minimo_distribuidor - unidades

  const grupos = useMemo(() => {
    const b = busca.toLowerCase()
    const g = {}
    itens.filter((p) => !b || p.nome.toLowerCase().includes(b)).forEach((p) => { const k = `${LOJAS[p.loja]} · ${p.linha || ''}`; (g[k] = g[k] || []).push(p) })
    return Object.entries(g)
  }, [itens, busca])

  const setQ = (id, v) => setQtd({ ...qtd, [id]: Math.max(0, parseInt(v || 0, 10) || 0) })

  async function enviar() {
    setBusy(true); setErr('')
    const p_items = Object.entries(qtd).filter(([, q]) => q > 0).map(([product_id, quantidade]) => ({ product_id, quantidade }))
    const { error } = await supabase.rpc('glb_create_partner_order', { p_items, p_forma: forma, p_obs: obs || null })
    setBusy(false)
    if (error) setErr(error.message); else { setQtd({}); onDone() }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h1 className="h1">Fazer pedido</h1>
            <p className="text-ink/60 text-sm">Preços de {member.categoria === 'distribuidor' ? 'distribuidor' : 'revendedor'} · pedido mínimo de {cfg.minimo_revendedor} unidades.</p></div>
          <input className="input sm:w-64" placeholder="Buscar produto" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        {itens.length === 0 ? <Empty>Carregando catálogo…</Empty> : grupos.map(([titulo, ps]) => (
          <div key={titulo} className="card">
            <h2 className="h2 px-4 pt-4">{titulo}</h2>
            <div className="divide-y divide-line">
              {ps.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  {p.imagem_url ? <img src={p.imagem_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-sand" /> : <div className="w-12 h-12 rounded-lg bg-sand" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{p.nome} {p.tipo === 'kit' && <span className="pill bg-blue-light text-blue-dark ml-1">Kit</span>}</p>
                    <p className="text-sm"><b>{money(p.preco)}</b>{p.preco_varejo && <span className="text-xs text-ink/50"> · varejo sugerido {money(p.preco_varejo)}</span>}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="btn-ghost px-3 py-1.5" onClick={() => setQ(p.id, (qtd[p.id] || 0) - 1)}>−</button>
                    <input className="input w-16 text-center py-1.5" inputMode="numeric" value={qtd[p.id] || ''} placeholder="0" onChange={(e) => setQ(p.id, e.target.value)} />
                    <button className="btn-ghost px-3 py-1.5" onClick={() => setQ(p.id, (qtd[p.id] || 0) + 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <aside className="card p-5 space-y-4 lg:sticky lg:top-6">
        <h2 className="h2">Resumo do pedido</h2>
        <div className="flex justify-between text-sm"><span>Unidades</span><b>{num(unidades)}</b></div>
        <div className="flex justify-between text-sm"><span>Subtotal na sua tabela</span><b>{money(subtotal)}</b></div>
        {member.categoria === 'revendedor' && cfg.upgrade_automatico && (
          vaiSubir
            ? <p className="rounded-xl bg-green-50 text-green-800 text-sm p-3">Seu pedido passou de {cfg.minimo_distribuidor} unidades e terá <b>condição especial de distribuidor</b>. O valor final aparece em Meus pedidos.</p>
            : unidades > 0 && <p className="rounded-xl bg-sand text-sm p-3">Faltam {num(faltam)} unidades para a condição especial de distribuidor.</p>
        )}
        {unidades > 0 && unidades < cfg.minimo_revendedor && <p className="text-sm text-amber-700">Pedido mínimo: {cfg.minimo_revendedor} unidades.</p>}
        <div>
          <label className="label">Como prefere pagar</label>
          {Object.entries(FORMA).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm py-1"><input type="radio" name="forma" checked={forma === k} onChange={() => setForma(k)} /> {l}</label>
          ))}
          <p className="text-xs text-ink/50 mt-1">A equipe confere o pedido e envia o pagamento e o frete pelo WhatsApp.</p>
        </div>
        <div><label className="label">Observação</label><textarea className="input" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Endereço de entrega, prazo, etc." /></div>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full" disabled={busy || unidades < cfg.minimo_revendedor} onClick={enviar}>{busy ? 'Enviando…' : 'Enviar pedido'}</button>
      </aside>
    </div>
  )
}

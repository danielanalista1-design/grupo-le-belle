import { useEffect, useMemo, useState } from 'react'
import Papa from 'papaparse'
import { supabase } from '../../lib/supabase'
import { money, dateTime, monthRange, parseMoney } from '../../lib/format'
import { CANAIS, ORIGENS, STATUS_VENDA, origemFromUtm } from '../../lib/labels'
import { PeriodoPicker, de, ate } from '../../lib/periodo'
import { Empty } from '../../components/Layout'

export default function Vendas() {
  const [periodo, setPeriodo] = useState(monthRange(0))
  const [f, setF] = useState({ canal: '', origem: '', status: '', busca: '' })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'nova' | 'importar' | venda

  async function load() {
    setLoading(true)
    let q = supabase.from('glb_v_sales').select('*').gte('data_venda', de(periodo.inicio)).lte('data_venda', ate(periodo.fim)).order('data_venda', { ascending: false }).limit(5000)
    if (f.canal) q = q.eq('canal', f.canal)
    if (f.origem) q = q.eq('origem', f.origem)
    if (f.status) q = q.eq('status', f.status)
    const { data } = await q
    setRows(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [periodo.inicio, periodo.fim, f.canal, f.origem, f.status])

  const vis = useMemo(() => {
    const b = f.busca.trim().toLowerCase()
    if (!b) return rows
    return rows.filter((r) => [r.numero, r.cliente_nome, r.cupom, r.creator_nome].some((x) => (x || '').toLowerCase().includes(b)))
  }, [rows, f.busca])

  const tot = vis.filter((r) => r.status === 'pago').reduce((a, r) => ({
    produtos: a.produtos + Number(r.valor_produtos), comissao: a.comissao + Number(r.comissao_creator), base: a.base + Number(r.base_divisao),
  }), { produtos: 0, comissao: 0, base: 0 })

  function exportar() {
    const csv = Papa.unparse(vis.map((r) => ({
      data: dateTime(r.data_venda), numero: r.numero, canal: CANAIS[r.canal], origem: ORIGENS[r.origem], status: STATUS_VENDA[r.status],
      cliente: r.cliente_nome, cupom: r.cupom, creator: r.creator_nome, valor_produtos: r.valor_produtos, frete: r.frete, total: r.total,
      comissao_creator: r.comissao_creator, base_divisao: r.base_divisao, utm_source: r.utm_source, utm_medium: r.utm_medium, utm_campaign: r.utm_campaign,
    })), { delimiter: ';' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `vendas_${periodo.inicio}_${periodo.fim}.csv`; a.click()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="h1">Vendas</h1><p className="text-ink/60 text-sm">Todas as vendas, com canal, origem e comissões.</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => setModal('importar')}>Importar planilha</button>
          <button className="btn-ghost" onClick={exportar}>Exportar CSV</button>
          <button className="btn-gold" onClick={() => setModal('nova')}>Lançar venda</button>
        </div>
      </div>

      <PeriodoPicker value={periodo} onChange={setPeriodo} />

      <div className="grid sm:grid-cols-4 gap-3">
        <Sel label="Canal" value={f.canal} onChange={(v) => setF({ ...f, canal: v })} opts={CANAIS} />
        <Sel label="Origem" value={f.origem} onChange={(v) => setF({ ...f, origem: v })} opts={ORIGENS} />
        <Sel label="Status" value={f.status} onChange={(v) => setF({ ...f, status: v })} opts={STATUS_VENDA} />
        <div><label className="label">Buscar</label><input className="input" placeholder="Nº, cliente, cupom…" value={f.busca} onChange={(e) => setF({ ...f, busca: e.target.value })} /></div>
      </div>

      <div className="flex flex-wrap gap-6 text-sm">
        <span>Produtos (pagas): <b>{money(tot.produtos)}</b></span>
        <span>Comissões de creators: <b>{money(tot.comissao)}</b></span>
        <span>Base para divisão: <b>{money(tot.base)}</b></span>
      </div>

      <div className="card overflow-x-auto">
        {loading ? <Empty>Carregando…</Empty> : vis.length === 0 ? <Empty>Nenhuma venda no período com esses filtros.</Empty> : (
          <table className="table">
            <thead><tr><th>Data</th><th>Nº</th><th>Canal</th><th>Origem</th><th>Cupom / creator</th><th>Status</th><th className="text-right">Produtos</th><th className="text-right">Comissão</th><th></th></tr></thead>
            <tbody>
              {vis.map((r) => (
                <tr key={r.id} className={['cancelado', 'devolvido'].includes(r.status) ? 'opacity-50' : ''}>
                  <td className="whitespace-nowrap">{dateTime(r.data_venda)}</td>
                  <td>{r.numero || '—'}<div className="text-xs text-ink/50">{r.cliente_nome}</div></td>
                  <td>{CANAIS[r.canal]}</td>
                  <td>{ORIGENS[r.origem]}{r.utm_source && <div className="text-xs text-ink/50">{r.utm_source}{r.utm_campaign ? ` · ${r.utm_campaign}` : ''}</div>}</td>
                  <td>{r.cupom || '—'}{r.creator_nome && <div className="text-xs text-ink/50">{r.creator_nome}</div>}</td>
                  <td><StatusPill s={r.status} /></td>
                  <td className="text-right whitespace-nowrap">{money(r.valor_produtos)}</td>
                  <td className="text-right whitespace-nowrap">{Number(r.comissao_creator) ? money(r.comissao_creator) : '—'}</td>
                  <td><button className="text-xs font-semibold text-gold-dark hover:underline" onClick={() => setModal(r)}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal === 'nova' && <VendaForm onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}
      {modal && typeof modal === 'object' && <VendaForm venda={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}
      {modal === 'importar' && <Importar onClose={() => setModal(null)} onDone={() => { setModal(null); load() }} />}
    </div>
  )
}

export function StatusPill({ s }) {
  const c = { pago: 'bg-green-100 text-green-800', pendente: 'bg-amber-100 text-amber-800', cancelado: 'bg-red-100 text-red-700', devolvido: 'bg-red-100 text-red-700' }
  return <span className={`pill ${c[s] || 'bg-sand'}`}>{STATUS_VENDA[s] || s}</span>
}

function Sel({ label, value, onChange, opts }) {
  return (
    <div><label className="label">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Todos</option>
        {Object.entries(opts).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </div>
  )
}

export function Modal({ titulo, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`card w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} p-6 space-y-4 my-8`}>
        <div className="flex justify-between items-center"><h2 className="h2">{titulo}</h2><button onClick={onClose} className="text-ink/50 hover:text-ink text-xl leading-none">×</button></div>
        {children}
      </div>
    </div>
  )
}

function VendaForm({ venda, onClose, onSaved }) {
  const novo = !venda
  const [v, setV] = useState(() => venda ? {
    canal: venda.canal, origem: venda.origem, status: venda.status, numero: venda.numero || '', cliente_nome: venda.cliente_nome || '',
    data_venda: venda.data_venda?.slice(0, 16), valor_produtos: venda.valor_produtos, frete: venda.frete, cupom: venda.cupom || '', observacao: venda.observacao || '',
  } : { canal: 'venda_direta', origem: 'direto', status: 'pago', numero: '', cliente_nome: '', data_venda: new Date().toISOString().slice(0, 16), valor_produtos: '', frete: 0, cupom: '', observacao: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })

  async function salvar(e) {
    e.preventDefault(); setBusy(true); setErr('')
    const payload = {
      ...v, valor_produtos: parseMoney(v.valor_produtos), frete: parseMoney(v.frete),
      total: parseMoney(v.valor_produtos) + parseMoney(v.frete), data_venda: new Date(v.data_venda).toISOString(), cupom: v.cupom || null,
    }
    const { error } = novo ? await supabase.from('glb_sales').insert(payload) : await supabase.from('glb_sales').update(payload).eq('id', venda.id)
    setBusy(false)
    if (error) setErr(error.message); else onSaved()
  }
  async function excluir() {
    if (!confirm('Excluir esta venda? Isso não pode ser desfeito.')) return
    await supabase.from('glb_sales').delete().eq('id', venda.id); onSaved()
  }

  return (
    <Modal titulo={novo ? 'Lançar venda' : `Venda ${venda.numero || ''}`} onClose={onClose}>
      <form onSubmit={salvar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Canal</label><select className="input" value={v.canal} onChange={set('canal')}>{Object.entries(CANAIS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><label className="label">Origem</label><select className="input" value={v.origem} onChange={set('origem')}>{Object.entries(ORIGENS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><label className="label">Status</label><select className="input" value={v.status} onChange={set('status')}>{Object.entries(STATUS_VENDA).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><label className="label">Data</label><input type="datetime-local" className="input" value={v.data_venda} onChange={set('data_venda')} /></div>
          <div><label className="label">Nº do pedido</label><input className="input" value={v.numero} onChange={set('numero')} /></div>
          <div><label className="label">Cliente</label><input className="input" value={v.cliente_nome} onChange={set('cliente_nome')} /></div>
          <div><label className="label">Valor dos produtos (R$)</label><input className="input" required value={v.valor_produtos} onChange={set('valor_produtos')} placeholder="0,00" /></div>
          <div><label className="label">Frete (R$)</label><input className="input" value={v.frete} onChange={set('frete')} /></div>
        </div>
        <div><label className="label">Cupom (de creator, se houver)</label><input className="input uppercase" value={v.cupom} onChange={set('cupom')} /></div>
        <div><label className="label">Observação</label><input className="input" value={v.observacao} onChange={set('observacao')} /></div>
        <p className="text-xs text-ink/50">Se o cupom for de um creator, a venda é ligada a ele e a origem vira "Creator" automaticamente.</p>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <div className="flex justify-between gap-2">
          {!novo ? <button type="button" className="btn-danger" onClick={excluir}>Excluir</button> : <span />}
          <div className="flex gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-gold" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button></div>
        </div>
      </form>
    </Modal>
  )
}

// Importação de planilhas (TikTok Shop, Mercado Livre, outros) com mapeamento de colunas
const CAMPOS = [
  ['numero', 'Nº do pedido', true],
  ['data_venda', 'Data', true],
  ['valor_produtos', 'Valor dos produtos', true],
  ['frete', 'Frete', false],
  ['status', 'Status', false],
  ['cliente_nome', 'Cliente', false],
  ['cupom', 'Cupom', false],
  ['utm_source', 'Origem / UTM source', false],
]
const PALPITES = {
  numero: /(order id|pedido|n[ºo°]? ?(do )?pedido|order number|n\.º de venda|venda)/i,
  data_venda: /(data|date|created|criado)/i,
  valor_produtos: /(subtotal|valor (dos )?produtos|product (sub)?total|receita por produtos|total do produto|price)/i,
  frete: /(frete|shipping)/i,
  status: /(status|estado)/i,
  cliente_nome: /(comprador|cliente|buyer|recipient|nome)/i,
  cupom: /(cupom|coupon|voucher)/i,
  utm_source: /(utm|origem|source)/i,
}

function parseData(s) {
  if (!s) return null
  const m = String(s).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T](\d{1,2}):(\d{2}))?/)
  if (m) {
    const y = m[3].length === 2 ? '20' + m[3] : m[3]
    return new Date(`${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T${(m[4] || '12').padStart(2, '0')}:${m[5] || '00'}:00-03:00`).toISOString()
  }
  const d = new Date(s)
  return isNaN(d) ? null : d.toISOString()
}
function parseStatus(s) {
  const t = (s || '').toLowerCase()
  if (/(cancel|anulad)/.test(t)) return 'cancelado'
  if (/(devol|reembols|refund|return)/.test(t)) return 'devolvido'
  if (/(pend|aguard|unpaid|awaiting)/.test(t)) return 'pendente'
  return 'pago'
}

function Importar({ onClose, onDone }) {
  const [canal, setCanal] = useState('tiktok_shop')
  const [linhas, setLinhas] = useState([])
  const [cols, setCols] = useState([])
  const [map, setMap] = useState({})
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  function ler(file) {
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const c = res.meta.fields || []
        setCols(c); setLinhas(res.data)
        const m = {}
        CAMPOS.forEach(([k]) => { const hit = c.find((x) => PALPITES[k].test(x)); if (hit) m[k] = hit })
        setMap(m)
      },
    })
  }

  const preview = linhas.slice(0, 5).map((l) => linhaParaVenda(l))
  function linhaParaVenda(l) {
    const get = (k) => (map[k] ? l[map[k]] : '')
    const vp = parseMoney(get('valor_produtos')); const fr = parseMoney(get('frete'))
    const src = get('utm_source')
    return {
      canal, external_id: String(get('numero') || '').trim() || null, numero: String(get('numero') || '').trim(),
      data_venda: parseData(get('data_venda')), valor_produtos: vp, frete: fr, total: vp + fr,
      status: map.status ? parseStatus(get('status')) : 'pago', cliente_nome: get('cliente_nome') || null,
      cupom: get('cupom') || null, utm_source: src || null,
      origem: src ? origemFromUtm(src, '') : (canal === 'tiktok_shop' ? 'organico' : 'direto'),
    }
  }

  async function importar() {
    setBusy(true); setMsg('')
    const vendas = linhas.map(linhaParaVenda).filter((v) => v.external_id && v.data_venda)
    // agrupa linhas do mesmo pedido (planilhas que trazem um item por linha)
    const porPedido = {}
    vendas.forEach((v) => {
      if (!porPedido[v.external_id]) porPedido[v.external_id] = { ...v }
      else { porPedido[v.external_id].valor_produtos += v.valor_produtos; porPedido[v.external_id].total += v.valor_produtos }
    })
    const lote = Object.values(porPedido)
    let ok = 0, erro = ''
    for (let i = 0; i < lote.length; i += 200) {
      const { error, count } = await supabase.from('glb_sales').upsert(lote.slice(i, i + 200), { onConflict: 'canal,external_id', count: 'exact' })
      if (error) { erro = error.message; break }
      ok += count ?? lote.slice(i, i + 200).length
    }
    setBusy(false)
    if (erro) setMsg('Erro: ' + erro)
    else { alert(`${ok} pedidos importados ou atualizados. Linhas sem número ou data foram ignoradas.`); onDone() }
  }

  return (
    <Modal titulo="Importar planilha de vendas" onClose={onClose} wide>
      <p className="text-sm text-ink/60">Exporte o relatório de pedidos do TikTok Shop, do Mercado Livre ou de outro marketplace em CSV e envie aqui. Pedidos já importados são atualizados, sem duplicar.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">Canal</label><select className="input" value={canal} onChange={(e) => setCanal(e.target.value)}>
          {['tiktok_shop', 'mercado_livre', 'marketplace_outro', 'venda_direta'].map((k) => <option key={k} value={k}>{CANAIS[k]}</option>)}</select></div>
        <div><label className="label">Arquivo CSV</label><input type="file" accept=".csv,text/csv" className="input" onChange={(e) => e.target.files[0] && ler(e.target.files[0])} /></div>
      </div>
      {cols.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 gap-3">
            {CAMPOS.map(([k, l, req]) => (
              <div key={k}><label className="label">{l}{req ? ' *' : ''}</label>
                <select className="input" value={map[k] || ''} onChange={(e) => setMap({ ...map, [k]: e.target.value })}>
                  <option value="">— não usar —</option>{cols.map((c) => <option key={c} value={c}>{c}</option>)}
                </select></div>
            ))}
          </div>
          <div className="overflow-x-auto"><table className="table"><thead><tr><th>Nº</th><th>Data</th><th>Status</th><th className="text-right">Produtos</th><th>Cupom</th></tr></thead>
            <tbody>{preview.map((p, i) => <tr key={i}><td>{p.numero}</td><td>{p.data_venda ? dateTime(p.data_venda) : <span className="text-red-700">inválida</span>}</td><td>{STATUS_VENDA[p.status]}</td><td className="text-right">{money(p.valor_produtos)}</td><td>{p.cupom || '—'}</td></tr>)}</tbody></table></div>
          <p className="text-xs text-ink/50">{linhas.length} linhas no arquivo. Prévia das 5 primeiras.</p>
        </>
      )}
      {msg && <p className="text-sm text-red-700">{msg}</p>}
      <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn-gold" disabled={busy || !map.numero || !map.data_venda || !map.valor_produtos} onClick={importar}>{busy ? 'Importando…' : 'Importar'}</button></div>
    </Modal>
  )
}

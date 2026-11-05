import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { money, dateTime, num } from '../../lib/format'
import { STATUS_PEDIDO } from '../../lib/labels'
import { Empty } from '../../components/Layout'
import { Modal } from './Vendas'

export const STATUS_COR = { aguardando: 'bg-amber-100 text-amber-800', aprovado: 'bg-blue-100 text-blue-800', pago: 'bg-green-100 text-green-800', enviado: 'bg-green-100 text-green-800', cancelado: 'bg-red-100 text-red-700' }
export const FORMA = { yampi: 'Link de pagamento (cartão ou Pix)', aprovacao: 'Pix ou boleto após aprovação' }

export default function PedidosSocio() {
  const [rows, setRows] = useState([])
  const [filtro, setFiltro] = useState('abertos')
  const [sel, setSel] = useState(null)

  async function load() {
    const { data } = await supabase.from('glb_partner_orders')
      .select('*, parceiro:glb_members!glb_partner_orders_parceiro_id_fkey(nome, telefone, email, categoria, cidade, uf), itens:glb_partner_order_items(produto_nome, quantidade, preco_unit)')
      .order('created_at', { ascending: false }).limit(500)
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  const lista = rows.filter((r) => filtro === 'todos' || (filtro === 'abertos' ? ['aguardando', 'aprovado'].includes(r.status) : r.status === filtro))

  return (
    <div className="space-y-5">
      <div><h1 className="h1">Pedidos de parceiros</h1><p className="text-ink/60 text-sm">Aprove, envie o link de pagamento e acompanhe até o envio. Pedido pago entra nas vendas automaticamente.</p></div>
      <div className="flex flex-wrap gap-2">
        {[['abertos', 'Em aberto'], ['pago', 'Pagos'], ['enviado', 'Enviados'], ['cancelado', 'Cancelados'], ['todos', 'Todos']].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`btn ${filtro === k ? 'bg-ink text-white' : 'btn-ghost'}`}>{l}</button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        {lista.length === 0 ? <Empty>Nenhum pedido nesta lista.</Empty> : (
          <table className="table">
            <thead><tr><th>Nº</th><th>Data</th><th>Parceiro</th><th>Faixa de preço</th><th className="text-right">Unidades</th><th className="text-right">Valor</th><th>Pagamento</th><th>Status</th><th></th></tr></thead>
            <tbody>{lista.map((r) => (
              <tr key={r.id}>
                <td className="font-mono">#{r.numero}</td>
                <td className="whitespace-nowrap">{dateTime(r.created_at)}</td>
                <td>{r.parceiro?.nome}<div className="text-xs text-ink/50">{[r.parceiro?.cidade, r.parceiro?.uf].filter(Boolean).join('/')}</div></td>
                <td className="capitalize">{r.faixa}</td>
                <td className="text-right">{num(r.total_unidades)}</td>
                <td className="text-right font-semibold">{money(r.valor_produtos)}</td>
                <td className="text-xs">{FORMA[r.forma]}</td>
                <td><span className={`pill ${STATUS_COR[r.status]}`}>{STATUS_PEDIDO[r.status]}</span></td>
                <td><button className="text-xs font-semibold text-gold-dark hover:underline" onClick={() => setSel(r)}>Abrir</button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {sel && <PedidoDetalhe p={sel} onClose={() => setSel(null)} onSaved={() => { setSel(null); load() }} />}
    </div>
  )
}

function PedidoDetalhe({ p, onClose, onSaved }) {
  const [link, setLink] = useState(p.link_pagamento || '')
  const [obs, setObs] = useState(p.observacao || '')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function mudar(status) {
    setBusy(true); setErr('')
    let sale_id = p.sale_id
    if (status === 'pago' && !sale_id) {
      const { data: venda, error } = await supabase.from('glb_sales').insert({
        canal: 'portal', origem: 'revenda', external_id: `PORTAL-${p.numero}`, numero: `P${p.numero}`, status: 'pago',
        cliente_nome: p.parceiro?.nome, valor_produtos: p.valor_produtos, total: p.valor_produtos, parceiro_id: p.parceiro_id,
      }).select('id').single()
      if (error) { setErr(error.message); setBusy(false); return }
      sale_id = venda.id
      await supabase.from('glb_sale_items').insert(p.itens.map((i) => ({ sale_id, produto_nome: i.produto_nome, quantidade: i.quantidade, preco_unit: i.preco_unit })))
    }
    if (status === 'cancelado' && sale_id) await supabase.from('glb_sales').update({ status: 'cancelado' }).eq('id', sale_id)
    const { error } = await supabase.from('glb_partner_orders').update({ status, link_pagamento: link || null, observacao: obs || null, sale_id, atualizado_em: new Date().toISOString() }).eq('id', p.id)
    setBusy(false)
    if (error) setErr(error.message); else onSaved()
  }

  const zap = p.parceiro?.telefone ? `https://wa.me/55${p.parceiro.telefone.replace(/\D/g, '').replace(/^55/, '')}?text=${encodeURIComponent(`Olá, ${p.parceiro.nome}! Seu pedido #${p.numero} do Grupo Le Belle foi aprovado. Valor: ${money(p.valor_produtos)}.${link ? ' Link para pagamento: ' + link : ''}`)}` : null

  return (
    <Modal titulo={`Pedido #${p.numero}`} onClose={onClose} wide>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div><p className="label">Parceiro</p><p className="font-semibold">{p.parceiro?.nome}</p><p className="text-ink/60">{p.parceiro?.email}<br />{p.parceiro?.telefone}</p></div>
        <div><p className="label">Faixa aplicada</p><p className="font-semibold capitalize">{p.faixa}</p><p className="text-ink/60">Cadastro: {p.parceiro?.categoria}</p></div>
        <div><p className="label">Pagamento</p><p className="font-semibold">{FORMA[p.forma]}</p></div>
      </div>
      <table className="table"><thead><tr><th>Produto</th><th className="text-right">Qtd</th><th className="text-right">Unitário</th><th className="text-right">Subtotal</th></tr></thead>
        <tbody>{p.itens.map((i, k) => <tr key={k}><td>{i.produto_nome}</td><td className="text-right">{i.quantidade}</td><td className="text-right">{money(i.preco_unit)}</td><td className="text-right">{money(i.quantidade * i.preco_unit)}</td></tr>)}
          <tr><td className="font-semibold">Total ({p.total_unidades} unidades)</td><td /><td /><td className="text-right font-bold">{money(p.valor_produtos)}</td></tr></tbody></table>
      <div><label className="label">Link de pagamento (Yampi ou outro)</label><input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="Cole aqui o link de pagamento com o valor do pedido" /></div>
      <div><label className="label">Observação para o parceiro</label><input className="input" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: chave Pix, prazo de envio, frete" /></div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <div className="flex flex-wrap justify-between gap-2">
        <div className="flex gap-2">{zap && <a className="btn-ghost" href={zap} target="_blank" rel="noreferrer">Avisar no WhatsApp</a>}</div>
        <div className="flex flex-wrap gap-2">
          {p.status !== 'cancelado' && <button className="btn-danger" disabled={busy} onClick={() => confirm('Cancelar este pedido?') && mudar('cancelado')}>Cancelar</button>}
          {p.status === 'aguardando' && <button className="btn-dark" disabled={busy} onClick={() => mudar('aprovado')}>Aprovar</button>}
          {['aguardando', 'aprovado'].includes(p.status) && <button className="btn-gold" disabled={busy} onClick={() => mudar('pago')}>Confirmar pagamento</button>}
          {p.status === 'pago' && <button className="btn-gold" disabled={busy} onClick={() => mudar('enviado')}>Marcar como enviado</button>}
          <button className="btn-ghost" disabled={busy} onClick={() => mudar(p.status)}>Salvar</button>
        </div>
      </div>
    </Modal>
  )
}

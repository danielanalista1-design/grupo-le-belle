import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { money, dateTime, num } from '../../lib/format'
import { STATUS_PEDIDO } from '../../lib/labels'
import { Empty } from '../../components/Layout'
import { STATUS_COR, FORMA } from '../socio/Pedidos'

export default function MeusPedidos() {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    supabase.from('glb_partner_orders').select('*, itens:glb_partner_order_items(produto_nome, quantidade, preco_unit)')
      .order('created_at', { ascending: false }).then(({ data }) => setRows(data || []))
  }, [])
  if (!rows) return <Empty>Carregando…</Empty>
  return (
    <div className="space-y-5">
      <div><h1 className="h1">Meus pedidos</h1><p className="text-ink/60 text-sm">Acompanhe a aprovação, o pagamento e o envio.</p></div>
      {rows.length === 0 ? <div className="card"><Empty>Você ainda não fez pedidos.</Empty></div> : rows.map((p) => (
        <div key={p.id} className="card p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-display font-bold">Pedido #{p.numero}</p><p className="text-xs text-ink/50">{dateTime(p.created_at)} · {FORMA[p.forma]}</p></div>
            <span className={`pill ${STATUS_COR[p.status]}`}>{STATUS_PEDIDO[p.status]}</span>
          </div>
          <table className="table"><tbody>
            {p.itens.map((i, k) => <tr key={k}><td>{i.produto_nome}</td><td className="text-right">{i.quantidade} × {money(i.preco_unit)}</td><td className="text-right">{money(i.quantidade * i.preco_unit)}</td></tr>)}
            <tr><td className="font-semibold">{num(p.total_unidades)} unidades · preço de {p.faixa}</td><td /><td className="text-right font-bold">{money(p.valor_produtos)}</td></tr>
          </tbody></table>
          {p.observacao && <p className="text-sm rounded-xl bg-sand p-3">{p.observacao}</p>}
          {p.link_pagamento && p.status === 'aprovado' && <a href={p.link_pagamento} target="_blank" rel="noreferrer" className="btn-gold">Pagar pedido</a>}
          <p className="text-xs text-ink/50">Frete combinado com a equipe e não incluso no valor acima.</p>
        </div>
      ))}
    </div>
  )
}

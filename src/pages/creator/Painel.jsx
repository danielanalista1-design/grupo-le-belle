import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { money, dateTime, pct, monthRange, date } from '../../lib/format'
import { CANAIS, STATUS_VENDA } from '../../lib/labels'
import { PeriodoPicker } from '../../lib/periodo'
import { Stat, Empty } from '../../components/Layout'

export default function PainelCreator() {
  const [periodo, setPeriodo] = useState(monthRange(0))
  const [creator, setCreator] = useState(null)
  const [vendas, setVendas] = useState([])
  const [pagos, setPagos] = useState([])

  useEffect(() => {
    supabase.from('glb_creators').select('nome, cupom, comissao_pct').maybeSingle().then(({ data }) => setCreator(data))
    supabase.from('glb_creator_payouts').select('mes, valor, pago_em').order('mes', { ascending: false }).then(({ data }) => setPagos(data || []))
  }, [])
  useEffect(() => {
    supabase.rpc('glb_creator_dashboard', { p_inicio: periodo.inicio, p_fim: periodo.fim }).then(({ data }) => setVendas(data || []))
  }, [periodo.inicio, periodo.fim])

  const pagas = vendas.filter((v) => v.status === 'pago')
  const total = pagas.reduce((a, v) => a + Number(v.valor_produtos), 0)
  const comissao = pagas.reduce((a, v) => a + Number(v.comissao), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="h1">Minhas vendas</h1>
          {creator && <p className="text-ink/60 text-sm">Cupom <span className="pill bg-blue-light text-blue-dark font-mono">{creator.cupom}</span> · comissão de {pct(creator.comissao_pct)} sobre o valor dos produtos</p>}</div>
        <PeriodoPicker value={periodo} onChange={setPeriodo} />
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Stat label="Vendas com seu cupom" value={pagas.length} />
        <Stat label="Total vendido" value={money(total)} hint="Valor dos produtos, sem frete" tone="silver" />
        <Stat label="Sua comissão" value={money(comissao)} tone="leaf" />
      </div>
      <div className="card overflow-x-auto">
        {vendas.length === 0 ? <Empty>Nenhuma venda com seu cupom neste período.</Empty> : (
          <table className="table">
            <thead><tr><th>Data</th><th>Pedido</th><th>Canal</th><th>Status</th><th className="text-right">Valor</th><th className="text-right">Comissão</th></tr></thead>
            <tbody>{vendas.map((v, i) => (
              <tr key={i} className={v.status === 'pago' ? '' : 'opacity-50'}>
                <td>{dateTime(v.data_venda)}</td><td>{v.numero || '—'}</td><td>{CANAIS[v.canal]}</td><td>{STATUS_VENDA[v.status]}</td>
                <td className="text-right">{money(v.valor_produtos)}</td><td className="text-right font-semibold">{money(v.comissao)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {pagos.length > 0 && (
        <div className="card p-5">
          <h2 className="h2 mb-2">Pagamentos de comissão</h2>
          <table className="table"><tbody>{pagos.map((p) => (
            <tr key={p.mes}><td>{new Date(p.mes + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</td><td className="text-right">{money(p.valor)}</td><td>{p.pago_em ? `Pago em ${date(p.pago_em)}` : 'A pagar'}</td></tr>
          ))}</tbody></table>
        </div>
      )}
      <p className="text-xs text-ink/50">Vendas canceladas ou devolvidas não geram comissão.</p>
    </div>
  )
}

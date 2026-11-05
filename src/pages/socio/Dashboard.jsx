import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { money, num, pct, monthRange } from '../../lib/format'
import { CANAIS, ORIGENS } from '../../lib/labels'
import { PeriodoPicker, de, ate } from '../../lib/periodo'
import { Stat, Empty } from '../../components/Layout'

export default function Dashboard() {
  const [periodo, setPeriodo] = useState(monthRange(0))
  const [vendas, setVendas] = useState([])
  const [socios, setSocios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('glb_members').select('nome, participacao_pct').eq('role', 'socio').eq('status', 'aprovado')
      .order('participacao_pct', { ascending: true }).then(({ data }) => setSocios(data || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    supabase.from('glb_v_sales').select('canal, origem, status, valor_produtos, frete, total, comissao_creator, base_divisao, creator_nome')
      .gte('data_venda', de(periodo.inicio)).lte('data_venda', ate(periodo.fim)).limit(20000)
      .then(({ data }) => { setVendas(data || []); setLoading(false) })
  }, [periodo.inicio, periodo.fim])

  const r = useMemo(() => {
    const pagas = vendas.filter((v) => v.status === 'pago')
    const sum = (arr, k) => arr.reduce((s, v) => s + Number(v[k] || 0), 0)
    const group = (key) => {
      const m = {}
      pagas.forEach((v) => { const k = v[key] || '—'; m[k] = m[k] || { qtd: 0, valor: 0 }; m[k].qtd++; m[k].valor += Number(v.valor_produtos) })
      return Object.entries(m).sort((a, b) => b[1].valor - a[1].valor)
    }
    const creators = {}
    pagas.filter((v) => v.creator_nome).forEach((v) => {
      creators[v.creator_nome] = creators[v.creator_nome] || { qtd: 0, valor: 0, comissao: 0 }
      creators[v.creator_nome].qtd++; creators[v.creator_nome].valor += Number(v.valor_produtos); creators[v.creator_nome].comissao += Number(v.comissao_creator)
    })
    return {
      qtd: pagas.length,
      produtos: sum(pagas, 'valor_produtos'),
      comissoes: sum(pagas, 'comissao_creator'),
      base: sum(pagas, 'base_divisao'),
      canceladas: vendas.filter((v) => ['cancelado', 'devolvido'].includes(v.status)).length,
      pendentes: vendas.filter((v) => v.status === 'pendente').length,
      porCanal: group('canal'),
      porOrigem: group('origem'),
      creators: Object.entries(creators).sort((a, b) => b[1].valor - a[1].valor),
    }
  }, [vendas])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="h1">Visão geral</h1><p className="text-ink/60 text-sm">Vendas pagas no período, de todos os canais.</p></div>
        <PeriodoPicker value={periodo} onChange={setPeriodo} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Vendas pagas" value={num(r.qtd)} hint={`${r.pendentes} pendentes · ${r.canceladas} canceladas`} />
        <Stat label="Valor dos produtos" value={money(r.produtos)} hint="Sem frete, com descontos" tone="gold" />
        <Stat label="Comissões de creators" value={money(r.comissoes)} hint="15% sobre vendas com cupom" />
        <Stat label="Base para divisão" value={money(r.base)} hint="Produtos − comissões de creators" tone="leaf" />
      </div>

      <div className="card p-5">
        <h2 className="h2 mb-3">Divisão entre os sócios</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {socios.map((s) => (
            <div key={s.nome} className="rounded-xl bg-sand p-4">
              <p className="text-sm font-semibold">{s.nome} <span className="text-ink/50 font-normal">· {pct(s.participacao_pct)}</span></p>
              <p className="font-display text-2xl font-extrabold">{money((r.base * Number(s.participacao_pct || 0)) / 100)}</p>
            </div>
          ))}
          {socios.length === 0 && <p className="text-sm text-ink/50">Os sócios aparecem aqui depois do primeiro login de cada um.</p>}
        </div>
      </div>

      {loading ? <Empty>Carregando…</Empty> : (
        <div className="grid lg:grid-cols-3 gap-4">
          <Ranking titulo="Por canal" linhas={r.porCanal} labels={CANAIS} total={r.produtos} />
          <Ranking titulo="Por origem" linhas={r.porOrigem} labels={ORIGENS} total={r.produtos} />
          <div className="card p-5">
            <h2 className="h2 mb-3">Creators no período</h2>
            {r.creators.length === 0 ? <Empty>Nenhuma venda com cupom de creator.</Empty> : (
              <table className="table"><thead><tr><th>Creator</th><th className="text-right">Vendido</th><th className="text-right">Comissão</th></tr></thead>
                <tbody>{r.creators.map(([n, c]) => (
                  <tr key={n}><td>{n}<div className="text-xs text-ink/50">{c.qtd} vendas</div></td><td className="text-right">{money(c.valor)}</td><td className="text-right">{money(c.comissao)}</td></tr>
                ))}</tbody></table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Ranking({ titulo, linhas, labels, total }) {
  return (
    <div className="card p-5">
      <h2 className="h2 mb-3">{titulo}</h2>
      {linhas.length === 0 ? <Empty>Sem vendas no período.</Empty> : (
        <div className="space-y-3">
          {linhas.map(([k, v]) => {
            const p = total ? (v.valor / total) * 100 : 0
            return (
              <div key={k}>
                <div className="flex justify-between text-sm"><span className="font-medium">{labels[k] || k}</span><span>{money(v.valor)}</span></div>
                <div className="h-2 rounded-full bg-sand mt-1 overflow-hidden"><div className="h-full bg-gradient-to-r from-blue to-[#4C7BFF]" style={{ width: `${p}%` }} /></div>
                <p className="text-xs text-ink/50 mt-0.5">{v.qtd} vendas · {pct(p)}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

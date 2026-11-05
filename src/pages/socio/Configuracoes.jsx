import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function Configuracoes() {
  const [s, setS] = useState(null)
  const [msg, setMsg] = useState('')
  useEffect(() => { supabase.from('glb_settings').select('*').eq('id', 1).single().then(({ data }) => setS(data)) }, [])
  if (!s) return null
  async function salvar(e) {
    e.preventDefault(); setMsg('')
    const { error } = await supabase.from('glb_settings').update({
      minimo_revendedor: Number(s.minimo_revendedor), minimo_distribuidor: Number(s.minimo_distribuidor),
      upgrade_automatico: s.upgrade_automatico, creator_comissao_padrao: Number(s.creator_comissao_padrao), updated_at: new Date().toISOString(),
    }).eq('id', 1)
    setMsg(error ? error.message : 'Configurações salvas.')
  }
  return (
    <form onSubmit={salvar} className="space-y-5 max-w-2xl">
      <div><h1 className="h1">Configurações</h1><p className="text-ink/60 text-sm">Regras de pedido e comissão.</p></div>
      <div className="card p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Pedido mínimo (unidades)</label><input type="number" className="input" value={s.minimo_revendedor} onChange={(e) => setS({ ...s, minimo_revendedor: e.target.value })} /></div>
          <div><label className="label">Unidades para preço de distribuidor</label><input type="number" className="input" value={s.minimo_distribuidor} onChange={(e) => setS({ ...s, minimo_distribuidor: e.target.value })} /></div>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1" checked={s.upgrade_automatico} onChange={(e) => setS({ ...s, upgrade_automatico: e.target.checked })} />
          <span><b>Revendedor com pedido grande paga preço de distribuidor.</b><br />
            <span className="text-ink/60">Ligado: quando um revendedor fecha um pedido com {s.minimo_distribuidor} unidades ou mais, o pedido inteiro sai pelo preço de distribuidor. Desligado: o preço depende só da categoria cadastrada.</span></span>
        </label>
        <div className="sm:w-1/2"><label className="label">Comissão padrão de creators (%)</label><input type="number" step="0.01" className="input" value={s.creator_comissao_padrao} onChange={(e) => setS({ ...s, creator_comissao_padrao: e.target.value })} /></div>
        {msg && <p className="text-sm text-leaf">{msg}</p>}
        <button className="btn-gold">Salvar</button>
      </div>
      <div className="card p-6 text-sm text-ink/70 space-y-1">
        <p><b>Como a divisão é calculada:</b> valor dos produtos das vendas pagas (sem frete, com descontos), menos as comissões de creators. O resultado é dividido pela participação de cada sócio, cadastrada em Parceiros e acessos.</p>
        <p>Taxas de marketplace, cartão e frete não entram na conta.</p>
      </div>
    </form>
  )
}

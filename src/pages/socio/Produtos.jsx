import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { money, parseMoney } from '../../lib/format'
import { LOJAS } from '../../lib/labels'
import { Empty } from '../../components/Layout'
import { Modal } from './Vendas'

export default function Produtos() {
  const [rows, setRows] = useState([])
  const [edit, setEdit] = useState(null)
  async function load() {
    const { data } = await supabase.from('glb_products').select('*').order('loja').order('linha').order('ordem').order('nome')
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  const linhas = {}
  rows.forEach((p) => { const k = `${LOJAS[p.loja]} · ${p.linha || 'Sem linha'}`; (linhas[k] = linhas[k] || []).push(p) })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="h1">Produtos e preços</h1><p className="text-ink/60 text-sm">Tabela oficial de atacado 2026. Distribuidor = CAT. DISTRIBUIDOR · Revendedor = CAT. MICRO-DISTRIBUIDOR.</p></div>
        <button className="btn-gold" onClick={() => setEdit({})}>Novo produto</button>
      </div>
      {rows.length === 0 ? <Empty>Nenhum produto.</Empty> : Object.entries(linhas).map(([titulo, itens]) => (
        <div key={titulo} className="card overflow-x-auto">
          <h2 className="h2 px-4 pt-4">{titulo}</h2>
          <table className="table">
            <thead><tr><th>Produto</th><th>Tipo</th><th className="text-right">Distribuidor</th><th className="text-right">Revendedor</th><th className="text-right">Varejo</th><th>Ativo</th><th></th></tr></thead>
            <tbody>{itens.map((p) => (
              <tr key={p.id} className={p.ativo ? '' : 'opacity-50'}>
                <td className="font-medium">{p.nome}</td>
                <td><span className={`pill ${p.tipo === 'kit' ? 'bg-gold-light/40 text-gold-dark' : 'bg-sand'}`}>{p.tipo === 'kit' ? 'Kit' : 'Unidade'}</span></td>
                <td className="text-right">{money(p.preco_distribuidor)}</td>
                <td className="text-right">{money(p.preco_revendedor)}</td>
                <td className="text-right">{p.preco_varejo ? money(p.preco_varejo) : '—'}</td>
                <td>{p.ativo ? 'Sim' : 'Não'}</td>
                <td><button className="text-xs font-semibold text-gold-dark hover:underline" onClick={() => setEdit(p)}>Editar</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
      {edit && <ProdutoForm p={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
    </div>
  )
}

function ProdutoForm({ p, onClose, onSaved }) {
  const novo = !p.id
  const [v, setV] = useState({
    loja: p.loja || 'lebelle', linha: p.linha || '', tipo: p.tipo || 'unidade', nome: p.nome || '', imagem_url: p.imagem_url || '',
    preco_distribuidor: p.preco_distribuidor ?? '', preco_revendedor: p.preco_revendedor ?? '', preco_varejo: p.preco_varejo ?? '', ordem: p.ordem ?? 0, ativo: p.ativo ?? true,
  })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  async function salvar(e) {
    e.preventDefault(); setErr('')
    const dados = { ...v, preco_distribuidor: parseMoney(v.preco_distribuidor), preco_revendedor: parseMoney(v.preco_revendedor), preco_varejo: v.preco_varejo === '' ? null : parseMoney(v.preco_varejo), ordem: Number(v.ordem) || 0, imagem_url: v.imagem_url || null }
    const { error } = novo ? await supabase.from('glb_products').insert(dados) : await supabase.from('glb_products').update(dados).eq('id', p.id)
    if (error) setErr(error.message); else onSaved()
  }
  return (
    <Modal titulo={novo ? 'Novo produto' : p.nome} onClose={onClose}>
      <form onSubmit={salvar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Loja</label><select className="input" value={v.loja} onChange={set('loja')}>{Object.entries(LOJAS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><label className="label">Tipo</label><select className="input" value={v.tipo} onChange={set('tipo')}><option value="unidade">Unidade</option><option value="kit">Kit</option></select></div>
          <div className="col-span-2"><label className="label">Linha</label><input className="input" value={v.linha} onChange={set('linha')} /></div>
          <div className="col-span-2"><label className="label">Nome do produto</label><input className="input" required value={v.nome} onChange={set('nome')} /></div>
          <div><label className="label">Preço distribuidor</label><input className="input" required value={v.preco_distribuidor} onChange={set('preco_distribuidor')} /></div>
          <div><label className="label">Preço revendedor</label><input className="input" required value={v.preco_revendedor} onChange={set('preco_revendedor')} /></div>
          <div><label className="label">Preço de varejo (opcional)</label><input className="input" value={v.preco_varejo} onChange={set('preco_varejo')} /></div>
          <div><label className="label">Ordem</label><input type="number" className="input" value={v.ordem} onChange={set('ordem')} /></div>
          <div className="col-span-2"><label className="label">URL da imagem (opcional)</label><input className="input" value={v.imagem_url} onChange={set('imagem_url')} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.ativo} onChange={set('ativo')} /> Disponível no portal</label>
        {err && <p className="text-sm text-red-700">{err}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button><button className="btn-gold">Salvar</button></div>
      </form>
    </Modal>
  )
}

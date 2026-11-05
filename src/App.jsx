import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './pages/socio/Dashboard'
import Vendas from './pages/socio/Vendas'
import Creators from './pages/socio/Creators'
import Parceiros from './pages/socio/Parceiros'
import Produtos from './pages/socio/Produtos'
import PedidosSocio from './pages/socio/Pedidos'
import Configuracoes from './pages/socio/Configuracoes'
import Catalogo from './pages/parceiro/Catalogo'
import MeusPedidos from './pages/parceiro/MeusPedidos'
import PainelCreator from './pages/creator/Painel'

const MENUS = {
  socio: [
    ['dashboard', 'Visão geral'],
    ['vendas', 'Vendas'],
    ['pedidos', 'Pedidos de parceiros'],
    ['parceiros', 'Parceiros e acessos'],
    ['creators', 'Creators'],
    ['produtos', 'Produtos e preços'],
    ['config', 'Configurações'],
  ],
  parceiro: [
    ['catalogo', 'Fazer pedido'],
    ['meus-pedidos', 'Meus pedidos'],
  ],
  creator: [['painel', 'Minhas vendas']],
}

function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash.replace('#/', '') || '')
  useEffect(() => {
    const on = () => setRoute(window.location.hash.replace('#/', '') || '')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return [route, (r) => (window.location.hash = '/' + r)]
}

export default function App() {
  const [session, setSession] = useState(null)
  const [member, setMember] = useState(undefined) // undefined = carregando, null = sem cadastro
  const [route, go] = useHashRoute()

  const [recovery, setRecovery] = useState(() => window.location.hash.includes('type=recovery'))

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      if (e === 'PASSWORD_RECOVERY') setRecovery(true)
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadMember() {
    if (!session) { setMember(undefined); return }
    setMember(undefined)
    await supabase.rpc('glb_claim_invite') // libera automaticamente quem foi convidado pelos sócios
    const { data } = await supabase.from('glb_members').select('*').eq('user_id', session.user.id).maybeSingle()
    setMember(data || null)
  }
  useEffect(() => { loadMember() }, [session?.user?.id])

  if (session && recovery) return <NovaSenha onDone={() => { setRecovery(false); window.location.hash = '' }} />
  if (!session) return <Login />
  if (member === undefined) return <div className="min-h-screen grid place-items-center text-ink/60">Carregando…</div>

  if (!member || member.status !== 'aprovado') {
    return <Aguardando member={member} email={session.user.email} onReload={loadMember} />
  }

  const menu = MENUS[member.role] || []
  const keys = menu.map((m) => m[0])
  const current = keys.includes(route) ? route : keys[0]

  const pages = {
    dashboard: <Dashboard />,
    vendas: <Vendas />,
    pedidos: <PedidosSocio />,
    parceiros: <Parceiros />,
    creators: <Creators />,
    produtos: <Produtos />,
    config: <Configuracoes />,
    catalogo: <Catalogo member={member} onDone={() => go('meus-pedidos')} />,
    'meus-pedidos': <MeusPedidos />,
    painel: <PainelCreator member={member} />,
  }

  return (
    <Layout member={member} menu={menu} current={current} go={go}>
      {pages[current]}
    </Layout>
  )
}

function Aguardando({ member, email, onReload }) {
  const [form, setForm] = useState({ nome: '', telefone: '', documento: '', cidade: '', uf: '', categoria: 'revendedor' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function solicitar(e) {
    e.preventDefault()
    setBusy(true); setMsg('')
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('glb_members').insert({
      user_id: u.user.id, role: 'parceiro', email, status: 'pendente', ...form,
    })
    setBusy(false)
    if (error) setMsg('Não foi possível enviar: ' + error.message)
    else onReload()
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="card w-full max-w-lg p-8 space-y-5">
        <Brand />
        {member?.status === 'pendente' && (
          <p className="text-ink/70">Seu cadastro foi recebido e está <b>aguardando aprovação</b> dos sócios. Você recebe acesso assim que for aprovado.</p>
        )}
        {member?.status === 'bloqueado' && <p className="text-red-700">Seu acesso está bloqueado. Fale com a equipe Le Belle.</p>}
        {!member && (
          <form onSubmit={solicitar} className="space-y-3">
            <p className="text-ink/70">Quer ser parceiro Le Belle? Preencha seus dados para solicitar acesso ao portal.</p>
            <div><label className="label">Nome completo ou empresa</label><input className="input" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">WhatsApp</label><input className="input" required value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
              <div><label className="label">CPF ou CNPJ</label><input className="input" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><label className="label">Cidade</label><input className="input" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
              <div><label className="label">UF</label><input className="input" maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
            </div>
            <div>
              <label className="label">Interesse</label>
              <select className="input" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                <option value="revendedor">Revendedor (a partir de 10 unidades)</option>
                <option value="distribuidor">Distribuidor (a partir de 100 unidades)</option>
              </select>
              <p className="text-xs text-ink/50 mt-1">A categoria final é definida pelos sócios na aprovação.</p>
            </div>
            {msg && <p className="text-sm text-red-700">{msg}</p>}
            <button className="btn-gold w-full" disabled={busy}>{busy ? 'Enviando…' : 'Solicitar acesso'}</button>
          </form>
        )}
        <button className="btn-ghost w-full" onClick={() => supabase.auth.signOut()}>Sair</button>
      </div>
    </div>
  )
}

function NovaSenha({ onDone }) {
  const [s1, setS1] = useState('')
  const [s2, setS2] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  async function salvar(e) {
    e.preventDefault(); setMsg('')
    if (s1.length < 6) return setMsg('A senha precisa ter pelo menos 6 caracteres.')
    if (s1 !== s2) return setMsg('As duas senhas não são iguais.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: s1 })
    setBusy(false)
    if (error) setMsg(error.message); else onDone()
  }
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <form onSubmit={salvar} className="card w-full max-w-sm p-8 space-y-4">
        <Brand />
        <p className="text-sm text-ink/70">Crie sua nova senha.</p>
        <div><label className="label">Nova senha</label><input type="password" className="input" value={s1} onChange={(e) => setS1(e.target.value)} autoComplete="new-password" /></div>
        <div><label className="label">Repita a nova senha</label><input type="password" className="input" value={s2} onChange={(e) => setS2(e.target.value)} autoComplete="new-password" /></div>
        {msg && <p className="text-sm text-red-700">{msg}</p>}
        <button className="btn-gold w-full" disabled={busy}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
      </form>
    </div>
  )
}

export function Brand({ small }) {
  return (
    <div className={small ? '' : 'text-center'}>
      <p className={`font-display font-extrabold tracking-tight ${small ? 'text-lg' : 'text-3xl'}`}>
        Grupo <span className="bg-gradient-to-b from-gold-light to-gold-dark bg-clip-text text-transparent">Le Belle</span>
      </p>
      {!small && <p className="text-xs uppercase tracking-[0.3em] text-ink/50 mt-1">Gestão de vendas e parceiros</p>}
    </div>
  )
}

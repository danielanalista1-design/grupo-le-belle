import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Brand } from '../App'

export default function Login() {
  const [mode, setMode] = useState('entrar') // entrar | criar | esqueci
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [msg, setMsg] = useState({ t: '', ok: false })
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setMsg({ t: '', ok: false })
    let error
    if (mode === 'entrar') {
      ;({ error } = await supabase.auth.signInWithPassword({ email, password: senha }))
    } else if (mode === 'criar') {
      ;({ error } = await supabase.auth.signUp({ email, password: senha, options: { emailRedirectTo: window.location.origin } }))
      if (!error) setMsg({ t: 'Conta criada. Confira seu e-mail para confirmar o cadastro e depois entre com sua senha.', ok: true })
    } else {
      ;({ error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }))
      if (!error) setMsg({ t: 'Enviamos um link para redefinir a senha.', ok: true })
    }
    if (error) setMsg({ t: traduz(error.message), ok: false })
    setBusy(false)
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-to-b from-sand to-[#EFE7D7]">
      <form onSubmit={submit} className="card w-full max-w-sm p-8 space-y-4">
        <Brand />
        <div className="flex rounded-xl bg-sand p-1 text-sm font-semibold">
          {[['entrar', 'Entrar'], ['criar', 'Criar conta']].map(([k, l]) => (
            <button type="button" key={k} onClick={() => setMode(k)} className={`flex-1 rounded-lg py-2 ${mode === k ? 'bg-white shadow-sm' : 'text-ink/50'}`}>{l}</button>
          ))}
        </div>
        <div><label className="label">E-mail</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        {mode !== 'esqueci' && (
          <div><label className="label">Senha</label><input className="input" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'} /></div>
        )}
        {msg.t && <p className={`text-sm ${msg.ok ? 'text-leaf' : 'text-red-700'}`}>{msg.t}</p>}
        <button className="btn-gold w-full" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : mode === 'criar' ? 'Criar conta' : 'Enviar link'}
        </button>
        <button type="button" className="w-full text-sm text-ink/60 hover:text-ink" onClick={() => setMode(mode === 'esqueci' ? 'entrar' : 'esqueci')}>
          {mode === 'esqueci' ? 'Voltar para o login' : 'Esqueci minha senha'}
        </button>
      </form>
    </div>
  )
}

function traduz(m) {
  if (/Invalid login/i.test(m)) return 'E-mail ou senha incorretos.'
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail antes de entrar.'
  if (/already registered/i.test(m)) return 'Este e-mail já tem conta. Use "Entrar".'
  return m
}

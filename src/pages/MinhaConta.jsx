import { useState } from 'react'
import { supabase } from '../lib/supabase'
import SenhaInput from '../components/SenhaInput'

export default function MinhaConta({ member, onSaved }) {
  const [dados, setDados] = useState({ nome: member.nome || '', telefone: member.telefone || '', cidade: member.cidade || '', uf: member.uf || '' })
  const [msgDados, setMsgDados] = useState({ t: '', ok: false })
  const [senha, setSenha] = useState({ atual: '', nova: '', repetir: '' })
  const [msgSenha, setMsgSenha] = useState({ t: '', ok: false })
  const [busy, setBusy] = useState(false)

  async function salvarDados(e) {
    e.preventDefault(); setMsgDados({ t: '', ok: false })
    const { error } = await supabase.rpc('glb_update_my_profile', {
      p_nome: dados.nome, p_telefone: dados.telefone || null, p_cidade: dados.cidade || null, p_uf: dados.uf || null,
    })
    if (error) setMsgDados({ t: error.message, ok: false })
    else { setMsgDados({ t: 'Dados atualizados.', ok: true }); onSaved?.() }
  }

  async function trocarSenha(e) {
    e.preventDefault(); setMsgSenha({ t: '', ok: false })
    if (senha.nova.length < 6) return setMsgSenha({ t: 'A nova senha precisa ter pelo menos 6 caracteres.', ok: false })
    if (senha.nova !== senha.repetir) return setMsgSenha({ t: 'As duas senhas novas não são iguais.', ok: false })
    setBusy(true)
    // confirma a senha atual antes de trocar
    const { error: errLogin } = await supabase.auth.signInWithPassword({ email: member.email, password: senha.atual })
    if (errLogin) { setBusy(false); return setMsgSenha({ t: 'A senha atual está incorreta.', ok: false }) }
    const { error } = await supabase.auth.updateUser({ password: senha.nova })
    setBusy(false)
    if (error) setMsgSenha({ t: error.message, ok: false })
    else { setSenha({ atual: '', nova: '', repetir: '' }); setMsgSenha({ t: 'Senha alterada com sucesso.', ok: true }) }
  }

  async function enviarLink() {
    setMsgSenha({ t: '', ok: false })
    const { error } = await supabase.auth.resetPasswordForEmail(member.email, { redirectTo: window.location.origin })
    setMsgSenha(error ? { t: error.message, ok: false } : { t: `Enviamos um link para ${member.email} para criar uma senha nova.`, ok: true })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="h1">Minha conta</h1><p className="text-ink/60 text-sm">Seus dados de acesso e contato.</p></div>

      <form onSubmit={salvarDados} className="card p-6 space-y-4">
        <h2 className="h2">Dados</h2>
        <div><label className="label">E-mail de acesso</label><input className="input bg-sand" value={member.email} disabled /></div>
        <div><label className="label">Nome</label><input className="input" required value={dados.nome} onChange={(e) => setDados({ ...dados, nome: e.target.value })} /></div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div><label className="label">WhatsApp</label><input className="input" value={dados.telefone} onChange={(e) => setDados({ ...dados, telefone: e.target.value })} /></div>
          <div><label className="label">Cidade</label><input className="input" value={dados.cidade} onChange={(e) => setDados({ ...dados, cidade: e.target.value })} /></div>
          <div><label className="label">UF</label><input className="input" maxLength={2} value={dados.uf} onChange={(e) => setDados({ ...dados, uf: e.target.value.toUpperCase() })} /></div>
        </div>
        {msgDados.t && <p className={`text-sm ${msgDados.ok ? 'text-leaf' : 'text-red-700'}`}>{msgDados.t}</p>}
        <button className="btn-primary">Salvar dados</button>
      </form>

      <form onSubmit={trocarSenha} className="card p-6 space-y-4">
        <h2 className="h2">Trocar senha</h2>
        <p className="text-sm text-ink/60">Por segurança, a senha fica guardada criptografada e ninguém consegue vê-la depois de salva. Aqui você cria uma nova. Use o olho para conferir o que está digitando.</p>
        <div><label className="label">Senha atual</label><SenhaInput value={senha.atual} onChange={(e) => setSenha({ ...senha, atual: e.target.value })} autoComplete="current-password" required /></div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Nova senha</label><SenhaInput value={senha.nova} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} autoComplete="new-password" required minLength={6} /></div>
          <div><label className="label">Repita a nova senha</label><SenhaInput value={senha.repetir} onChange={(e) => setSenha({ ...senha, repetir: e.target.value })} autoComplete="new-password" required minLength={6} /></div>
        </div>
        {msgSenha.t && <p className={`text-sm ${msgSenha.ok ? 'text-leaf' : 'text-red-700'}`}>{msgSenha.t}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy}>{busy ? 'Salvando…' : 'Trocar senha'}</button>
          <button type="button" className="btn-ghost" onClick={enviarLink}>Esqueci a senha atual</button>
        </div>
      </form>
    </div>
  )
}

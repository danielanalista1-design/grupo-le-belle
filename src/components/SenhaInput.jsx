import { useState } from 'react'

// Campo de senha com botão para mostrar/esconder o que está sendo digitado
export default function SenhaInput({ value, onChange, autoComplete, required, minLength }) {
  const [ver, setVer] = useState(false)
  return (
    <div className="relative">
      <input
        type={ver ? 'text' : 'password'}
        className="input pr-11"
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => setVer(!ver)}
        aria-label={ver ? 'Esconder senha' : 'Mostrar senha'}
        title={ver ? 'Esconder senha' : 'Mostrar senha'}
        className="absolute inset-y-0 right-0 px-3 text-ink/50 hover:text-ink"
      >
        {ver ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5 0 9 4.5 10 8a12.6 12.6 0 0 1-3.1 4.4M6.1 6.1C3.9 7.6 2.5 9.8 2 12c1 3.5 5 8 10 8a10.3 10.3 0 0 0 5.9-1.9" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12c1-3.5 5-8 10-8s9 4.5 10 8c-1 3.5-5 8-10 8S3 15.5 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </div>
  )
}

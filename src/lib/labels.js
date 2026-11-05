export const CANAIS = {
  site_lebelle: 'Site Le Belle',
  site_vittagold: 'Site Vitta Gold',
  portal: 'Portal de parceiros',
  tiktok_shop: 'TikTok Shop',
  mercado_livre: 'Mercado Livre',
  marketplace_outro: 'Outro marketplace',
  venda_direta: 'Venda direta',
}

export const ORIGENS = {
  creator: 'Creator',
  anuncio_meta: 'Anúncio Meta',
  anuncio_google: 'Anúncio Google',
  organico: 'Redes sociais (orgânico)',
  revenda: 'Revenda',
  direto: 'Direto',
  outro: 'Outro',
}

export const STATUS_VENDA = { pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado', devolvido: 'Devolvido' }

export const STATUS_PEDIDO = {
  aguardando: 'Aguardando aprovação',
  aprovado: 'Aprovado · aguardando pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
}

export const LOJAS = { lebelle: 'Le Belle', vittagold: 'New Belle Vitta' }

// Classifica a origem a partir das UTMs (cupom de creator tem prioridade e é tratado no banco)
export function origemFromUtm(source = '', medium = '') {
  const s = (source || '').toLowerCase()
  const m = (medium || '').toLowerCase()
  const pago = /(cpc|ppc|paid|ads|anuncio|anúncio)/.test(m)
  if (/(facebook|instagram|fb|ig|meta)/.test(s)) return pago ? 'anuncio_meta' : 'organico'
  if (/(google|youtube|gads)/.test(s)) return pago ? 'anuncio_google' : 'organico'
  if (/(tiktok|whatsapp|wa|grupo|bio|linktree)/.test(s)) return 'organico'
  if (s) return 'outro'
  return 'direto'
}

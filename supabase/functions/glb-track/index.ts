// =========================================================
// Grupo Le Belle — registra o clique em "Comprar" nos sites
// ---------------------------------------------------------
// O site envia (navigator.sendBeacon) a origem da visita: utm_* e cupom.
// Guardamos junto com o endereço de internet (IP) do visitante para, quando
// o pedido chegar da Yampi, descobrir de onde a venda veio.
// Os registros são apagados automaticamente depois de 30 dias.
// =========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type' }
const SITES = ['site_lebelle', 'site_vittagold']
const txt = (v: unknown, max = 120) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return new Response('ok', { status: 200, headers: CORS })

  try {
    const raw = await req.text()
    if (raw.length > 2000) return new Response('too large', { status: 413, headers: CORS })
    const d = JSON.parse(raw || '{}')
    const site = SITES.includes(d.site) ? d.site : null
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || ''
    if (!site || !ip) return new Response('ignored', { status: 200, headers: CORS })

    await supabase.from('glb_clicks').insert({
      ip, site,
      utm_source: txt(d.utm_source), utm_medium: txt(d.utm_medium), utm_campaign: txt(d.utm_campaign),
      utm_content: txt(d.utm_content), utm_term: txt(d.utm_term), cupom: txt(d.cupom, 40)?.toUpperCase() ?? null,
    })
    // limpeza: apaga cliques com mais de 30 dias (de vez em quando, para não pesar)
    if (Math.random() < 0.05) await supabase.from('glb_clicks').delete().lt('criado_em', new Date(Date.now() - 30 * 864e5).toISOString())
  } catch (e) {
    console.error('track:', (e as Error).message)
  }
  return new Response('ok', { status: 200, headers: CORS })
})

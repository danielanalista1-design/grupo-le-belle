// =========================================================
// Grupo Le Belle — Webhook da Yampi → glb_sales
// ---------------------------------------------------------
// Recebe os eventos de pedido da Yampi (order.created, order.paid,
// order.status.updated), confere a assinatura HMAC-SHA256 e grava a
// venda no painel do Grupo (tabelas glb_sales e glb_sale_items).
// É uma função SEPARADA da "yampi-webhook" do site da Le Belle, que
// continua funcionando igual.
//
// Segredo necessário (Supabase › Edge Functions › Secrets):
//   GLB_YAMPI_WEBHOOK_SECRET = chave secreta do webhook criado na Yampi
// =========================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const SECRET = Deno.env.get('GLB_YAMPI_WEBHOOK_SECRET') || ''

// ---------- utilidades ----------
const lista = (x: any): any[] => (Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : [])
const obj = (x: any): any => (x && typeof x === 'object' && 'data' in x && !Array.isArray(x.data) ? x.data : x) || {}
const num = (x: any): number => { const n = Number(x); return Number.isFinite(n) ? n : 0 }
const r2 = (n: number) => Math.round(n * 100) / 100

async function assinaturaOk(body: string, header: string | null) {
  if (!SECRET || !header) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))
  const calc = btoa(String.fromCharCode(...sig))
  if (calc.length !== header.length) return false
  let diff = 0
  for (let i = 0; i < calc.length; i++) diff |= calc.charCodeAt(i) ^ header.charCodeAt(i)
  return diff === 0
}

// Status da Yampi → status do painel
const PAGO = ['paid', 'approved', 'invoiced', 'handling_products', 'on_carriage', 'shipped', 'shipment_exception', 'delivered', 'ready_for_pickup', 'picked_up']
const CANCELADO = ['cancelled', 'canceled', 'refused', 'expired', 'payment_refused']
const DEVOLVIDO = ['refunded', 'chargeback', 'chargeback_requested', 'returned']
export function mapStatus(event: string, alias: string) {
  const a = (alias || '').toLowerCase()
  if (PAGO.includes(a)) return 'pago'
  if (CANCELADO.includes(a) || a.includes('cancel')) return 'cancelado'
  if (DEVOLVIDO.includes(a) || a.includes('refund')) return 'devolvido'
  if (event === 'order.paid') return 'pago'
  return 'pendente'
}

// Mesma regra usada no painel (src/lib/labels.js)
export function origemFromUtm(source = '', medium = '') {
  const s = (source || '').toLowerCase()
  const m = (medium || '').toLowerCase()
  const pago = /(cpc|ppc|paid|ads|anuncio|anúncio)/.test(m)
  if (/(facebook|instagram|fb|ig|meta)/.test(s)) return pago ? 'anuncio_meta' : 'organico'
  if (/(google|youtube|gads)/.test(s)) return pago ? 'anuncio_google' : 'organico'
  if (/(tiktok|whatsapp|wa|grupo|bio|linktree)/.test(s)) return 'organico'
  if (/^site_/.test(s)) return 'direto'
  if (s) return 'outro'
  return 'direto'
}

function cupomDo(r: any): string | null {
  const p = lista(r.promocode)[0] || obj(r.promocode)
  const meta = lista(r.metadata)
  const doMeta = meta.find((m: any) => /cupom|coupon|promocode/i.test(m?.key || ''))?.value
  const c = p.code || p.name || r.promocode_code || r.coupon_code || r.coupon || doMeta || null
  return c ? String(c).trim().toUpperCase() : null
}

// Guarda o pedido para conferência, mas sem CPF, endereço, telefone e e-mail do cliente
function semDadosPessoais(payload: any) {
  const r = { ...(payload.resource || {}) }
  for (const k of ['customer', 'shipping_address', 'spreadsheet', 'pickup_address', 'ip', 'pix', 'transactions', 'payments', 'whatsapp', 'whatsapp_app', 'billet_whatsapp_link', 'billet_whatsapp_app_link']) delete r[k]
  return { ...payload, resource: r }
}

export function montarVenda(payload: any) {
  const event = String(payload.event || '')
  const r = payload.resource || {}
  const status = mapStatus(event, obj(r.status).alias || r.status_alias || '')

  const itens = lista(r.items).map((it: any) => {
    const sku = obj(it.sku)
    const nome = it.name || it.title || sku.title || obj(it.product).name || 'Produto'
    const codigo = (typeof it.sku === 'string' ? it.sku : sku.sku) || it.item_sku || null
    const qtd = Math.max(1, Math.round(num(it.quantity) || 1))
    const preco = num(it.price ?? it.price_sale ?? sku.price_discount ?? sku.price_sale)
    return { produto_nome: String(nome), sku: codigo, quantidade: qtd, preco_unit: r2(preco) }
  })

  const src = String(r.utm_source || '').toLowerCase()
  const ehVitta = itens.some((i) => /vitta/i.test(i.produto_nome) || /^gold_/i.test(i.sku || ''))
  const canal = /vitta/.test(src) ? 'site_vittagold' : /lebelle|le-belle/.test(src) ? 'site_lebelle' : ehVitta ? 'site_vittagold' : 'site_lebelle'

  const frete = num(r.value_shipment)
  const total = num(r.value_total)
  const desconto = num(r.value_discount)
  // Valor dos produtos já com desconto e sem frete (é o que a Yampi efetivamente cobrou pelos produtos)
  const valorProdutos = total > 0 ? Math.max(total - frete, 0) : Math.max(num(r.value_products) - desconto, 0)

  const cli = obj(r.customer)
  const cliente = cli.name || [cli.first_name, cli.last_name].filter(Boolean).join(' ') || null
  const criado = r.created_at?.date || obj(r.dates).created_at?.date || r.date || payload.time
  const dataVenda = criado ? new Date(String(criado).replace(' ', 'T').slice(0, 19) + '-03:00').toISOString() : new Date().toISOString()

  return {
    venda: {
      canal,
      origem: origemFromUtm(r.utm_source, r.utm_medium),
      external_id: String(r.id ?? ''),
      numero: r.number != null ? String(r.number) : null,
      data_venda: dataVenda,
      status,
      cliente_nome: cliente,
      valor_produtos: r2(valorProdutos),
      desconto: r2(desconto),
      frete: r2(frete),
      total: r2(total),
      cupom: cupomDo(r),
      utm_source: r.utm_source || null,
      utm_medium: r.utm_medium || null,
      utm_campaign: r.utm_campaign || null,
      observacao: 'Importado automaticamente da Yampi',
      raw: semDadosPessoais(payload),
    },
    itens,
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Grupo Le Belle · webhook Yampi ativo', { status: 200 })

  const body = await req.text()
  if (!(await assinaturaOk(body, req.headers.get('x-yampi-hmac-sha256')))) {
    console.error('Assinatura inválida ou segredo GLB_YAMPI_WEBHOOK_SECRET não configurado.')
    return new Response('Invalid signature', { status: 401 })
  }

  let payload: any
  try { payload = JSON.parse(body) } catch { return new Response('Invalid JSON', { status: 400 }) }

  const event = String(payload.event || '')
  if (!event.startsWith('order.') || !payload.resource?.id) return new Response('OK (ignorado)', { status: 200 })

  try {
    const { venda, itens } = montarVenda(payload)

    // A Yampi não guarda as UTMs dos links de compra: buscamos a origem no clique em "Comprar"
    // feito pelo mesmo endereço de internet nas 24 h anteriores ao pedido.
    const ip = String(payload.resource?.ip || '').trim()
    if (!venda.utm_source && ip) {
      const quando = new Date(venda.data_venda).getTime()
      const { data: clique } = await supabase.from('glb_clicks').select('utm_source, utm_medium, utm_campaign')
        .eq('ip', ip).not('utm_source', 'is', null)
        .gte('criado_em', new Date(quando - 24 * 36e5).toISOString())
        .lte('criado_em', new Date(quando + 15 * 6e4).toISOString())
        .order('criado_em', { ascending: false }).limit(1).maybeSingle()
      if (clique) {
        venda.utm_source = clique.utm_source
        venda.utm_medium = clique.utm_medium
        venda.utm_campaign = clique.utm_campaign
        venda.origem = origemFromUtm(clique.utm_source, clique.utm_medium)
      }
    }

    // Não deixa um evento atrasado "despagar" uma venda que já está paga
    const { data: atual } = await supabase.from('glb_sales').select('id, status, canal')
      .eq('external_id', venda.external_id).in('canal', ['site_lebelle', 'site_vittagold']).maybeSingle()
    if (atual) {
      venda.canal = atual.canal
      if (atual.status === 'pago' && venda.status === 'pendente') venda.status = 'pago'
    }

    const { data: salvo, error } = await supabase.from('glb_sales')
      .upsert(venda, { onConflict: 'canal,external_id' }).select('id').single()
    if (error) throw error

    if (itens.length) {
      await supabase.from('glb_sale_items').delete().eq('sale_id', salvo.id)
      const { error: e2 } = await supabase.from('glb_sale_items').insert(itens.map((i) => ({ ...i, sale_id: salvo.id })))
      if (e2) console.error('Itens:', e2.message)
    }
    console.log(`Venda ${venda.numero} (${venda.canal}) → ${venda.status} · R$ ${venda.valor_produtos} · origem ${venda.origem}`)
    return new Response('OK', { status: 200 })
  } catch (e) {
    console.error('Erro ao gravar venda:', (e as Error).message, JSON.stringify(semDadosPessoais(payload)).slice(0, 4000))
    return new Response('OK (erro registrado)', { status: 200 })
  }
})

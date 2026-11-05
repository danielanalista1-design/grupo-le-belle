# Grupo Le Belle

Sistema de gestão de vendas, comissões, parceiros (revendedores e distribuidores) e creators da Le Belle Cosmetics e New Belle Vitta.

## Tecnologia
React + Vite + Tailwind CSS · Identidade: preto, prata e azul vivo · fonte do sistema da Apple (SF Pro), com Inter no Windows/Android · Supabase (mesmo projeto da Le Belle, tabelas com prefixo `glb_`) · Vercel.

## Como publicar (GitHub + Vercel)
1. Crie um repositório novo no GitHub chamado `grupo-le-belle` e envie esta pasta (sem `node_modules`, `dist` e `.env`).
2. Na Vercel: Add New › Project › importe o repositório. Framework: Vite.
3. Em Settings › Environment Variables, cadastre:
   - `VITE_SUPABASE_URL` = https://zyhgtevlqeoeizpzvyhg.supabase.co
   - `VITE_SUPABASE_ANON_KEY` = (a chave publicável que está no `.env.example`)
4. Deploy. Depois, no Supabase › Authentication › URL Configuration › Redirect URLs, adicione o endereço do sistema (ex.: `https://grupolebelle.vercel.app/**`). Sem isso, os links de confirmação de e-mail e de troca de senha não voltam para o sistema.

## Perfis
- **Sócio**: vê tudo. Daniel Silva (40%) e Fernando Barbosa (60%) são liberados automaticamente no primeiro login com os e-mails cadastrados.
- **Parceiro**: revendedor ou distribuidor. Cria conta, solicita acesso e é aprovado por um sócio (ou recebe convite por e-mail). Vê só o preço da própria categoria.
- **Creator**: cadastrado pelos sócios com cupom e e-mail. Vê só as vendas do próprio cupom e a comissão.

## Regras
- Divisão dos sócios: (valor dos produtos das vendas pagas − comissões de creators) × participação. Frete e taxas não entram.
- Creators: 15% sobre o valor dos produtos das vendas pagas com o cupom.
- Portal: pedido mínimo de 10 unidades. Revendedor com 100+ unidades no pedido paga preço de distribuidor (pode desligar em Configurações).
- Pedido do portal marcado como pago entra automaticamente nas vendas (canal Portal, origem Revenda).

## Canais de venda
- Site Le Belle e site Vitta Gold: automático pela Yampi. Função `glb-yampi-webhook` (código em `supabase/functions/`), URL
  `https://zyhgtevlqeoeizpzvyhg.supabase.co/functions/v1/glb-yampi-webhook`, eventos Pedido criado / Pedido aprovado / Status do pedido atualizado.
  Segredo `GLB_YAMPI_WEBHOOK_SECRET` em Supabase › Edge Functions › Secrets. O site de cada venda é identificado pela utm_source
  (site_vittagold / site_lebelle) ou, sem ela, pelo produto (nome com "Vitta" ou SKU GOLD_ = Vitta Gold). Origem vem das UTMs; cupom de creator vira origem Creator.
- Link de creator no site Vitta Gold: `https://SITE/?cupom=CODIGO` aplica o cupom no checkout e registra a venda para o creator.
- TikTok Shop, Mercado Livre e outros: Vendas › Importar planilha (CSV).
- Venda direta: Vendas › Lançar venda.

## Rodar no computador (opcional)
`npm install` · copie `.env.example` para `.env` · `npm run dev`

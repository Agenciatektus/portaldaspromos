# 01 — Plano do Projeto: Portal de Promos

## Visão Geral

Canal de ofertas multiplataforma com publicação automatizada via Claude Code.
Monetização por links de afiliado do **Mercado Livre** e **Shopee**.

---

## Objetivo Principal

Gerar renda passiva com afiliados em escala via conteúdo automatizado,
combinando vídeos curtos no YouTube e Instagram com notificações no WhatsApp.

---

## Canais de Distribuição

| Canal | Formato | Frequência ideal | Horário |
|-------|---------|-----------------|---------|
| YouTube Shorts | Vídeos até 60s | 2 a 3 por dia | 7h, 12h, 19h |
| Instagram Reels | Vídeos até 90s | 1 a 2 por dia | 12h, 18h |
| WhatsApp (grupo) | Texto + link | A cada publicação | Junto com post |

**Grupo atual:** Portal de Promos | Shopee e +
https://chat.whatsapp.com/LtTtjL5v2ih8jngwXsCBg2

---

## Plataformas de Afiliado

- **Mercado Livre Afiliados** — Tag: `agencia_tektus` (cookie API)
- **Amazon Associados** — SiteStripe (cookie API)
- **Shopee Affiliate Program** — GraphQL API (`SHOPEE_APP_ID` + `SHOPEE_SECRET`)

---

## Status Atual das Contas

| Conta | Status |
|-------|--------|
| n8n workflow ML → Planilha | ✅ Ativo |
| Google Sheets (planilha controle) | ✅ Ativo |
| Google Drive (pastas) | ✅ Ativo |
| Grupo WhatsApp | ✅ Ativo |
| Canal YouTube | ✅ Criado |
| Email Google dedicado ao canal | ✅ Criado |
| Instagram Profissional | ❌ Criar (Fase 3) |
| WhatsApp Business API | ❌ Criar (Fase 3) |

---

## Estrutura de Pastas no Google Drive

```
📁 Portal de Promos/                    (1iIGMQ6g3Fm4LX4CMhjRRxAgDVdDFgDBc)
├── 📁 Videos/                          (1JoLukfwsiVh3drI6eYLRFcEeOouMeKis)
│   ├── 📁 Aguardando Publicação/       (1aJbfW4Y2_yPR6sOvQvKLic_TrFy7Eitc)
│   └── 📁 Videos Publicados/           (1JCwz32cb1YnzFqQaNTH-2UP0dJUseP4N)
└── 📊 Planilha de Controle            (1QnaVL8xfbT8CO0cZPLpZMKxUc3FqfGX7zSHAX3499Ow)
```

---

## Regras de Conteúdo (Templates para IA)

### Eletrônicos
- **Título:** `🔥 {PRODUTO} com {DESC}% OFF | Oferta Relâmpago!`
- **Descrição:** `⚡ CORRE! {PRODUTO} por apenas R$ {PRECO}! Link: {LINK} #ofertas #eletrônicos`

### Casa/Cozinha
- **Título:** `😱 {PRODUTO} incrível — R$ {PRECO} só hoje!`
- **Descrição:** `🏠 Aproveite: {PRODUTO} com {DESC}% de desconto! {LINK}`

### Moda/Beleza
- **Título:** `✨ {PRODUTO} por R$ {PRECO}? Isso mesmo!`
- **Descrição:** `💄 {PRODUTO} com desconto imperdível! Garanta o seu: {LINK}`

### Regras gerais
- Sempre destacar % de desconto e preço atual no título
- Incluir CTAs claros: "Link na bio!", "Garanta o seu!", "Só hoje!"
- Hashtags fixas + hashtags do nicho do produto
- Nunca revelar o link afiliado diretamente — redirecionar para o grupo
- Descrição YouTube: link do grupo no topo, depois o link direto

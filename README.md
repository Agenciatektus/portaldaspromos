# Portal de Promos

Automação de marketing de afiliados para o grupo **"Portal de Promos | Shopee e +"**.

Detecta produtos em promoção, gera links afiliados, publica YouTube Shorts e envia vídeo com mensagem no grupo do WhatsApp — tudo automaticamente.

---

## O que faz

1. **Portal web** — cole o link do produto (ML/Amazon/Shopee) + link do vídeo no Drive → dados preenchidos automaticamente → adiciona à fila
2. **Cron job (30 min)** — verifica a planilha por entradas pendentes → baixa vídeo do Drive → sobe no YouTube → envia no WhatsApp → atualiza planilha → renomeia arquivo no Drive

---

## Plataformas suportadas

| Plataforma | Scraping | Link Afiliado |
|------------|----------|---------------|
| Mercado Livre | ✅ | ✅ Cookie API |
| Amazon | ✅ | ✅ SiteStripe |
| Shopee | ✅ JSON-LD | ✅ GraphQL API |

---

## Stack

- **Node.js** + Express — servidor web e cron
- **cheerio** + axios — scraping de produtos
- **googleapis** — Drive, Sheets, YouTube
- **Evolution API** — envio de vídeo no WhatsApp
- **node-cron** — agendamento

---

## Instalação

```bash
git clone https://github.com/Agenciatektus/portaldaspromos.git
cd portaldaspromos
npm install
cp .env.example .env
# Preencha as variáveis no .env
```

### Configurar credenciais Google

Coloque o JSON da sua conta de serviço (ou OAuth) em `credenciais/google_credentials.json`.

**YouTube OAuth** (uma vez):
```bash
npm run auth:youtube
# Copie o YOUTUBE_REFRESH_TOKEN gerado para o .env
```

**Drive OAuth** (uma vez — para renomear/mover arquivos):
```bash
npm run auth:drive
# Copie o DRIVE_REFRESH_TOKEN gerado para o .env
```

### Iniciar

```bash
npm start
# Portal web em http://localhost:3000
```

---

## Variáveis de ambiente

Veja [`.env.example`](.env.example) para a lista completa. Principais:

| Variável | Descrição |
|----------|-----------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `YOUTUBE_REFRESH_TOKEN` | Token de upload YouTube |
| `DRIVE_REFRESH_TOKEN` | Token para renomear/mover no Drive |
| `SPREADSHEET_ID` | ID da planilha de controle |
| `DRIVE_FOLDER_AGUARDANDO` | ID da pasta "Aguardando Publicação" |
| `DRIVE_FOLDER_PUBLICADOS` | ID da pasta "Videos Publicados" |
| `EVOLUTION_API_URL` | URL da instância Evolution API |
| `EVOLUTION_API_KEY` | API Key da Evolution |
| `WHATSAPP_INSTANCE` | Nome da instância WhatsApp |
| `WHATSAPP_GROUP_ID` | ID do grupo (`123...@g.us`) |
| `ML_AFFILIATE_COOKIE` | Cookie sessão Mercado Livre afiliados |
| `AMAZON_AFFILIATE_COOKIE` | Cookie sessão Amazon associados |
| `SHOPEE_APP_ID` / `SHOPEE_SECRET` | Credenciais API Shopee afiliados |

---

## Planilha — Aba "Vídeos" (colunas A:N)

| Col | Campo | Descrição |
|-----|-------|-----------|
| A | NOME_ARQUIVO | `{slug}-{plataforma}-{data}.mp4` |
| B | LINK_DRIVE | Link do vídeo no Google Drive |
| C | LINK_PRODUTO | URL do produto |
| D | TITULO_PRODUTO | Título scrapeado |
| E | PRECO | Preço atual |
| F | PRECO_ANTIGO | Preço antigo (opcional) |
| G | LINK_AFILIADO | Link afiliado gerado |
| H | PLATAFORMA | `mercadolivre` / `amazon` / `shopee` |
| I | CATEGORIA | Categoria do produto |
| J | STATUS | `Pendente` → `Postado` / `Erro` |
| K | LINK_YOUTUBE | URL do Short publicado |
| L | DATA_PUBLICACAO | Timestamp (horário Brasília) |
| M | TITULO_YOUTUBE | Título gerado para o YouTube |
| N | DESCRICAO | Descrição do produto (SEO) |

---

## Testes rápidos

```bash
npm run test:sheets      # verifica pendentes na planilha
npm run test:drive       # lista vídeos na pasta Aguardando
npm run test:whatsapp    # envia mensagem de teste no grupo
npm run test:metadata    # gera metadados de exemplo
```

---

## Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [01_Plano_Projeto.md](Documentos/01_Plano_Projeto.md) | Visão geral e canais |
| [02_IDs_e_Referencias.md](Documentos/02_IDs_e_Referencias.md) | IDs do Drive, Planilha, credenciais |
| [03_Analise_Workflow_n8n.md](Documentos/03_Analise_Workflow_n8n.md) | Fluxos n8n ativos |
| [04_Arquitetura_Claude_Code.md](Documentos/04_Arquitetura_Claude_Code.md) | Fluxo de publicação, frases WhatsApp, colunas planilha |
| [05_Roadmap.md](Documentos/05_Roadmap.md) | Fases e checklist |

---

## Deploy (Coolify)

O projeto inclui `Dockerfile` pronto para deploy. Configure as variáveis de ambiente no painel do Coolify e aponte para este repositório.

---

*Agência Tektus — 2026*

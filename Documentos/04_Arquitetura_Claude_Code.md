# 04 — Arquitetura do Portal de Promos (Implementação Real)

## Stack

| Componente | Tecnologia |
|------------|------------|
| Runtime | Node.js ≥ 18 |
| Web server | Express 4 |
| Scraping | axios + cheerio |
| Auth Google | OAuth 2.0 + googleapis |
| Metadados YouTube | Template local (sem Claude API) |
| WhatsApp | Evolution API (sendMedia base64) |
| Agendamento | node-cron (padrão: 30 min) |
| Config | .env + dotenv |

---

## Estrutura de Arquivos

```
Portal de Promos/
├── src/
│   ├── index.js          ← Ponto de entrada: inicia server + cron
│   ├── server.js         ← Express: GET /api/scrape, POST /api/publicar
│   ├── scraper.js        ← Scraping ML / Amazon / Shopee
│   ├── affiliate.js      ← Geração de link afiliado por plataforma
│   ├── sheets.js         ← Leitura e escrita na aba Vídeos
│   ├── drive.js          ← Download, rename, move no Google Drive
│   ├── youtube.js        ← Upload YouTube Shorts + OAuth
│   ├── claude.js         ← Geração de metadados via template local
│   ├── whatsapp.js       ← Envio de vídeo + mensagem no grupo
│   ├── auth_youtube.js   ← Script one-time: gera YOUTUBE_REFRESH_TOKEN
│   └── auth_drive.js     ← Script one-time: gera DRIVE_REFRESH_TOKEN
├── public/
│   └── index.html        ← Portal web de adição à fila
├── credenciais/          ← NÃO versionar (google_credentials.json, tokens)
├── logs/
│   └── app.log           ← Log de texto com timestamp (append)
├── n8n_workflows/        ← Fluxos n8n exportados (ML, Shopee)
├── .env                  ← Variáveis de ambiente (NUNCA versionar)
├── .env.example          ← Template público com todas as vars
├── Dockerfile
└── package.json
```

---

## Fluxo do Portal Web (adicionar à fila)

```
Usuário cola Link do Drive + Link do Produto
       ↓
GET /api/scrape?url=...
       ↓
scraper.js: detecta plataforma → scrape de título, preço, categoria, descrição
       ↓
Frontend: preenche formulário automaticamente
       ↓
Usuário revisa e submete → POST /api/publicar
       ↓
server.js: gerarNomeArquivo(titulo, plataforma) → "fritadeira-air-fryer-shopee-2026-03-14.mp4"
       ↓
affiliate.js: gerarLink(plataforma, url) → link afiliado (ou "" se não configurado)
       ↓
sheets.js: inserirNaFila → append linha na aba Vídeos com STATUS=Pendente
```

---

## Fluxo do Cron (publicação automática)

```
[node-cron: a cada CRON_INTERVAL_MINUTES (padrão 30)]
       ↓
sheets.js: getPendingVideos() → busca linhas com STATUS="Pendente" na aba Vídeos
       ↓ (para cada pendente)
index.js: extrairFileId(entry.linkDrive) → extrai fileId do link Google Drive
       ↓
claude.js: generateMetadata(produto) → título, descrição, hashtags (template local)
       ↓
drive.js: downloadVideo(fileId, localPath) → baixa MP4 para /tmp/portal-de-promos/
       ↓
youtube.js: uploadShort(localPath, metadata) → retorna URL do Short
       ↓
whatsapp.js: notifyNewShort({ videoPath, nomeProduto, preco, precoAntigo, desconto, linkAfiliado })
             → envia vídeo com legenda aleatória (750+ combinações) via Evolution API
       ↓
sheets.js: markAsPublished(rowIndex, youtubeUrl, tituloYoutube)
       ↓
drive.js: renameFile(fileId, nomeArquivo) → renomeia para "slug-plataforma-data.mp4"
drive.js: moveToPublished(fileId) → move para pasta Videos Publicados
       ↓
fs.unlinkSync(localPath) → deleta arquivo temporário
```

---

## Aba "Vídeos" na Planilha — Colunas A:N

| Col | Nome | Descrição |
|-----|------|-----------|
| A | NOME_ARQUIVO | `{slug}-{plataforma}-{data}.mp4` gerado pelo servidor |
| B | LINK_DRIVE | URL completa do arquivo no Google Drive |
| C | LINK_PRODUTO | URL original do produto (ML/Amazon/Shopee) |
| D | TITULO_PRODUTO | Título scrapeado |
| E | PRECO | Preço atual (ex: "R$ 189,90") |
| F | PRECO_ANTIGO | Preço antigo (ex: "R$ 289,90") — vazio se não disponível |
| G | LINK_AFILIADO | Link afiliado gerado — vazio se credenciais não configuradas |
| H | PLATAFORMA | `mercadolivre`, `amazon` ou `shopee` |
| I | CATEGORIA | Categoria real da plataforma (ou mapeada) |
| J | STATUS | `Pendente` → `Postado` ou `Erro` |
| K | LINK_YOUTUBE | URL do Short após publicação |
| L | DATA_PUBLICACAO | Timestamp da publicação (horário Brasília) |
| M | TITULO_YOUTUBE | Título gerado para o YouTube |
| N | DESCRICAO | Descrição do produto (SEO) |

---

## Convenção de Nome do Arquivo de Vídeo

**Gerado automaticamente pelo servidor** a partir do título do produto:

```
{slug-do-titulo}-{plataforma}-{data-iso}.mp4
```

**Exemplos:**
```
fritadeira-air-fryer-mondial-4l-shopee-2026-03-14.mp4
fone-bluetooth-jbl-tune-510bt-mercadolivre-2026-03-14.mp4
tenis-nike-revolution-6-amazon-2026-03-14.mp4
```

O arquivo é renomeado no Drive para este padrão **após** a publicação bem-sucedida.

---

## Geração de Link Afiliado

| Plataforma | Método | Credencial necessária |
|------------|--------|-----------------------|
| Mercado Livre | POST `/affiliate-program/api/v2/affiliates/createLink` | `ML_AFFILIATE_COOKIE` |
| Amazon | GET SiteStripe `/associates/sitestripe/getShortUrl` | `AMAZON_AFFILIATE_COOKIE` |
| Shopee | GraphQL `productOfferV2` com HMAC-SHA256 | `SHOPEE_APP_ID` + `SHOPEE_SECRET` |

Se a credencial não estiver configurada, retorna `""` (campo vazio na planilha) — **nunca usa a URL original como afiliado**.

---

## Mensagem WhatsApp — Variações Aleatórias

A mensagem é composta por 4 blocos sorteados aleatoriamente a cada envio:

| Bloco | Opções | Exemplo |
|-------|--------|---------|
| Cabeçalho | 6 | `🚨 *ALERTA DE PROMOÇÃO!* 🚨` |
| Preço (com desconto) | 5 | `😱 33% de desconto?! Tá de brincadeira!` |
| Preço (sem desconto) | 5 | `💸 Por apenas R$ 189,90` |
| CTA (com link afiliado) | 5 | `🛒 Garanta antes que acabe...` |
| Encerramento | 5 | `⚡ Corre que oferta não espera!` |

**Total de combinações:** 6 × 5 × 5 × 5 = **750 variações**

---

## Plataformas Suportadas

| Plataforma | Scraping | Afiliado | Categoria |
|------------|----------|----------|-----------|
| Mercado Livre | ✅ cheerio | ✅ cookie API | Mapeada do breadcrumb |
| Amazon | ✅ cheerio | ✅ SiteStripe | Mapeada do breadcrumb |
| Shopee | ✅ JSON-LD (Googlebot UA) | ✅ GraphQL API | Real (do JSON-LD) |

---

## WhatsApp — Evolution API

- Envia vídeo como `sendMedia` com base64 + legenda (`caption`)
- Requer instância conectada via QR code no painel da Evolution API
- Variável `WHATSAPP_GROUP_ID`: ID do grupo no formato `{numero}@g.us`
- Utilitários disponíveis: `listGroups()`, `checkConnection()`

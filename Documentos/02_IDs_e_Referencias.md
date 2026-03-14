# 02 — IDs e Referências do Projeto

> ⚠️ Este arquivo contém IDs sensíveis. Não compartilhar publicamente.

---

## Google Drive — Pastas

| Pasta | ID |
|-------|----|
| Projeto (raiz) | `1iIGMQ6g3Fm4LX4CMhjRRxAgDVdDFgDBc` |
| Videos (geral) | `1JoLukfwsiVh3drI6eYLRFcEeOouMeKis` |
| **Aguardando Publicação** | `1aJbfW4Y2_yPR6sOvQvKLic_TrFy7Eitc` |
| **Videos Publicados** | `1JCwz32cb1YnzFqQaNTH-2UP0dJUseP4N` |

---

## Google Sheets — Planilha de Controle

| Campo | Valor |
|-------|-------|
| **Spreadsheet ID** | `1QnaVL8xfbT8CO0cZPLpZMKxUc3FqfGX7zSHAX3499Ow` |
| URL | https://docs.google.com/spreadsheets/d/1QnaVL8xfbT8CO0cZPLpZMKxUc3FqfGX7zSHAX3499Ow |
| Aba Cat ML | `gid=0` |
| Aba Produtos ML | `gid=1660256884` |
| Aba VIDEOS | `gid=1924799001` |
| Aba REGRAS_CONTEUDO | ❌ A criar |

---

## Credenciais de Serviço

| Credencial | Valor |
|------------|-------|
| **Service Account** | `n8n-sheets-access@n8n-api-connections-462918.iam.gserviceaccount.com` |
| **Tag Afiliado ML** | `agencia_tektus` |
| **WhatsApp Grupo (link convite)** | https://chat.whatsapp.com/LtTtjL5v2ih8jngwXsCBg2 |
| **WhatsApp Group ID (Evolution API)** | `120363406286033900@g.us` |
| **n8n WhatsApp node** | `n8n-nodes-evolution-api.evolutionApi` (community node) |

---

## Estrutura das Abas da Planilha

### Aba "Cat ML" (`gid=0`) — categorias ativas para scraping

| Coluna | Nome |
|--------|------|
| — | LINK (URL da página de categoria no Mercado Livre) |
| — | STATUS (`Ativo` / `Inativo`) |
| — | CATEGORIAS (nome ex: "Eletrônicos", "Casa/Cozinha") |

> O n8n filtra STATUS=Ativo e scrapa cada URL. Máximo 15 produtos por categoria.

### Aba "Produtos ML" (`gid=1660256884`) — produtos scraped, preenchida pelo n8n

| Coluna | Nome | Origem |
|--------|------|--------|
| A | TITULO | CSS `.poly-component__title` |
| B | IMAGEM | CSS `img.poly-component__picture[src]` |
| C | LINK PRODUTO | CSS `.poly-component__title[href]` |
| D | LINK AFILIADO | API ML → `urls[0].short_url` (tag: `agencia_tektus`) |
| E | PREÇO ATUAL | CSS `.poly-price__current .andes-money-amount` |
| F | PREÇO ANTIGO | CSS `s.andes-money-amount--previous` |
| G | PROMO | CSS `.poly-price__current` (texto completo) |
| H | CATEGORIA | Campo `CATEGORIAS` da aba Cat ML |
| I | ENVIADO | `FALSE` ao criar → `true` após envio WhatsApp |

> **Atenção:** O cookie do ML expira a cada 2-4 semanas. Sintoma: `LINK AFILIADO` vem vazio. Renovar manualmente no node "Edit Fields" do workflow BUSCAR_PROMO_ML.

### Aba "VIDEOS" — fila de publicação YouTube (a criar)

**Linha 1 = cabeçalho. Linha 2 em diante = um vídeo por linha.**

| Coluna | Nome | Quem preenche |
|--------|------|---------------|
| A | NOME_ARQUIVO | Usuário (ex: `fritadeira-airfryer.mp4`) |
| B | TITULO_PRODUTO | Usuário |
| C | PRECO | Usuário (ex: `R$ 199,90`) |
| D | PRECO_ANTIGO | Usuário (opcional) |
| E | LINK_AFILIADO | Usuário |
| F | PLATAFORMA | Usuário (`ML` / `Amazon` / `Shopee`) |
| G | CATEGORIA | Usuário (ex: `Casa/Cozinha`) |
| H | STATUS | **Código** (`pendente` → `publicado` / `erro`) |
| I | LINK_YOUTUBE | **Código** (preenchido após upload) |
| J | LINK_DRIVE | reservado |
| K | DATA_PUBLICACAO | **Código** |
| L | TITULO_YOUTUBE | **Código** (título gerado) |

> **Fluxo:** Usuário coloca o vídeo no Drive + preenche a linha na aba VIDEOS com STATUS=`pendente`.
> O sistema detecta automaticamente, faz upload no YouTube, notifica o WhatsApp e atualiza STATUS=`publicado`.

---

## Contas a Criar (com IDs após criação)

| Conta | Status | ID/Token |
|-------|--------|----------|
| Email Google do canal | ❌ Pendente | — |
| Canal YouTube | ❌ Pendente | — |
| YouTube Channel ID | ❌ Pendente | — |
| YouTube Client ID (OAuth) | ❌ Pendente | — |
| YouTube Client Secret | ❌ Pendente | — |
| YouTube Refresh Token | ❌ Pendente | — |
| WhatsApp Business Phone Number ID | ❌ Pendente | — |
| WhatsApp Access Token | ❌ Pendente | — |
| Anthropic API Key | ❌ Pendente | — |

---

## Arquivo .env do Claude Code (template)

```env
# Google
GOOGLE_SERVICE_ACCOUNT_KEY=./credentials.json
SPREADSHEET_ID=1QnaVL8xfbT8CO0cZPLpZMKxUc3FqfGX7zSHAX3499Ow
DRIVE_FOLDER_AGUARDANDO=1aJbfW4Y2_yPR6sOvQvKLic_TrFy7Eitc
DRIVE_FOLDER_PUBLICADOS=1JCwz32cb1YnzFqQaNTH-2UP0dJUseP4N

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# YouTube (OAuth — conta nova do canal)
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=

# WhatsApp Business Cloud API
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_GROUP_ID=
```

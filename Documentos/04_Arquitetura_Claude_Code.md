# 04 — Arquitetura do Claude Code (Automação de Publicação)

## Objetivo

Monitorar a pasta "Aguardando Publicação" no Google Drive,
processar vídeos automaticamente e publicar no YouTube + WhatsApp.

---

## Fluxo de Publicação

```
[Cron: a cada 30 min]
       ↓
drive.js: listar arquivos em DRIVE_FOLDER_AGUARDANDO
       ↓ (se encontrar novos .mp4)
sheets.js: extrair linha do nome do arquivo → buscar produto na planilha
       ↓
claude.js: gerar título, descrição, hashtags com base no produto
       ↓
drive.js: baixar arquivo .mp4 para pasta temporária local
       ↓
youtube.js: upload como YouTube Short com os metadados gerados
       ↓
whatsapp.js: enviar mensagem formatada no grupo
       ↓
sheets.js: marcar ENVIADO=TRUE, inserir URL YouTube, data
       ↓
drive.js: mover .mp4 para DRIVE_FOLDER_PUBLICADOS
       ↓
logs: registrar publicação em logs/publicacoes.json
```

---

## Convenção de Nome dos Arquivos de Vídeo

**Formato obrigatório:**
```
{LINHA_PLANILHA}_{slug-do-produto}.mp4
```

O número é a linha na aba **Produtos ML** da planilha.

**Exemplos:**
```
2_fone-bluetooth-jbl.mp4          → linha 2 da aba Produtos ML
7_fritadeira-air-fryer-mondial.mp4 → linha 7 da aba Produtos ML
15_tenis-nike-revolution.mp4       → linha 15 da aba Produtos ML
```

O Claude Code extrai o número, busca a linha na planilha
e usa todos os dados (título, preço, link afiliado, categoria).

---

## Estrutura de Arquivos do Projeto

```
canal-ofertas-claude/
├── index.js              ← Ponto de entrada + scheduler (node-cron)
├── drive.js              ← listarArquivos(), baixarVideo(), moverArquivo()
├── sheets.js             ← buscarProduto(linha), marcarEnviado(linha, youtubeUrl)
├── claude.js             ← gerarMetadados(produto) → título, descrição, hashtags
├── youtube.js            ← uploadShort(arquivo, metadados) → youtubeUrl
├── whatsapp.js           ← enviarMensagem(produto, youtubeUrl)
├── .env                  ← Variáveis de ambiente (NUNCA versionar no git)
├── credentials.json      ← JSON do Service Account Google
├── package.json
└── logs/
    └── publicacoes.json  ← Histórico de publicações
```

---

## Stack Técnica

| Componente | Tecnologia | Motivo |
|------------|------------|--------|
| Runtime | Node.js | Mesma stack do projeto anterior com Drive |
| Orquestrador | Claude Code | Executa scripts, monitora Drive, toma decisões |
| Auth Google | OAuth 2.0 + googleapis | Drive + Sheets + YouTube na mesma credencial |
| IA para metadados | Claude API (claude-sonnet-4) | Geração de títulos/descrições |
| Publicação Instagram | Instagram Graph API | Fase 3 |
| Grupo WhatsApp | Evolution API (inicial) | Mais rápido de configurar |
| Agendamento | node-cron | Polling a cada 30 minutos |
| Config | .env + dotenv | Segurança das credenciais |

---

## Prompt da IA (claude.js) — Template

```javascript
const prompt = `
Você é um especialista em marketing de ofertas.
Crie os metadados para um YouTube Short sobre esta oferta:

Produto: ${produto.TITULO}
Preço atual: ${produto['PREÇO ATUAL']}
Preço antigo: ${produto['PREÇO ANTIGO']}
Categoria: ${produto.CATEGORIA}
Link afiliado: ${produto['LINK AFILIADO']}

Regras:
- Título: máximo 100 caracteres, com emoji, destaque o desconto
- Descrição: máximo 500 caracteres, CTA claro, link afiliado, hashtags
- Tags: 10 a 15 tags relevantes separadas por vírgula

Retorne APENAS JSON válido:
{
  "titulo": "...",
  "descricao": "...",
  "tags": ["...", "..."]
}
`;
```

---

## Abas a Criar na Planilha

### Aba: VIDEOS

| Coluna | Conteúdo |
|--------|----------|
| ID | Número sequencial |
| ARQUIVO_DRIVE | Nome do arquivo (ex: 7_fritadeira.mp4) |
| LINHA_PRODUTO | Linha na aba Produtos ML |
| DATA_PUBLICACAO | Quando foi publicado |
| STATUS | Pendente / Publicado / Erro |
| URL_YOUTUBE | Link do vídeo publicado |
| URL_INSTAGRAM | Link do Reel (Fase 3) |

### Aba: REGRAS_CONTEUDO

| Coluna | Conteúdo |
|--------|----------|
| CATEGORIA | Nome da categoria |
| TEMPLATE_TITULO | Template com variáveis {PRODUTO}, {DESC}, {PRECO} |
| TEMPLATE_DESCRICAO | Template da descrição |
| HASHTAGS_FIXAS | Hashtags sempre incluídas |

---

## WhatsApp — Opções de Integração

### Opção 1: Evolution API (recomendada para início)
- Self-hosted, conecta via QR code
- Funciona com grupos normais do WhatsApp
- Sem aprovação, sem número dedicado
- Risco: instabilidades, contra ToS do WhatsApp
- **Bom para testar e validar**

### Opção 2: WhatsApp Business Cloud API (Meta)
- Requer número dedicado e aprovação (1-3 dias)
- Templates pré-aprovados obrigatórios
- Mais estável e oficial
- **Migrar para esta depois que o canal crescer**

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { detectarPlataforma, scrapeProduto } = require('./scraper');
const { gerarLink } = require('./affiliate');
const { inserirNaFila, getAllVideos, cancelarVideo, reprocessarVideo } = require('./sheets');
const { listNewVideos } = require('./drive');
const { checkConnection, listGroups, sendGroupMessage } = require('./whatsapp');
const { getPendingVideos } = require('./sheets');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

/**
 * Gera nome de arquivo legível a partir do título do produto
 * ex: "Fritadeira Air Fryer 4L" + "shopee" → "fritadeira-air-fryer-4l-shopee-2026-03-13.mp4"
 */
function gerarNomeArquivo(titulo, plataforma) {
  const slug = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .substring(0, 55);
  const data = new Date().toISOString().slice(0, 10);
  return `${slug}-${plataforma}-${data}.mp4`;
}

/**
 * Extrai o fileId de um link Google Drive
 * Formatos aceitos:
 *   https://drive.google.com/file/d/{ID}/view
 *   https://drive.google.com/open?id={ID}
 */
function extrairDriveFileId(driveLink) {
  const m1 = driveLink.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = driveLink.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}

/**
 * GET /api/scrape?url={produtoUrl}
 * Retorna dados pré-preenchidos para o frontend popular o formulário
 */
app.get('/api/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Parâmetro url obrigatório' });

  const plataforma = detectarPlataforma(url);
  if (!plataforma) {
    return res.status(400).json({ error: 'Plataforma não reconhecida. Use Mercado Livre, Amazon ou Shopee.' });
  }

  try {
    const dados = await scrapeProduto(plataforma, url);
    return res.json({ plataforma, ...dados });
  } catch (err) {
    console.error('[Server] Erro no scrape:', err.message);
    return res.status(500).json({ error: 'Falha ao buscar dados do produto', detalhe: err.message });
  }
});

/**
 * POST /api/publicar
 * Body: { driveLink, produtoLink, titulo, preco, precoAntigo, categoria }
 */
app.post('/api/publicar', async (req, res) => {
  const { driveLink, produtoLink, titulo, preco, precoAntigo = '', categoria = '', descricao = '' } = req.body;

  if (!driveLink || !produtoLink || !titulo || !preco) {
    return res.status(400).json({ error: 'Campos obrigatórios: driveLink, produtoLink, titulo, preco' });
  }

  const fileId = extrairDriveFileId(driveLink);
  if (!fileId) {
    return res.status(400).json({ error: 'Link do Drive inválido. Use o formato https://drive.google.com/file/d/{ID}/view' });
  }

  const plataforma = detectarPlataforma(produtoLink);
  if (!plataforma) {
    return res.status(400).json({ error: 'Plataforma não reconhecida. Use Mercado Livre, Amazon ou Shopee.' });
  }

  const nomeArquivo = gerarNomeArquivo(titulo, plataforma);

  let linkAfiliado = '';
  try {
    linkAfiliado = await gerarLink(plataforma, produtoLink);
  } catch (err) {
    console.warn('[Server] Falha ao gerar link afiliado:', err.message);
  }

  try {
    await inserirNaFila({
      nomeArquivo,
      linkDrive:   driveLink,
      linkProduto: produtoLink,
      titulo,
      preco,
      precoAntigo,
      linkAfiliado,
      plataforma,
      categoria,
      descricao,
    });
  } catch (err) {
    console.error('[Server] Erro ao inserir na planilha:', err.message);
    return res.status(500).json({ error: 'Falha ao inserir na planilha', detalhe: err.message });
  }

  return res.json({
    success: true,
    mensagem: 'Vídeo adicionado à fila com sucesso!',
    dados: { titulo, preco, linkAfiliado, plataforma },
  });
});

// ─── Rota do painel ─────────────────────────────────────────────────────────

app.get('/painel', (req, res) => {
  res.redirect('/');
});

// ─── API — Fila ───────────────────────────────────────────────────────────────

app.get('/api/fila', async (req, res) => {
  try {
    const todos = await getAllVideos();
    const { status } = req.query;
    const lista = status
      ? todos.filter(v => v.status.toLowerCase() === status.toLowerCase())
      : todos;
    return res.json(lista);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/fila/:rowIndex/reprocessar', async (req, res) => {
  try {
    await reprocessarVideo(parseInt(req.params.rowIndex, 10));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/fila/:rowIndex', async (req, res) => {
  try {
    await cancelarVideo(parseInt(req.params.rowIndex, 10));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── API — Status das integrações ────────────────────────────────────────────

const VARS_OBRIGATORIAS = [
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
  'YOUTUBE_REFRESH_TOKEN', 'DRIVE_REFRESH_TOKEN',
  'SPREADSHEET_ID', 'EVOLUTION_API_URL', 'EVOLUTION_API_KEY',
  'WHATSAPP_INSTANCE', 'WHATSAPP_GROUP_ID',
];
const VARS_AFILIADO = [
  'ML_AFFILIATE_COOKIE', 'ML_AFFILIATE_TAG',
  'AMAZON_AFFILIATE_COOKIE', 'SHOPEE_APP_ID', 'SHOPEE_SECRET',
];

app.get('/api/status', async (req, res) => {
  const [whatsappRes, sheetsRes, driveRes] = await Promise.allSettled([
    checkConnection(),
    getPendingVideos(),
    listNewVideos(),
  ]);

  const variaveis = {};
  [...VARS_OBRIGATORIAS, ...VARS_AFILIADO].forEach(v => {
    variaveis[v] = !!process.env[v];
  });

  return res.json({
    whatsapp: whatsappRes.status === 'fulfilled'
      ? { ok: true, estado: whatsappRes.value?.instance?.state || 'open' }
      : { ok: false, erro: whatsappRes.reason?.message },
    sheets: sheetsRes.status === 'fulfilled'
      ? { ok: true }
      : { ok: false, erro: sheetsRes.reason?.message },
    drive: driveRes.status === 'fulfilled'
      ? { ok: true }
      : { ok: false, erro: driveRes.reason?.message },
    variaveis,
  });
});

// ─── API — Cron ───────────────────────────────────────────────────────────────

// Importação lazy para evitar circular no momento do require
function getAutomation() {
  return require('./automation');
}

app.get('/api/cron/estado', (req, res) => {
  const { estado } = getAutomation();
  return res.json(estado);
});

app.post('/api/cron/disparar', (req, res) => {
  const { estado, executarCiclo } = getAutomation();
  if (estado.rodando) {
    return res.json({ iniciado: false, motivo: 'Já em execução' });
  }
  executarCiclo(); // fire-and-forget
  return res.json({ iniciado: true });
});

// ─── API — Logs ───────────────────────────────────────────────────────────────

app.get('/api/logs', (req, res) => {
  const logPath = path.join(__dirname, '..', 'logs', 'app.log');
  const linhas = parseInt(req.query.linhas || '200', 10);
  try {
    if (!fs.existsSync(logPath)) return res.json({ linhas: [] });
    const conteudo = fs.readFileSync(logPath, 'utf8');
    const todas = conteudo.split('\n').filter(Boolean);
    return res.json({ linhas: todas.slice(-linhas) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── API — WhatsApp ───────────────────────────────────────────────────────────

app.get('/api/whatsapp/grupos', async (req, res) => {
  try {
    const grupos = await listGroups();
    return res.json(grupos);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/whatsapp/teste', async (req, res) => {
  const mensagem = req.body?.mensagem || '✅ Teste de conexão do Portal de Promos';
  try {
    await sendGroupMessage(mensagem);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── Server ───────────────────────────────────────────────────────────────────

function startServer() {
  app.listen(PORT, () => {
    console.log(`[Server] Portal de Promos rodando em http://localhost:${PORT}`);
  });
}

module.exports = { startServer };

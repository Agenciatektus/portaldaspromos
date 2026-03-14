require('dotenv').config();
const express = require('express');
const path = require('path');
const { detectarPlataforma, scrapeProduto } = require('./scraper');
const { gerarLink } = require('./affiliate');
const { inserirNaFila } = require('./sheets');

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

function startServer() {
  app.listen(PORT, () => {
    console.log(`[Server] Portal de Promos rodando em http://localhost:${PORT}`);
  });
}

module.exports = { startServer };

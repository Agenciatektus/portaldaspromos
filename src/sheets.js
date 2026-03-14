require('dotenv').config();
const { google } = require('googleapis');

const { getAuthenticatedClient } = require('./youtube');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// Colunas da aba VIDEOS (0-indexed)
// A=NOME_ARQUIVO, B=LINK_DRIVE, C=LINK_PRODUTO, D=TITULO_PRODUTO,
// E=PRECO, F=PRECO_ANTIGO, G=LINK_AFILIADO, H=PLATAFORMA,
// I=CATEGORIA, J=STATUS, K=LINK_YOUTUBE, L=DATA_PUBLICACAO, M=TITULO_YOUTUBE, N=DESCRICAO
const COL = {
  NOME_ARQUIVO:   0,
  LINK_DRIVE:     1,
  LINK_PRODUTO:   2,
  TITULO_PRODUTO: 3,
  PRECO:          4,
  PRECO_ANTIGO:   5,
  LINK_AFILIADO:  6,
  PLATAFORMA:     7,
  CATEGORIA:      8,
  STATUS:         9,
  LINK_YOUTUBE:   10,
  DATA_PUBLICACAO:11,
  TITULO_YOUTUBE: 12,
  DESCRICAO:      13,
};

async function getSheetsClient() {
  const auth = await getAuthenticatedClient();
  return google.sheets({ version: 'v4', auth });
}

/**
 * Retorna todas as linhas da aba VIDEOS com STATUS = "pendente"
 * @returns {Promise<Array<{rowIndex, nomeArquivo, titulo, preco, precoAntigo, linkAfiliado, plataforma, categoria}>>}
 */
async function getPendingVideos() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Vídeos!A2:N1000',
  });
  const rows = res.data.values || [];
  const pending = [];
  rows.forEach((row, i) => {
    const status = (row[COL.STATUS] || '').toLowerCase().trim();
    if (status === 'pendente') {
      pending.push({
        rowIndex: i + 2,
        nomeArquivo: row[COL.NOME_ARQUIVO] || '',
        linkDrive: row[COL.LINK_DRIVE] || '',
        titulo: row[COL.TITULO_PRODUTO] || '',
        preco: row[COL.PRECO] || '',
        precoAntigo: row[COL.PRECO_ANTIGO] || '',
        linkAfiliado: row[COL.LINK_AFILIADO] || '',
        plataforma: row[COL.PLATAFORMA] || '',
        categoria: row[COL.CATEGORIA] || '',
      });
    }
  });
  return pending;
}

/**
 * Atualiza a linha na aba VIDEOS após publicação
 * @param {number} rowIndex - número da linha na planilha (1-indexed)
 * @param {string} youtubeUrl
 * @param {string} tituloYoutube
 */
async function markAsPublished(rowIndex, youtubeUrl, tituloYoutube) {
  const sheets = await getSheetsClient();
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  // Atualiza J (STATUS), K (LINK_YOUTUBE), L (DATA_PUBLICACAO), M (TITULO_YOUTUBE)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Vídeos!J${rowIndex}:M${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['Postado', youtubeUrl, now, tituloYoutube]],
    },
  });
  console.log(`[Sheets] Linha ${rowIndex} marcada como publicada: ${youtubeUrl}`);
}

/**
 * Marca a linha com erro na aba VIDEOS
 * @param {number} rowIndex
 * @param {string} errorMsg
 */
async function markAsError(rowIndex, errorMsg) {
  const sheets = await getSheetsClient();
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  // Atualiza J (STATUS), L (DATA_PUBLICACAO)
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `Vídeos!J${rowIndex}:L${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['Erro', '', now]],
    },
  });
  console.log(`[Sheets] Linha ${rowIndex} marcada como Erro: ${errorMsg}`);
}

/**
 * Calcula o percentual de desconto entre preço antigo e atual
 * @param {string|number} precoAtual
 * @param {string|number} precoAntigo
 * @returns {string} ex: "33%" ou "" se não aplicável
 */
function calcularDesconto(precoAtual, precoAntigo) {
  const atual = parseFloat(String(precoAtual).replace(/[^\d,]/g, '').replace(',', '.'));
  const antigo = parseFloat(String(precoAntigo).replace(/[^\d,]/g, '').replace(',', '.'));
  if (!antigo || antigo <= atual) return '';
  return `${Math.round(((antigo - atual) / antigo) * 100)}%`;
}

/**
 * Insere uma nova linha na aba Vídeos com STATUS=Pendente
 * @param {Object} dados
 * @param {string} dados.nomeArquivo  - nome do arquivo MP4 (extraído do Drive link)
 * @param {string} dados.titulo
 * @param {string} dados.preco
 * @param {string} dados.precoAntigo
 * @param {string} dados.linkAfiliado
 * @param {string} dados.plataforma
 * @param {string} dados.categoria
 * @param {string} dados.linkDrive    - URL do arquivo no Google Drive
 * @param {string} dados.linkProduto  - URL do produto (ML/Amazon/Shopee)
 */
async function inserirNaFila(dados) {
  const sheets = await getSheetsClient();
  const { nomeArquivo, linkDrive, linkProduto, titulo, preco, precoAntigo, linkAfiliado, plataforma, categoria, descricao = '' } = dados;
  // A=NOME_ARQUIVO, B=LINK_DRIVE, C=LINK_PRODUTO, D=TITULO_PRODUTO,
  // E=PRECO, F=PRECO_ANTIGO, G=LINK_AFILIADO, H=PLATAFORMA, I=CATEGORIA, J=STATUS,
  // K=LINK_YOUTUBE, L=DATA_PUBLICACAO, M=TITULO_YOUTUBE, N=DESCRICAO
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Vídeos!A:N',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[nomeArquivo, linkDrive || '', linkProduto || '', titulo, preco, precoAntigo, linkAfiliado, plataforma, categoria, 'Pendente', '', '', '', descricao]],
    },
  });
  console.log(`[Sheets] Vídeo inserido na fila: ${titulo}`);
}

module.exports = { getPendingVideos, markAsPublished, markAsError, calcularDesconto, inserirNaFila };

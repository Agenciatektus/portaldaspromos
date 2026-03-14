require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const { getAuthenticatedClient } = require('./youtube');

const FOLDER_AGUARDANDO = process.env.DRIVE_FOLDER_AGUARDANDO;
const FOLDER_PUBLICADOS = process.env.DRIVE_FOLDER_PUBLICADOS;

const CREDENTIALS_PATH = path.join(__dirname, '..', 'credenciais', 'google_credentials.json');

async function getDriveClient() {
  const auth = await getAuthenticatedClient();
  return google.drive({ version: 'v3', auth });
}

/** Cliente Drive autenticado como agenciatektus@gmail.com (dono dos arquivos) */
function getDriveOwnerClient() {
  const raw = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const creds = raw.web || raw.installed;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || creds.client_id,
    process.env.GOOGLE_CLIENT_SECRET || creds.client_secret,
    'http://localhost:8082/callback'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.DRIVE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Lista vídeos MP4 na pasta "Aguardando Publicação"
 * @returns {Promise<Array<{id, name, size}>>}
 */
async function listNewVideos() {
  const drive = await getDriveClient();
  const res = await drive.files.list({
    q: `'${FOLDER_AGUARDANDO}' in parents and mimeType='video/mp4' and trashed=false`,
    fields: 'files(id, name, size, createdTime)',
    orderBy: 'createdTime asc',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return res.data.files || [];
}

/**
 * Busca um vídeo na pasta pelo nome exato
 * @param {string} filename
 * @returns {Promise<{id, name}|null>}
 */
async function findVideoByName(filename) {
  const drive = await getDriveClient();
  const safeName = filename.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${FOLDER_AGUARDANDO}' in parents and name='${safeName}' and trashed=false`,
    fields: 'files(id, name, size)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  return res.data.files?.[0] || null;
}

/**
 * Faz download de um vídeo do Drive para disco local
 * @param {string} fileId
 * @param {string} localPath - caminho absoluto onde salvar
 */
async function downloadVideo(fileId, localPath) {
  const drive = await getDriveClient();
  const dest = fs.createWriteStream(localPath);
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  );
  return new Promise((resolve, reject) => {
    res.data
      .on('end', () => resolve(localPath))
      .on('error', reject)
      .pipe(dest);
  });
}

/**
 * Renomeia um arquivo no Drive
 * @param {string} fileId
 * @param {string} novoNome
 */
async function renameFile(fileId, novoNome) {
  const drive = process.env.DRIVE_REFRESH_TOKEN ? getDriveOwnerClient() : await getDriveClient();
  await drive.files.update({
    fileId,
    supportsAllDrives: true,
    requestBody: { name: novoNome },
    fields: 'id, name',
  });
  console.log(`[Drive] Arquivo ${fileId} renomeado para: ${novoNome}`);
}

/**
 * Move um vídeo para a pasta "Videos Publicados"
 * @param {string} fileId
 */
async function moveToPublished(fileId) {
  const drive = process.env.DRIVE_REFRESH_TOKEN ? getDriveOwnerClient() : await getDriveClient();
  const file = await drive.files.get({
    fileId,
    fields: 'parents',
    supportsAllDrives: true,
  });
  const parents = file.data.parents;
  const previousParents = (parents && parents.length > 0 ? parents : [FOLDER_AGUARDANDO]).join(',');
  await drive.files.update({
    fileId,
    addParents: FOLDER_PUBLICADOS,
    removeParents: previousParents,
    supportsAllDrives: true,
    fields: 'id, parents',
  });
  console.log(`[Drive] Vídeo ${fileId} movido para Publicados`);
}

module.exports = { listNewVideos, findVideoByName, downloadVideo, moveToPublished, renameFile };

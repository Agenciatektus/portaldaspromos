require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const TOKEN_PATH = path.join(__dirname, '..', 'credenciais', 'youtube_token.json');
const CREDENTIALS_PATH = path.join(__dirname, '..', 'credenciais', 'google_credentials.json');

// Porta do servidor local para OAuth callback — mesmo padrão do portaldachina-manager
const OAUTH_PORT = 8081;
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}/callback`;

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/spreadsheets',
];

function loadCredentials() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(
      `Credenciais OAuth não encontradas em ${CREDENTIALS_PATH}.\n` +
      'Baixe o arquivo JSON do Google Cloud Console → Credenciais → OAuth 2.0'
    );
  }
  const raw = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  // Suporta formato "web" ou "installed"
  return raw.web || raw.installed;
}

function createOAuth2Client() {
  const creds = loadCredentials();
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || creds.client_id,
    process.env.GOOGLE_CLIENT_SECRET || creds.client_secret,
    REDIRECT_URI
  );
}

/**
 * Carrega token salvo ou inicia fluxo OAuth interativo
 * Usa servidor HTTP local (porta 8081) para capturar o redirect — mesmo padrão do portaldachina-manager
 */
async function getAuthenticatedClient() {
  const oauth2Client = createOAuth2Client();

  // Se tiver refresh token no .env, usa diretamente
  if (process.env.YOUTUBE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
    return oauth2Client;
  }

  // Tenta carregar token salvo
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oauth2Client.setCredentials(token);
    // Atualiza se expirado
    if (token.expiry_date && token.expiry_date < Date.now()) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
      oauth2Client.setCredentials(credentials);
    }
    return oauth2Client;
  }

  // Fluxo OAuth manual com servidor local (evita MismatchingStateError no Windows com múltiplas contas Google)
  return await _fluxoOAuthManual(oauth2Client);
}

async function _fluxoOAuthManual(oauth2Client) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n[YouTube OAuth] Abra este URL no navegador:\n');
  console.log(authUrl);
  console.log('\nAguardando autorização na porta', OAUTH_PORT, '...\n');

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsed = url.parse(req.url, true);
        if (!parsed.pathname.includes('/callback') || !parsed.query.code) {
          res.end('Aguardando...');
          return;
        }

        const code = parsed.query.code;
        res.end('<h2>Autorização concedida! Pode fechar esta aba.</h2>');
        server.close();

        // Troca code por tokens sem verificar state (seguro para localhost)
        const tokenRes = await oauth2Client.getToken(code);
        const credentials = tokenRes.tokens;
        oauth2Client.setCredentials(credentials);

        // Salva token para próximas execuções
        fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));
        console.log('[YouTube OAuth] Token salvo em', TOKEN_PATH);
        console.log('[YouTube OAuth] Adicione ao .env: YOUTUBE_REFRESH_TOKEN=' + credentials.refresh_token);

        resolve(oauth2Client);
      } catch (err) {
        server.close();
        reject(err);
      }
    });
    server.listen(OAUTH_PORT, () => console.log(`[YouTube OAuth] Servidor rodando em http://localhost:${OAUTH_PORT}`));
    server.on('error', reject);
  });
}

/**
 * Faz upload de um vídeo como YouTube Short
 * @param {string} videoPath - caminho local do arquivo MP4
 * @param {Object} metadata
 * @param {string} metadata.title
 * @param {string} metadata.description
 * @param {string[]} metadata.tags
 * @returns {Promise<string>} URL do vídeo publicado
 */
async function uploadShort(videoPath, metadata) {
  const auth = await getAuthenticatedClient();
  const youtube = google.youtube({ version: 'v3', auth });

  console.log(`[YouTube] Iniciando upload: ${path.basename(videoPath)}`);

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: metadata.title.slice(0, 100),
        description: metadata.description.slice(0, 5000),
        tags: metadata.tags || [],
        categoryId: '26', // Howto & Style
        defaultLanguage: 'pt',
        defaultAudioLanguage: 'pt',
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: fs.createReadStream(videoPath),
    },
  });

  const videoId = res.data.id;
  const videoUrl = `https://www.youtube.com/shorts/${videoId}`;
  console.log(`[YouTube] Upload concluído: ${videoUrl}`);
  return videoUrl;
}

module.exports = { uploadShort, getAuthenticatedClient };

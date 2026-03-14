/**
 * Script de autorização OAuth para Google Drive (agenciatektus@gmail.com) — executar UMA VEZ
 * Uso: npm run auth:drive
 *
 * Após executar, copie o DRIVE_REFRESH_TOKEN gerado para o .env
 */
require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'credenciais', 'google_credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', 'credenciais', 'drive_token.json');
const OAUTH_PORT = 8082;
const REDIRECT_URI = `http://localhost:${OAUTH_PORT}/callback`;

const SCOPES = ['https://www.googleapis.com/auth/drive'];

(async () => {
  console.log('=== Autorização OAuth Drive (agenciatektus@gmail.com) ===\n');
  console.log('IMPORTANTE: Faça login com agenciatektus@gmail.com quando o navegador abrir.\n');

  const raw = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const creds = raw.web || raw.installed;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || creds.client_id,
    process.env.GOOGLE_CLIENT_SECRET || creds.client_secret,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('Abra este URL no navegador:\n');
  console.log(authUrl);
  console.log('\nAguardando autorização na porta', OAUTH_PORT, '...\n');

  await new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const parsed = url.parse(req.url, true);
        if (!parsed.pathname.includes('/callback') || !parsed.query.code) {
          res.end('Aguardando...');
          return;
        }

        const code = parsed.query.code;
        res.end('<h2>Autorização concluída! Pode fechar esta aba.</h2>');
        server.close();

        const tokenRes = await oauth2Client.getToken(code);
        const credentials = tokenRes.tokens;
        oauth2Client.setCredentials(credentials);

        fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2));

        console.log('\n✅ Autorização concluída!');
        console.log('\nAdicione ao .env:');
        console.log(`DRIVE_REFRESH_TOKEN=${credentials.refresh_token}`);

        resolve();
      } catch (err) {
        server.close();
        reject(err);
      }
    });
    server.listen(OAUTH_PORT, () => console.log(`Servidor rodando em http://localhost:${OAUTH_PORT}`));
    server.on('error', reject);
  });

  process.exit(0);
})();

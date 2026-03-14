/**
 * Script de autorização OAuth para YouTube — executar UMA VEZ
 * Uso: npm run auth:youtube
 *
 * Após executar, copie o YOUTUBE_REFRESH_TOKEN gerado para o .env
 */
require('dotenv').config();
const { getAuthenticatedClient } = require('./youtube');

(async () => {
  console.log('=== Autorização OAuth YouTube ===\n');
  try {
    const client = await getAuthenticatedClient();
    const creds = client.credentials;
    console.log('\n✅ Autorização concluída!');
    if (creds.refresh_token) {
      console.log('\nAdicione ao .env:');
      console.log(`YOUTUBE_REFRESH_TOKEN=${creds.refresh_token}`);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();

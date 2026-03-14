require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { startServer } = require('./server');

const { downloadVideo, moveToPublished, renameFile } = require('./drive');
const { getPendingVideos, markAsPublished, markAsError, calcularDesconto } = require('./sheets');
const { generateMetadata } = require('./claude');
const { uploadShort } = require('./youtube');
const { notifyNewShort } = require('./whatsapp');

const TEMP_DIR = path.join(os.tmpdir(), 'portal-de-promos');
const INTERVAL = parseInt(process.env.CRON_INTERVAL_MINUTES || '30', 10);

function log(msg) {
  const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync(path.join(__dirname, '..', 'logs', 'app.log'), line + '\n');
}

/**
 * Extrai fileId de um link do Google Drive
 * Suporta: /file/d/{ID}/view e ?id={ID}
 */
function extrairFileId(linkDrive) {
  const m1 = linkDrive.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = linkDrive.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}

async function processarVideo(entry) {
  log(`🎬 Processando: ${entry.nomeArquivo} (linha ${entry.rowIndex})`);

  // Extrai o fileId direto do link salvo na planilha
  const fileId = extrairFileId(entry.linkDrive);
  if (!fileId) {
    throw new Error(`LINK_DRIVE inválido ou ausente na linha ${entry.rowIndex}: "${entry.linkDrive}"`);
  }

  const localPath = path.join(TEMP_DIR, entry.nomeArquivo);

  try {
    // 1. Gera metadata com base nos dados preenchidos na aba VIDEOS
    const produto = {
      nome: entry.titulo,
      preco: entry.preco,
      preco_antigo: entry.precoAntigo,
      categoria: entry.categoria,
    };
    const metadata = generateMetadata(produto);
    log(`✍️  Título: ${metadata.title}`);

    // 2. Download do vídeo do Drive pelo fileId
    await downloadVideo(fileId, localPath);
    log(`⬇️  Vídeo baixado: ${localPath}`);

    // 3. Upload para YouTube
    const youtubeUrl = await uploadShort(localPath, metadata);
    log(`📺 YouTube: ${youtubeUrl}`);

    // 4. Envia vídeo com legenda no grupo WhatsApp
    await notifyNewShort({
      videoPath:   localPath,
      nomeProduto: entry.titulo,
      preco:       entry.preco,
      precoAntigo: entry.precoAntigo,
      desconto:    calcularDesconto(entry.preco, entry.precoAntigo),
      linkAfiliado: entry.linkAfiliado,
    });
    log(`💬 WhatsApp notificado`);

    // 5. Atualiza planilha (crítico)
    await markAsPublished(entry.rowIndex, youtubeUrl, metadata.title);

    // 6. Renomeia o arquivo no Drive para o nome organizado e move para Publicados (não-crítico)
    try {
      await renameFile(fileId, entry.nomeArquivo);
      await moveToPublished(fileId);
    } catch (driveErr) {
      log(`⚠️  Drive rename/move falhou (não crítico): ${driveErr.message}`);
    }
    log(`✅ Concluído: ${entry.titulo}`);

  } catch (err) {
    log(`❌ Erro ao processar ${entry.nomeArquivo}: ${err.message}`);
    console.error(err);
    await markAsError(entry.rowIndex, err.message).catch(() => {});
  } finally {
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  }
}

async function executarCiclo() {
  log('🔍 Verificando aba VIDEOS por entradas pendentes...');
  try {
    const pending = await getPendingVideos();
    if (pending.length === 0) {
      log('📭 Nenhum vídeo pendente encontrado.');
      return;
    }
    log(`📂 ${pending.length} vídeo(s) pendente(s)`);
    for (const entry of pending) {
      await processarVideo(entry);
      // Pausa entre uploads para evitar rate limiting
      await new Promise(r => setTimeout(r, 2000));
    }
  } catch (err) {
    log(`❌ Erro no ciclo: ${err.message}`);
    console.error(err);
  }
}

// Garante que os diretórios necessários existem
fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(path.join(__dirname, '..', 'logs'), { recursive: true });

// Inicia o servidor web
startServer();

log(`🚀 Portal de Promos iniciado — verificando a cada ${INTERVAL} minutos`);

// Executa imediatamente ao iniciar
executarCiclo();

// Agenda execuções periódicas
cron.schedule(`*/${INTERVAL} * * * *`, executarCiclo);

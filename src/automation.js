require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');

const { downloadVideo, moveToPublished, renameFile } = require('./drive');
const { getPendingVideos, markAsPublished, markAsError, calcularDesconto } = require('./sheets');
const { generateMetadata } = require('./claude');
const { uploadShort } = require('./youtube');
const { notifyNewShort } = require('./whatsapp');

const TEMP_DIR = path.join(os.tmpdir(), 'portal-de-promos');
const INTERVAL = parseInt(process.env.CRON_INTERVAL_MINUTES || '30', 10);

// Estado do cron — acessível via API
const estado = {
  rodando: false,
  ultimaExecucao: null,
  proximaExecucao: null,
  ultimoResultado: null,
};

function log(msg) {
  const ts = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(path.join(__dirname, '..', 'logs', 'app.log'), line + '\n');
  } catch (_) {}
}

function extrairFileId(linkDrive) {
  const m1 = linkDrive.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) return m1[1];
  const m2 = linkDrive.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m2) return m2[1];
  return null;
}

function calcularProximaExecucao() {
  const agora = new Date();
  agora.setMinutes(agora.getMinutes() + INTERVAL, 0, 0);
  return agora.toISOString();
}

async function processarVideo(entry) {
  log(`🎬 Processando: ${entry.nomeArquivo} (linha ${entry.rowIndex})`);

  const fileId = extrairFileId(entry.linkDrive);
  if (!fileId) {
    throw new Error(`LINK_DRIVE inválido ou ausente na linha ${entry.rowIndex}: "${entry.linkDrive}"`);
  }

  const localPath = path.join(TEMP_DIR, entry.nomeArquivo);

  try {
    const produto = {
      nome: entry.titulo,
      preco: entry.preco,
      preco_antigo: entry.precoAntigo,
      categoria: entry.categoria,
    };
    const metadata = generateMetadata(produto);
    log(`✍️  Título: ${metadata.title}`);

    await downloadVideo(fileId, localPath);
    log(`⬇️  Vídeo baixado: ${localPath}`);

    const youtubeUrl = await uploadShort(localPath, metadata);
    log(`📺 YouTube: ${youtubeUrl}`);

    await notifyNewShort({
      videoPath:    localPath,
      nomeProduto:  entry.titulo,
      preco:        entry.preco,
      precoAntigo:  entry.precoAntigo,
      desconto:     calcularDesconto(entry.preco, entry.precoAntigo),
      linkAfiliado: entry.linkAfiliado,
    });
    log(`💬 WhatsApp notificado`);

    await markAsPublished(entry.rowIndex, youtubeUrl, metadata.title);

    try {
      await renameFile(fileId, entry.nomeArquivo);
      await moveToPublished(fileId);
    } catch (driveErr) {
      log(`⚠️  Drive rename/move falhou (não crítico): ${driveErr.message}`);
    }

    log(`✅ Concluído: ${entry.titulo}`);
    return { ok: true };

  } catch (err) {
    log(`❌ Erro ao processar ${entry.nomeArquivo}: ${err.message}`);
    console.error(err);
    await markAsError(entry.rowIndex, err.message).catch(() => {});
    return { ok: false, erro: err.message };
  } finally {
    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  }
}

async function executarCiclo() {
  if (estado.rodando) {
    log('⏩ Ciclo já em execução, ignorando...');
    return;
  }

  estado.rodando = true;
  const inicio = Date.now();
  log('🔍 Verificando aba VIDEOS por entradas pendentes...');

  let processados = 0;
  let erros = 0;

  try {
    const pending = await getPendingVideos();
    if (pending.length === 0) {
      log('📭 Nenhum vídeo pendente encontrado.');
    } else {
      log(`📂 ${pending.length} vídeo(s) pendente(s)`);
      for (const entry of pending) {
        const resultado = await processarVideo(entry);
        if (resultado.ok) processados++; else erros++;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  } catch (err) {
    log(`❌ Erro no ciclo: ${err.message}`);
    console.error(err);
    erros++;
  } finally {
    estado.rodando = false;
    estado.ultimaExecucao = new Date().toISOString();
    estado.proximaExecucao = calcularProximaExecucao();
    estado.ultimoResultado = {
      processados,
      erros,
      duracaoMs: Date.now() - inicio,
    };
    log(`🏁 Ciclo encerrado — ${processados} processados, ${erros} erros`);
  }
}

// Garante diretório temporário
fs.mkdirSync(TEMP_DIR, { recursive: true });
fs.mkdirSync(path.join(__dirname, '..', 'logs'), { recursive: true });

module.exports = { executarCiclo, estado, INTERVAL };

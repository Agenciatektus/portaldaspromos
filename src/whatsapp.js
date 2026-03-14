require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE = process.env.WHATSAPP_INSTANCE;
const GROUP_ID = process.env.WHATSAPP_GROUP_ID;

function getHeaders() {
  return { apikey: API_KEY, 'Content-Type': 'application/json' };
}

function sortear(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const CABECALHOS = [
  '🚨 *ALERTA DE PROMOÇÃO!* 🚨',
  '🔥 *OFERTA QUE NÃO DÁ PRA IGNORAR!*',
  '💥 *OLHA O PREÇO DISSO!*',
  '👀 *VOCÊ VAI QUERER VER ISSO*',
  '🎯 *ACHAMOS UMA PECHINCHA!*',
  '⚡ *PREÇO CAIU, CORRE!*',
];

const FRASES_DESCONTO = (desconto, precoAntigo, preco) => [
  `🤑 *${desconto} OFF — isso não é erro de preço, é sorte!*\n~~${precoAntigo}~~ ➡️ *${preco}*`,
  `😱 *${desconto} de desconto?! Tá de brincadeira!*\n~~${precoAntigo}~~ por apenas *${preco}*`,
  `🏷️ *${desconto} OFF — o gerente não sabe que fez isso*\n~~${precoAntigo}~~ ➡️ *${preco}*`,
  `💸 *Jogaram ${desconto} fora no preço. Literalmente.*\n~~${precoAntigo}~~ e agora *${preco}*`,
  `🎉 *${desconto} de desconto! Seu cartão agradece*\nDe ~~${precoAntigo}~~ por *${preco}*`,
];

const FRASES_SEM_DESCONTO = (preco) => [
  `💸 Por apenas *${preco}*\n_(seu bolso agradece, e muito)_`,
  `💰 *${preco}* — tá barato demais pra passar batido`,
  `🏷️ *${preco}* — pergunta pro seu vizinho se ele viu mais barato`,
  `✅ Por *${preco}* essa oferta precisa sair hoje`,
  `📉 *${preco}* — o preço tá no chão, e o produto é top`,
];

const CTAS = (link) => [
  `🛒 *Garanta antes que acabe* _(ou antes que alguém te conte que já comprou)_ 😅\n${link}`,
  `👇 *Vai lá antes que o estoque acabe:*\n${link}`,
  `🏃 *Corre que o preço pode subir a qualquer momento:*\n${link}`,
  `🎁 *Compra agora e agradece depois:*\n${link}`,
  `🔗 *Clica aqui antes que o desconto suma:*\n${link}`,
];

const ENCERRAMENTOS = [
  '⚡ _Corre que oferta não espera!_',
  '🕐 _Por tempo limitado — vai que acaba!_',
  '🚀 _Quem viu, viu. Quem não viu, se arrependeu._',
  '🔔 _Salva essa mensagem antes de perder a oferta!_',
  '💨 _Rápido, rápido — estoque limitado!_',
];

/**
 * Envia mensagem de texto para o grupo
 * @param {string} text
 */
async function sendGroupMessage(text) {
  if (!GROUP_ID) throw new Error('WHATSAPP_GROUP_ID não configurado no .env');
  const res = await axios.post(
    `${BASE_URL}/message/sendText/${INSTANCE}`,
    { number: GROUP_ID, text },
    { headers: getHeaders() }
  );
  console.log(`[WhatsApp] Mensagem enviada ao grupo: ${GROUP_ID}`);
  return res.data;
}

/**
 * Envia vídeo com legenda para o grupo
 * @param {string} videoPath - caminho local do arquivo MP4
 * @param {string} caption - texto da legenda
 */
async function sendGroupVideo(videoPath, caption) {
  if (!GROUP_ID) throw new Error('WHATSAPP_GROUP_ID não configurado no .env');

  const videoBase64 = fs.readFileSync(videoPath).toString('base64');
  const fileName = path.basename(videoPath);

  const res = await axios.post(
    `${BASE_URL}/message/sendMedia/${INSTANCE}`,
    {
      number: GROUP_ID,
      mediatype: 'video',
      mimetype: 'video/mp4',
      fileName,
      caption,
      media: videoBase64,
    },
    { headers: getHeaders() }
  );
  console.log(`[WhatsApp] Vídeo enviado ao grupo: ${GROUP_ID}`);
  return res.data;
}

/**
 * Envia o vídeo do produto diretamente no grupo com legenda
 * @param {Object} params
 * @param {string} params.videoPath - caminho local do MP4
 * @param {string} params.nomeProduto
 * @param {string} params.preco
 * @param {string} params.desconto
 * @param {string} params.linkAfiliado
 */
async function notifyNewShort({ videoPath, nomeProduto, preco, precoAntigo, desconto, linkAfiliado }) {
  const blocoPreco = (desconto && precoAntigo)
    ? sortear(FRASES_DESCONTO(desconto, precoAntigo, preco))
    : sortear(FRASES_SEM_DESCONTO(preco));

  let caption =
    `${sortear(CABECALHOS)}\n\n` +
    `📦 *${nomeProduto}*\n\n` +
    `${blocoPreco}`;

  if (linkAfiliado) {
    caption += `\n\n${sortear(CTAS(linkAfiliado))}`;
  }

  caption += `\n\n${sortear(ENCERRAMENTOS)}`;

  return sendGroupVideo(videoPath, caption);
}

/**
 * Lista grupos disponíveis na instância
 */
async function listGroups() {
  const res = await axios.get(
    `${BASE_URL}/group/fetchAllGroups/${INSTANCE}?getParticipants=false`,
    { headers: getHeaders() }
  );
  return res.data;
}

/**
 * Verifica se a instância está conectada
 */
async function checkConnection() {
  const res = await axios.get(
    `${BASE_URL}/instance/connectionState/${INSTANCE}`,
    { headers: getHeaders() }
  );
  return res.data;
}

module.exports = { sendGroupMessage, sendGroupVideo, notifyNewShort, listGroups, checkConnection };

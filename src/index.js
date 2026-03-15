require('dotenv').config();
const cron = require('node-cron');
const { startServer } = require('./server');
const { executarCiclo, estado, INTERVAL } = require('./automation');

// Inicia o servidor web
startServer();

console.log(`[Index] 🚀 Portal de Promos iniciado — verificando a cada ${INTERVAL} minutos`);

// Executa imediatamente ao iniciar e calcula próxima execução
estado.proximaExecucao = new Date(Date.now() + INTERVAL * 60 * 1000).toISOString();
executarCiclo();

// Agenda execuções periódicas
cron.schedule(`*/${INTERVAL} * * * *`, () => {
  estado.proximaExecucao = new Date(Date.now() + INTERVAL * 60 * 1000).toISOString();
  executarCiclo();
});

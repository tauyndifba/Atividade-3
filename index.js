// index.js - Arquivo principal do sistema de chat distribuído
const multicast = require('./src/multicast');
const replication = require('./src/replication');
const mutualExclusion = require('./src/mutualExclusion');
const faultTolerance = require('./src/faultTolerance');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Configuração
const NODE_ID = process.argv[2] || Math.floor(Math.random() * 1000);
const dataDir = path.join(__dirname, `node_${NODE_ID}_data`);

// Garantir que o diretório de dados exista
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Estado global do sistema
const state = {
  nodeId: NODE_ID,
  messageLog: [],
  dataDir: dataDir,
  hasToken: NODE_ID === '1', // Nó 1 inicia com o token
  requestQueue: []
};

// Inicializar subsistemas
const socket = multicast.init(state);
replication.init(state);
mutualExclusion.init(state, socket);
faultTolerance.init(state, socket);

// Restaurar estado a partir do último checkpoint
faultTolerance.restoreFromCheckpoint(state);

// Iniciar intervalos para checkpoints e reconciliação
setInterval(() => faultTolerance.createCheckpoint(state), 10000); // checkpoint a cada 10 segundos
setInterval(() => replication.reconcileReplicas(state), 15000); // reconciliação a cada 15 segundos

// Configurar interface de linha de comando
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (line) => {
  if (line.trim() === 'exit') {
    console.log('\nShutting down...');
    faultTolerance.createCheckpoint(state); // Checkpoint final antes de sair
    socket.close();
    process.exit(0);
  } else if (line.trim() === 'token') {
    mutualExclusion.requestToken(state, socket);
  } else if (line.trim() === 'checkpoint') {
    faultTolerance.createCheckpoint(state);
    console.log('Manual checkpoint created');
  } else if (line.trim() === 'reconcile') {
    replication.reconcileReplicas(state);
    console.log('Manual reconciliation started');
  } else {
    if (state.hasToken) {
      // Enviar mensagem de chat se temos o token
      const chatMessage = {
        type: 'CHAT',
        nodeId: state.nodeId,
        content: line,
        timestamp: Date.now()
      };
      
      multicast.sendMessage(socket, chatMessage);
      
      // Liberar o token após enviar a mensagem
      mutualExclusion.releaseToken(state, socket);
    } else {
      console.log('You need the token to send a message. Type "token" to request it.');
    }
  }
});

// Tratar fechamento gracioso
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  faultTolerance.createCheckpoint(state);
  socket.close();
  process.exit(0);
});

console.log(`Node ${NODE_ID} running. Commands:
- Type a message and press Enter to send (when you have the token)
- Type 'token' to request the token
- Type 'checkpoint' to create a manual checkpoint
- Type 'reconcile' to force replica reconciliation
- Type 'exit' to quit`);
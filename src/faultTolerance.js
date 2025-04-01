// faultTolerance.js - Implementação da Tolerância a Falhas com Checkpoints
const fs = require('fs');
const path = require('path');

// Estado do último checkpoint
let lastCheckpointTime = Date.now();

/**
 * Inicializa o subsistema de tolerância a falhas
 * @param {Object} state - Estado global do sistema
 * @param {Object} socket - Socket multicast
 */
function init(state, socket) {
  console.log('Fault tolerance system initialized');
}

/**
 * Cria um checkpoint do estado atual
 * @param {Object} state - Estado global do sistema
 */
function createCheckpoint(state) {
  const checkpoint = {
    nodeId: state.nodeId,
    timestamp: Date.now(),
    messageLog: state.messageLog,
    hasToken: state.hasToken,
    requestQueue: state.requestQueue
  };
  
  const checkpointFile = path.join(state.dataDir, 'checkpoint.json');
  
  try {
    fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));
    lastCheckpointTime = Date.now();
    console.log(`Checkpoint created at ${new Date(lastCheckpointTime).toLocaleTimeString()}`);
  } catch (err) {
    console.error('Error creating checkpoint:', err);
  }
}

/**
 * Restaura o estado a partir do último checkpoint
 * @param {Object} state - Estado global do sistema
 */
function restoreFromCheckpoint(state) {
  const checkpointFile = path.join(state.dataDir, 'checkpoint.json');
  
  if (fs.existsSync(checkpointFile)) {
    try {
      const checkpoint = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
      
      // Restaurar estado
      state.messageLog = checkpoint.messageLog || [];
      state.hasToken = checkpoint.hasToken || false;
      state.requestQueue = checkpoint.requestQueue || [];
      
      console.log(`Restored from checkpoint at ${new Date(checkpoint.timestamp).toLocaleTimeString()}`);
      console.log(`Recovered ${state.messageLog.length} messages`);
      
      // Mostrar as últimas mensagens para fornecer contexto
      const lastMessages = state.messageLog.slice(-5);
      if (lastMessages.length > 0) {
        console.log('Last messages:');
        lastMessages.forEach(msg => {
          console.log(`[${new Date(msg.timestamp).toLocaleTimeString()}] Node ${msg.nodeId}: ${msg.content}`);
        });
      }
    } catch (err) {
      console.error('Error restoring from checkpoint:', err);
    }
  } else {
    console.log('No checkpoint found, starting fresh');
  }
}

module.exports = {
  init,
  createCheckpoint,
  restoreFromCheckpoint
}
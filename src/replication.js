// replication.js - Implementação da Replicação de Dados e Consistência Eventual
const fs = require('fs');
const path = require('path');

// Configuração
const REPLICA_COUNT = 3;
const ARTIFICIAL_DELAY_MAX = 500; // atraso artificial máximo em ms

/**
 * Inicializa o subsistema de replicação
 * @param {Object} state - Estado global do sistema
 */
function init(state) {
  console.log(`Replication system initialized with ${REPLICA_COUNT} replicas`);
}

/**
 * Trata mensagens de chat e as armazena nas réplicas
 * @param {Object} state - Estado global do sistema
 * @param {Object} message - Mensagem recebida
 */
function handleMessage(state, message) {
  // Armazenar com atraso artificial para simular consistência eventual
  setTimeout(() => {
    storeMessage(state, message);
    
    if (message.type === 'CHAT') {
      console.log(`Message from Node ${message.nodeId}: ${message.content}`);
    }
  }, Math.random() * ARTIFICIAL_DELAY_MAX);
}

/**
 * Armazena uma mensagem em múltiplas réplicas
 * @param {Object} state - Estado global do sistema
 * @param {Object} message - Mensagem a armazenar
 */
function storeMessage(state, message) {
  // Adicionar ao log em memória
  state.messageLog.push(message);
  
  // Armazenar em múltiplos arquivos de réplica
  for (let i = 0; i < REPLICA_COUNT; i++) {
    const replicaFile = path.join(state.dataDir, `replica_${i}.json`);
    
    // Ler dados existentes se o arquivo existir
    let data = [];
    if (fs.existsSync(replicaFile)) {
      try {
        data = JSON.parse(fs.readFileSync(replicaFile, 'utf8'));
      } catch (err) {
        console.error(`Error reading replica ${i}:`, err);
      }
    }
    
    // Adicionar nova mensagem
    data.push(message);
    
    // Escrever de volta com atraso artificial para consistência eventual
    setTimeout(() => {
      try {
        fs.writeFileSync(replicaFile, JSON.stringify(data, null, 2));
      } catch (err) {
        console.error(`Error writing to replica ${i}:`, err);
      }
    }, Math.random() * ARTIFICIAL_DELAY_MAX);
  }
}

/**
 * Reconcilia os dados entre réplicas para garantir consistência eventual
 * @param {Object} state - Estado global do sistema
 */
function reconcileReplicas(state) {
  console.log('Starting replica reconciliation...');
  
  // Todas as mensagens de todas as réplicas
  let allMessages = [];
  
  // Ler todas as réplicas
  for (let i = 0; i < REPLICA_COUNT; i++) {
    const replicaFile = path.join(state.dataDir, `replica_${i}.json`);
    
    if (fs.existsSync(replicaFile)) {
      try {
        const replicaData = JSON.parse(fs.readFileSync(replicaFile, 'utf8'));
        allMessages = allMessages.concat(replicaData);
      } catch (err) {
        console.error(`Error reading replica ${i} during reconciliation:`, err);
      }
    }
  }
  
  // Deduplicar mensagens com base em nodeId + timestamp (chave única)
  const uniqueMessages = [];
  const seenKeys = new Set();
  
  allMessages.forEach(msg => {
    const key = `${msg.nodeId}_${msg.timestamp}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueMessages.push(msg);
    }
  });
  
  // Ordenar por timestamp
  uniqueMessages.sort((a, b) => a.timestamp - b.timestamp);
  
  // Atualizar log em memória
  state.messageLog = uniqueMessages;
  
  // Escrever dados reconciliados de volta em todas as réplicas
  for (let i = 0; i < REPLICA_COUNT; i++) {
    const replicaFile = path.join(state.dataDir, `replica_${i}.json`);
    
    try {
      fs.writeFileSync(replicaFile, JSON.stringify(uniqueMessages, null, 2));
    } catch (err) {
      console.error(`Error writing to replica ${i} during reconciliation:`, err);
    }
  }
  
  console.log(`Reconciliation complete. Synchronized ${uniqueMessages.length} unique messages across all replicas.`);
}

module.exports = {
  init,
  handleMessage,
  storeMessage,
  reconcileReplicas
};
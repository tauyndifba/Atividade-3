// mutualExclusion.js - Implementação do Controle de Concorrência com Exclusão Mútua Distribuída
const multicast = require('./multicast');

/**
 * Inicializa o subsistema de exclusão mútua
 * @param {Object} state - Estado global do sistema
 * @param {Object} socket - Socket multicast
 */
function init(state, socket) {
  console.log(`Mutual exclusion system initialized. Node ${state.nodeId} ${state.hasToken ? 'has token' : 'waiting for token'}`);
}

/**
 * Trata mensagens relacionadas ao token
 * @param {Object} state - Estado global do sistema
 * @param {Object} socket - Socket multicast
 * @param {Object} message - Mensagem recebida
 */
function handleMessage(state, socket, message) {
  switch (message.type) {
    case 'TOKEN_REQUEST':
      if (state.hasToken && message.nodeId !== state.nodeId) {
        // Enviar token se o tivermos
        console.log(`Sending token to Node ${message.nodeId}`);
        multicast.sendMessage(socket, {
          type: 'TOKEN_GRANT',
          nodeId: state.nodeId,
          recipient: message.nodeId,
          timestamp: Date.now()
        });
        state.hasToken = false;
      } else if (message.nodeId !== state.nodeId) {
        // Adicionar à fila se não tivermos o token
        state.requestQueue.push(message.nodeId);
      }
      break;
      
    case 'TOKEN_GRANT':
      if (message.recipient === state.nodeId) {
        console.log(`Received token from Node ${message.nodeId}`);
        state.hasToken = true;
        
        // Temos o token, então podemos enviar uma mensagem agora
        console.log('You can now send a message (mutual exclusion acquired)');
      }
      break;
  }
}

/**
 * Solicita o token para acesso exclusivo
 * @param {Object} state - Estado global do sistema
 * @param {Object} socket - Socket multicast
 */
function requestToken(state, socket) {
  console.log('Requesting token for exclusive access...');
  multicast.sendMessage(socket, {
    type: 'TOKEN_REQUEST',
    nodeId: state.nodeId,
    timestamp: Date.now()
  });
}

/**
 * Libera o token após uso
 * @param {Object} state - Estado global do sistema
 * @param {Object} socket - Socket multicast
 */
function releaseToken(state, socket) {
  if (state.requestQueue.length > 0) {
    const nextNode = state.requestQueue.shift();
    console.log(`Passing token to Node ${nextNode}`);
    multicast.sendMessage(socket, {
      type: 'TOKEN_GRANT',
      nodeId: state.nodeId,
      recipient: nextNode,
      timestamp: Date.now()
    });
    state.hasToken = false;
  }
}

module.exports = {
  init,
  handleMessage,
  requestToken,
  releaseToken
};
// multicast.js - Implementação da Comunicação em Grupo com Multicast
const dgram = require('dgram');

// Configuração
const MULTICAST_ADDR = '224.1.1.1';
const PORT = 5007;

/**
 * Inicializa o socket multicast e configura os listeners
 * @param {Object} state - Estado global do sistema
 * @returns {Object} - Socket configurado
 */
function init(state) {
  // Criar socket UDP
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

  // Configurar socket
  socket.bind(PORT, () => {
    console.log(`Node ${state.nodeId} started`);
    
    // Habilitar multicast
    socket.setBroadcast(true);
    socket.setMulticastTTL(128);
    socket.addMembership(MULTICAST_ADDR);
    
    // Anunciar entrada no grupo
    sendMessage(socket, {
      type: 'JOIN',
      nodeId: state.nodeId,
      content: `Node ${state.nodeId} joined the chat`,
      timestamp: Date.now()
    });
  });

  // Tratar mensagens recebidas
  socket.on('message', (msg, rinfo) => {
    try {
      const message = JSON.parse(msg.toString());
      
      // Registrar mensagem recebida
      console.log(`Received [${message.type}] from Node ${message.nodeId}: ${message.content || ''}`);
      
      // Encaminhar para o módulo apropriado com base no tipo de mensagem
      if (message.type === 'CHAT' || message.type === 'JOIN') {
        // Importações dinâmicas para evitar dependência circular
        const replication = require('./replication');
        replication.handleMessage(state, message);
      } else if (message.type === 'TOKEN_REQUEST' || message.type === 'TOKEN_GRANT') {
        const mutualExclusion = require('./mutualExclusion');
        mutualExclusion.handleMessage(state, socket, message);
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  // Tratamento de erros
  socket.on('error', (err) => {
    console.error('Socket error:', err);
  });

  return socket;
}

/**
 * Envia uma mensagem para o grupo multicast
 * @param {Object} socket - Socket UDP
 * @param {Object} message - Mensagem a ser enviada
 */
function sendMessage(socket, message) {
  const msgBuffer = Buffer.from(JSON.stringify(message));
  socket.send(msgBuffer, 0, msgBuffer.length, PORT, MULTICAST_ADDR, (err) => {
    if (err) {
      console.error('Error sending message:', err);
    }
  });
}

module.exports = {
  init,
  sendMessage
};
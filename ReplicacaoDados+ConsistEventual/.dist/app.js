const fs = require('fs');
const dgram = require('dgram');
const { v4: uuidv4 } = require('uuid');

const MULTICAST_ADDR = '224.1.1.1';
const PORT = 5007;
const REPLICA_FILES = ['replica1.json', 'replica2.json', 'replica3.json'];
const RECONCILIATION_INTERVAL = 10000; // 10 segundos

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
const nodeId = uuidv4();

socket.bind(PORT, function () {
    socket.addMembership(MULTICAST_ADDR);
    console.log(`Nó ${nodeId} conectado ao chat multicast!`);
});

function saveToReplicas(message) {
    REPLICA_FILES.forEach((file, index) => {
        setTimeout(() => {
            let data = [];
            if (fs.existsSync(file)) {
                data = JSON.parse(fs.readFileSync(file));
            }
            data.push(message);
            fs.writeFileSync(file, JSON.stringify(data, null, 2));
            console.log(`Mensagem salva em ${file}`);
        }, Math.random() * 3000); // Delay artificial
    });
}

function reconcileReplicas() {
    console.log('Iniciando reconciliação...');
    let allMessages = new Set();
    REPLICA_FILES.forEach(file => {
        if (fs.existsSync(file)) {
            const data = JSON.parse(fs.readFileSync(file));
            data.forEach(msg => allMessages.add(msg));
        }
    });
    const reconciledData = Array.from(allMessages);
    REPLICA_FILES.forEach(file => {
        fs.writeFileSync(file, JSON.stringify(reconciledData, null, 2));
    });
    console.log('Replicação sincronizada entre réplicas.');
}

setInterval(reconcileReplicas, RECONCILIATION_INTERVAL);

socket.on('message', (msg, rinfo) => {
    const receivedMsg = msg.toString();
    console.log(`Mensagem recebida: ${receivedMsg}`);
    saveToReplicas(receivedMsg);
});

socket.on('error', (err) => {
    console.log(`Erro no socket: ${err.message}`);
    socket.close();
});

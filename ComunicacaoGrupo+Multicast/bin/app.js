const dgram = require('dgram');
const readline = require('readline');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const MULTICAST_ADDR = '224.1.1.1';
const PORT = 5007;
const CHECKPOINT_FILE = 'checkpoint.json';
const REQUEST_FILE = 'requests.json';

const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
const nodeId = uuidv4();

socket.bind(PORT, function () {
    socket.addMembership(MULTICAST_ADDR);
    console.log(`Nó ${nodeId} conectado ao chat multicast!`);
    restoreCheckpoint();
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let messageLog = [];
let requestQueue = [];
let inCriticalSection = false;

function restoreCheckpoint() {
    if (fs.existsSync(CHECKPOINT_FILE)) {
        const data = fs.readFileSync(CHECKPOINT_FILE);
        messageLog = JSON.parse(data);
        console.log('Mensagens restauradas do checkpoint:');
        messageLog.forEach(msg => console.log(msg));
    }
}

function saveCheckpoint() {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(messageLog, null, 2));
}

function saveRequestQueue() {
    fs.writeFileSync(REQUEST_FILE, JSON.stringify(requestQueue, null, 2));
}

function requestCriticalSection() {
    const request = { nodeId, timestamp: Date.now() };
    requestQueue.push(request);
    saveRequestQueue();
    socket.send(JSON.stringify({ type: 'request', request }), 0, PORT, MULTICAST_ADDR);
}

function releaseCriticalSection() {
    inCriticalSection = false;
    requestQueue = requestQueue.filter(req => req.nodeId !== nodeId);
    saveRequestQueue();
    socket.send(JSON.stringify({ type: 'release', nodeId }), 0, PORT, MULTICAST_ADDR);
}

rl.on('line', (message) => {
    requestCriticalSection();
    setTimeout(() => {
        if (!inCriticalSection) {
            inCriticalSection = true;
            const username = process.env.USERNAME || 'Anônimo';
            const msg = `${username}: ${message}`;
            messageLog.push(msg);
            saveCheckpoint();
            socket.send(msg, 0, msg.length, PORT, MULTICAST_ADDR);
            releaseCriticalSection();
        }
    }, 2000);
});

socket.on('message', (msg, rinfo) => {
    const data = msg.toString();
    try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'request') {
            requestQueue.push(parsed.request);
            saveRequestQueue();
        } else if (parsed.type === 'release') {
            requestQueue = requestQueue.filter(req => req.nodeId !== parsed.nodeId);
            saveRequestQueue();
        }
    } catch (e) {
        if (!messageLog.includes(data)) {
            messageLog.push(data);
            saveCheckpoint();
        }
        console.log(`Mensagem recebida: ${data}`);
    }
});

socket.on('error', (err) => {
    console.log(`Erro no socket: ${err.message}`);
    socket.close();
});

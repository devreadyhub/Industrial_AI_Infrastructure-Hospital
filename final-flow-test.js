const io = require('socket.io-client');
const http = require('http');

function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function test() {
  console.log('=== COMPLETE LOGIN & SOCKET.IO CHAT FLOW ===\n');

  // Step 1: Login
  console.log('1. HTTP Login...');
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { staffId: 'ADMIN-MAIN-001', password: 'ChangeMe@Admin2026' });

  const token = loginRes.token;
  const user = loginRes.user;
  console.log(`   ✓ Logged in as: ${user.name} (${user.role}, level ${user.clearanceLevel})\n`);

  // Step 2: Verify token
  console.log('2. Verify JWT token...');
  const meRes = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/me',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`   ✓ Token valid for: ${meRes.user.role} (level ${meRes.user.clearanceLevel})\n`);

  // Step 3: HTTP chat endpoint (for comparison)
  console.log('3. HTTP Chat (REST endpoint)...');
  const httpChatRes = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/ai/chat',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-user-role': user.role,
      'x-user-id': user.staffId
    }
  }, { question: 'List recent admissions', context: '' });
  console.log(`   ✓ Response: ${httpChatRes.answer ? httpChatRes.answer.slice(0, 80) + '...' : 'no answer'}\n`);

  // Step 4: Socket.IO connection
  console.log('4. Socket.IO Chat Connection...');
  const socket = io('http://localhost:4000', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: { userRole: user.role, userId: user.staffId, token },
    timeout: 90000,
  });

  return new Promise((resolve, reject) => {
    let connected = false;

    socket.on('connect', () => {
      connected = true;
      console.log(`   ✓ Socket connected (ID: ${socket.id}, transport: ${socket.io.engine.transport.name})\n`);

      console.log('5. Socket.IO Chat Message...');
      socket.emit('chat-message', {
        question: 'What are our ward capacities?',
        context: 'Hospital operations'
      });
    });

    socket.on('chat-response', (payload) => {
      console.log(`   ✓ Response received: ${payload.answer ? payload.answer.slice(0, 80) + '...' : 'no answer'}\n`);
      console.log('=== ✅ LOGIN & SOCKET.IO CHAT FLOW WORKING ===\n');
      socket.disconnect();
      resolve();
    });

    socket.on('chat-error', (payload) => {
      console.error(`   ✗ Chat error: ${payload.error}`);
      socket.disconnect();
      reject(new Error(payload.error));
    });

    socket.on('connect_error', (err) => {
      console.error(`   ✗ Socket connect error: ${err.message}`);
      reject(err);
    });

    setTimeout(() => {
      if (!connected) {
        reject(new Error('Socket connection timeout'));
      } else {
        reject(new Error('Chat response timeout (>90s)'));
      }
    }, 95000);
  });
}

test()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n✗ Test failed:', err.message);
    process.exit(1);
  });

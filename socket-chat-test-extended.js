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
  console.log('=== SOCKET.IO CHAT TEST (Extended Timeout) ===\n');

  // Step 1: Login to get token
  console.log('Step 1: Logging in...');
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 4000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { staffId: 'ADMIN-MAIN-001', password: 'ChangeMe@Admin2026' });

  const token = loginRes.token;
  const user = loginRes.user;
  console.log(`✓ Login successful: ${user.name} (${user.role})\n`);

  // Step 2: Connect via Socket.IO
  console.log('Step 2: Connecting to Socket.IO...');
  const socket = io('http://localhost:4000', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: {
      userRole: user.role,
      userId: user.staffId,
      token: token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000,
  });

  let connected = false;
  let messageReceived = false;
  let startTime = Date.now();

  socket.on('connect', () => {
    connected = true;
    console.log(`✓ Socket.IO connected (ID: ${socket.id})`);
    console.log(`✓ Transport: ${socket.io.engine.transport.name}\n`);

    // Step 3: Send chat message
    console.log('Step 3: Sending chat message via Socket.IO...');
    console.log('(Waiting up to 60 seconds for response...)\n');
    socket.emit('chat-message', {
      question: 'List 5 current patients',
      context: ''
    });
  });

  socket.on('connect_error', (error) => {
    console.error('✗ Socket connection error:', error.message);
    process.exit(1);
  });

  socket.on('chat-response', (payload) => {
    messageReceived = true;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Step 4: Received chat response (${elapsed}s)`);
    console.log('Response:', payload.answer ? payload.answer.slice(0, 400) + '...' : payload);
    console.log('\n✅ Socket.IO chat works end-to-end!\n');
    socket.disconnect();
    process.exit(0);
  });

  socket.on('chat-error', (payload) => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\n✗ Chat error (${elapsed}s):`, payload.error);
    socket.disconnect();
    process.exit(1);
  });

  socket.on('disconnect', (reason) => {
    if (!messageReceived && connected) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`\n✗ Socket disconnected before receiving response (${elapsed}s):`, reason);
      process.exit(1);
    }
  });

  // Longer timeout
  setTimeout(() => {
    if (!messageReceived) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`\n✗ No response received within 60 seconds (${elapsed}s)`);
      socket.disconnect();
      process.exit(1);
    }
  }, 60000);
}

test().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

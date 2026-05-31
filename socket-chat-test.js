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
  console.log('=== SOCKET.IO CHAT TEST ===\n');

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
  console.log(`✓ Login successful: ${user.name} (${user.role})`);
  console.log(`✓ Token: ${token.slice(0, 50)}...\n`);

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

  socket.on('connect', () => {
    connected = true;
    console.log(`✓ Socket.IO connected (ID: ${socket.id})`);
    console.log(`✓ Transport: ${socket.io.engine.transport.name}\n`);

    // Step 3: Send chat message
    console.log('Step 3: Sending chat message via Socket.IO...');
    socket.emit('chat-message', {
      question: 'What is the current patient census?',
      context: 'Hospital operations query'
    });
    console.log('✓ Message sent\n');
  });

  socket.on('connect_error', (error) => {
    console.error('✗ Socket connection error:', error.message);
    process.exit(1);
  });

  socket.on('chat-response', (payload) => {
    messageReceived = true;
    console.log('Step 4: Received chat response via Socket.IO');
    console.log('Response preview:', payload.answer ? payload.answer.slice(0, 300) + '...' : payload);
    console.log('\n✅ Socket.IO chat works end-to-end!\n');
    socket.disconnect();
    process.exit(0);
  });

  socket.on('chat-error', (payload) => {
    console.error('✗ Chat error:', payload.error);
    socket.disconnect();
    process.exit(1);
  });

  socket.on('disconnect', (reason) => {
    if (!messageReceived && connected) {
      console.error('✗ Socket disconnected before receiving response:', reason);
      process.exit(1);
    }
  });

  setTimeout(() => {
    if (!messageReceived) {
      console.error('✗ No response received within 10 seconds');
      socket.disconnect();
      process.exit(1);
    }
  }, 10000);
}

test().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

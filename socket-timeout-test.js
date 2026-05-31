const io = require('socket.io-client');

const socket = io('http://localhost:4000', {
  path: '/socket.io',
  transports: ['websocket'],
  auth: { userRole: 'admin', userId: 'ADMIN-MAIN-001', token: 'dummy' },
  timeout: 60000,
});

let startTime = Date.now();

socket.on('connect', () => {
  console.log('Connected, sending message...');
  socket.emit('chat-message', { question: 'Test patient count', context: '' });
});

socket.on('chat-response', (payload) => {
  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`✓ Response after ${elapsed.toFixed(1)}s`);
  console.log('Answer:', payload.answer ? payload.answer.slice(0, 150) : payload);
  process.exit(0);
});

socket.on('chat-error', (payload) => {
  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`✗ Error after ${elapsed.toFixed(1)}s:`, payload.error);
  process.exit(1);
});

socket.on('connect_error', (err) => {
  console.error('✗ Connect error:', err.message);
  process.exit(1);
});

setTimeout(() => {
  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`✗ Timeout after ${elapsed.toFixed(1)}s`);
  process.exit(1);
}, 90000);

const io = require('socket.io-client');

const socket = io('http://localhost:4000', {
  path: '/socket.io',
  transports: ['websocket'],
  auth: {
    userRole: 'admin',
    userId: 'ADMIN-MAIN-001',
    token: 'dummy',
  },
  timeout: 20000,
});

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  console.log('Emitting chat-message...');
  socket.emit('chat-message', {
    question: 'Test',
    context: ''
  });
});

socket.on('chat-response', (payload) => {
  console.log('✓ Response received');
  console.log('Answer preview:', payload.answer ? payload.answer.slice(0, 100) : payload);
  process.exit(0);
});

socket.on('chat-error', (payload) => {
  console.log('✓ Error received:', payload.error);
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('✗ Connect error:', err.message);
  process.exit(1);
});

socket.on('error', (err) => {
  console.error('✗ Socket error:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('✗ Timeout - no response after 15 seconds');
  process.exit(1);
}, 15000);

const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';
const SECRET = process.env.JWT_SECRET || 'use_a_long_random_string_here';

const payload = {
  staffId: process.env.STAFF_ID || 'ADMIN-MAIN-001',
  role: 'admin',
  clearanceLevel: 5,
};

const token = process.env.SOCKET_TEST_TOKEN || jwt.sign(payload, SECRET, { expiresIn: '1h' });

console.log('Using token:', token.slice(0, 40) + '...');

const socket = io(BACKEND, {
  auth: {
    token,
    userRole: 'admin',
    userId: payload.staffId,
  },
  reconnection: false,
});

socket.on('connect', () => {
  console.log('[Test] Connected to server as', socket.id);
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('[Test] connect_error', err && err.message ? err.message : err);
  process.exit(2);
});

socket.on('error', (err) => {
  console.error('[Test] error', err);
});

setTimeout(() => {
  console.error('[Test] timed out waiting for connection');
  process.exit(3);
}, 8000);

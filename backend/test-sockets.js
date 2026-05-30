const { io } = require('socket.io-client');
const axios = require('axios');

const BACKEND_URL = 'http://localhost:4000';
const REPO = 'SSSahil15/devpulse1'; // Just an example repo name

async function runTest() {
  // 1. Get a mock JWT or an existing one if needed.
  // Oh wait, the route `/api/analyze` is protected. We need a valid token.
  // Or we can just mock it in our test environment by generating a token using jwtSecret.
  const jwt = require('jsonwebtoken');
  const config = require('./src/config/env');

  // Mock token payload
  const token = jwt.sign({ id: 'test-user-123', username: 'testuser' }, config.jwtSecret, {
    expiresIn: '1h',
  });

  console.log('Connecting to WebSockets...');
  const socket = io(BACKEND_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Connected with Socket ID:', socket.id);
    const room = `scan_${REPO}`;
    console.log(`Subscribing to room: ${room}`);
    socket.emit('subscribe', room);

    // 2. Trigger the scan via HTTP
    console.log('Triggering HTTP Analysis...');
    axios
      .post(
        `${BACKEND_URL}/api/analyze`,
        { repositoryFullName: REPO },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // Need to provide github token? The route uses `ensureGitHubTokenSynced`.
            // We can't easily mock the github token check unless the user exists in DB.
          },
        },
      )
      .then((res) => {
        console.log('HTTP Response:', res.status, res.data);
      })
      .catch((err) => {
        console.error('HTTP Error:', err.response?.data || err.message);
        process.exit(1);
      });
  });

  socket.on('scan:progress', (data) => {
    console.log('[Socket] Progress Update:', data);
  });

  socket.on('scan:complete', (data) => {
    console.log('[Socket] Scan Complete! Risk Score:', data.analysis.riskScore);
    process.exit(0);
  });

  socket.on('scan:error', (data) => {
    console.error('[Socket] Scan Error:', data);
    process.exit(1);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket Connection Error:', err.message);
    process.exit(1);
  });
}

runTest();

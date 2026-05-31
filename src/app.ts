import express from 'express';
import dotenv from 'dotenv';
import router from './routes';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-role, x-user-id');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// API Routes
app.use('/api', router);

// Serve client static files if present (production build)
try {
  const clientDist = path.resolve(__dirname, '..', 'client', 'dist');
  const alternativeClientDist = path.resolve(process.cwd(), 'client', 'dist');
  const resolvedClientDist = fs.existsSync(clientDist) ? clientDist : alternativeClientDist;

  if (fs.existsSync(resolvedClientDist)) {
    console.log('[App] serving static client from', resolvedClientDist);
    app.use(express.static(resolvedClientDist));

    // Send index.html for non-API routes (SPA fallback)
    app.get(/^\/(?!api).*/, (_req, res) => {
      res.sendFile(path.join(resolvedClientDist, 'index.html'));
    });
  }
} catch (err) {
  console.error('[App] failed to configure client static serving:', err);
}

// Error handling
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default app;

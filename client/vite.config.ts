import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    port: 3001,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: [
      'devready.ng',
      'hospital1000.devready.ng',
      '.devready.ng' // This wildcard allows all subdomains
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  }
});

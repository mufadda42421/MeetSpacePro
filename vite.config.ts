import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { initSocketServer } from './server/socket';
import { handleTranscribeApi, handleSummaryApi } from './server/api';

function meetSpaceBackendPlugin(): Plugin {
  return {
    name: 'meetspace-backend',
    configureServer(server) {
      if (server.httpServer) {
        initSocketServer(server.httpServer as any);
      }
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/transcribe')) {
          return handleTranscribeApi(req, res);
        }
        if (req.url?.startsWith('/api/summary')) {
          return handleSummaryApi(req, res);
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), meetSpaceBackendPlugin()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

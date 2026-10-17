import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// basicSsl = https on your LAN so a phone can use the camera + GPS while testing.
export default defineConfig({
  plugins: [react(), basicSsl()],
  optimizeDeps: { exclude: ['onnxruntime-web'] },
  server: { host: true, proxy: { '/api': 'http://localhost:5000' } },
});

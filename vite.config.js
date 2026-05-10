import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy /api calls to Vercel dev server when running locally with `vercel dev`.
    // For pure `npm run dev` (no API), the API call will fail — use `npm run dev:api`
    // (which runs `vercel dev`) to test the full stack locally.
  },
});

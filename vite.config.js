import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Custom Vite plugin: makes `/api/*.js` files in this repo behave like Vercel
 * Serverless Functions during `npm run dev`. We don't need `vercel dev` locally.
 *
 * In production, Vercel still picks up `api/*.js` automatically — this plugin
 * only runs in dev mode.
 */
const vercelStyleApiPlugin = () => ({
  name: 'vercel-style-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url || !req.url.startsWith('/api/')) return next();

      // Parse JSON body for POST/PUT/PATCH requests
      if (req.method && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        let raw = '';
        for await (const chunk of req) raw += chunk;
        try {
          req.body = raw ? JSON.parse(raw) : {};
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid JSON body.' }));
          return;
        }
      }

      // Build a Vercel-flavoured `res` shim around Node's IncomingMessage/ServerResponse.
      const vercelRes = Object.assign(res, {
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(obj) {
          this.setHeader('Content-Type', 'application/json');
          this.end(JSON.stringify(obj));
          return this;
        },
        send(payload) {
          if (typeof payload === 'object') return this.json(payload);
          this.end(String(payload));
          return this;
        },
      });

      // Resolve the function file from the URL — strip query string + leading slash.
      const route = req.url.split('?')[0].replace(/^\//, '');
      const filePath = `${process.cwd()}/${route}.js`;

      try {
        // Dynamic import so edits to the handler hot-reload.
        const mod = await server.ssrLoadModule(filePath);
        const handler = mod.default;
        if (typeof handler !== 'function') {
          throw new Error(`No default export function in ${route}.js`);
        }
        await handler(req, vercelRes);
      } catch (err) {
        console.error(`[api ${route}]`, err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: err?.message || 'API handler crashed.',
              stack: err?.stack,
            })
          );
        }
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  // Load .env / .env.local etc. into process.env so the API handler sees GROQ_API_KEY.
  // Empty prefix string means "load every variable", not just VITE_*.
  const env = loadEnv(mode, process.cwd(), '');
  process.env = { ...process.env, ...env };

  return {
    plugins: [react(), vercelStyleApiPlugin()],
    server: {
      port: 5173,
    },
  };
});

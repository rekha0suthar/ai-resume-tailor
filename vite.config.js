import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Custom Vite plugin: makes /api/*.js files behave like Vercel Serverless
 * Functions during `npm run dev` — including streaming responses.
 *
 * For streaming endpoints, the handler can call res.write() directly on the
 * Node ServerResponse; we don't capture the body, so chunks flow straight
 * through to the browser.
 */
const vercelStyleApiPlugin = () => ({
  name: 'vercel-style-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url || !req.url.startsWith('/api/')) return next();

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

      const route = req.url.split('?')[0].replace(/^\//, '');
      const filePath = `${process.cwd()}/${route}.js`;

      try {
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
            })
          );
        }
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env = { ...process.env, ...env };
  return {
    plugins: [react(), vercelStyleApiPlugin()],
    server: { port: 5173 },
  };
});

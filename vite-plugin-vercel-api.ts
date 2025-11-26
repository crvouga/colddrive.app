import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

export function vercelApiPlugin(): Plugin {
  return {
    name: 'vercel-api',
    configureServer(server) {
      server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
        // Only handle /api routes
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        try {
          // Dynamically import the handler
          const { handler } = await import('./src/api/trpc/handler.js');

          // Create a Request object from the incoming request
          const protocol = req.headers['x-forwarded-proto'] || 'http';
          const host = req.headers.host || 'localhost:5173';
          const url = new URL(req.url, `${protocol}://${host}`);
          
          // Read request body if present
          let body: Uint8Array | undefined;
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            const bodyBuffer = await new Promise<Buffer>((resolve, reject) => {
              const chunks: Buffer[] = [];
              req.on('data', (chunk: Buffer) => chunks.push(chunk));
              req.on('end', () => resolve(Buffer.concat(chunks)));
              req.on('error', reject);
            });
            
            if (bodyBuffer.length > 0) {
              // Pass as Uint8Array for proper handling
              body = new Uint8Array(bodyBuffer);
            }
          }

          const request = new Request(url, {
            method: req.method || 'GET',
            headers: req.headers as Record<string, string>,
            body,
          });

          // Call the handler
          const response = await handler(request);

          // Send the response
          res.statusCode = response.status;
          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          const responseBody = await response.text();
          res.end(responseBody);
        } catch (error) {
          console.error('API handler error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }));
        }
      });
    },
  };
}


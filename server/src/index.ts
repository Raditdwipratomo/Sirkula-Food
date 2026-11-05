import cors from 'cors';
import express from 'express';
import { serverEnv } from './config/env.js';
import { apiRouter } from './routes/index.js';

export const app = express();

const allowedOrigins = serverEnv.CORS_ORIGIN.split(',').map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.use('/api', apiRouter);

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(serverEnv.PORT, () => {
    console.log(
      `[SirkulaFood Express Server] Berjalan di http://localhost:${serverEnv.PORT}`
    );
  });
}

export default app;

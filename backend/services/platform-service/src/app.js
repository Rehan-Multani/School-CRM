import express from 'express';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './config/errorHandler.js';
import platformRoutes from './routes/platformRoutes.js';
import { ensureUploadDirs, uploadsRoot } from './utils/upload.utils.js';
import { requireUploadAccess } from './middleware/requireUploadAccess.js';

const app = express();

ensureUploadDirs();

app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json({ limit: '5mb' }));

// P0: uploaded files are no longer world-readable. A valid platform JWT is
// required (header or ?t= query param — see requireUploadAccess / assetUrl()).
app.use(
  '/uploads',
  requireUploadAccess,
  express.static(uploadsRoot, {
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
      res.set('Cache-Control', 'private, max-age=300');
    },
  })
);

app.use(platformRoutes);
app.use(errorHandler);

export default app;

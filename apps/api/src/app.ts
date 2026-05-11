import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { env } from './config/env.js';
import { errorHandler } from './middleware/error.js';
import { generalLimiter } from './middleware/rateLimit.js';
import routes from './routes/index.js';

const app = express();

// Capture raw body for Paystack webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, _res, next) => {
  (req as any).rawBody = req.body.toString();
  req.body = JSON.parse(req.body.toString());
  next();
});

// Global middleware
app.use(helmet());
app.use(cors({ origin: [env.FRONTEND_URL, 'http://localhost:3001'], credentials: true }));
app.use(compression());
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(generalLimiter);

// Routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

export default app;

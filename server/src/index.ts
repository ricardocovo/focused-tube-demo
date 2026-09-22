import express from 'express';
import cookieParser from 'cookie-parser';
import passport from './config/passport';
import { corsMiddleware } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import healthRouter from './routes/health';
import pingRouter from './routes/ping';
import authRouter from './routes/auth';
import profilesRouter from './routes/profiles';
import subscriptionsRouter from './routes/subscriptions';
import feedRouter from './routes/feed';
import communityRouter from './routes/community';
import { config } from './utils/config';

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json());
app.use(passport.initialize());

// Routes
app.use('/api/health', healthRouter);
app.use('/api/ping', pingRouter);
app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/feed', feedRouter);
app.use('/api/community', communityRouter);

// 404 and error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

export default app;

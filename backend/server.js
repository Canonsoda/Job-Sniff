import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import { connectDB } from "./config/db.js";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import resumeRoute from "./routes/resume.route.js";
import passport from "passport";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import './config/passport.js';

dotenv.config();

const app = express();

app.set('trust proxy', 1);

// Enable compression for better performance
app.use(compression());

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to 1000 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);


app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(passport.initialize());

// Kept deliberately cheap - no database or Elasticsearch calls - so uptime
// monitors and platform health checks never fail on a slow dependency.
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'JobSniff Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});


app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/resume", resumeRoute);


app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const message = process.env.NODE_ENV === 'production' 
    ? 'Something went wrong!' 
    : err.message;
    
  res.status(err.status || 500).json({ 
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});


app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});


process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

const PORT = process.env.PORT || 5000;

/**
 * The CV parsing service sleeps independently of this one. If it is cold when
 * a resume is uploaded, the user waits for its start-up on top of the ~40-60s
 * parse. Pinging its health endpoint keeps it warm while this server is awake.
 *
 * Set KEEPALIVE_INTERVAL_MS=0 to disable.
 */
const startCvServiceKeepAlive = () => {
  const cvUrl = process.env.CV_LLM_URL;
  const interval = process.env.KEEPALIVE_INTERVAL_MS === undefined
    ? 10 * 60 * 1000
    : Number(process.env.KEEPALIVE_INTERVAL_MS);

  if (!cvUrl || !interval) return;

  const ping = async () => {
    try {
      await fetch(`${cvUrl}/health`, { signal: AbortSignal.timeout(15000) });
    } catch (err) {
      // A sleeping service is expected to time out on the first ping
      console.log(`Keep-alive ping to CV service failed: ${err.message}`);
    }
  };

  ping(); // warm it immediately on boot
  setInterval(ping, interval).unref();
  console.log(`💤 Keep-alive: pinging ${cvUrl}/health every ${interval / 60000} min`);
};

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      startCvServiceKeepAlive();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

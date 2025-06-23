import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import passport from 'passport';
import { connectDB } from './config/db.js';

dotenv.config();

import './config/passport.js';

import authRoute from './routes/auth.route.js';
import userRoute from './routes/user.route.js';
import resumeRoute from './routes/resume.route.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.get('/', (req, res) => {
  res.send('JobSniff backend is running');
});

// Routes
app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/resume', resumeRoute);

// Start server
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
});

import express from 'express';
import authMiddleware from '../middleware/auth.middleware.js';
import { updateUserSettings } from '../controller/user.controller.js';

const userRoute = express.Router();

// NOTE: there was an unauthenticated `GET /` here backed by `getUser`, which
// returned every user document - bcrypt password hashes, emails and googleIds -
// to anyone who knew the URL. Nothing consumed it, so it is gone rather than
// merely gated. Any future listing endpoint needs auth AND a field projection.

userRoute.get('/profile', authMiddleware, (req, res) => {
  res.json({ message: 'You are authorized', user: req.user });
});

// The frontend calls /user/hr/settings; keep that path and also accept
// /user/settings so either spelling works.
userRoute.patch('/settings', authMiddleware, updateUserSettings);
userRoute.patch('/hr/settings', authMiddleware, updateUserSettings);

export default userRoute;

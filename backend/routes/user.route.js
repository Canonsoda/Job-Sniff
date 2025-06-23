import express from 'express';
import { getUser, registerUser ,loginUser} from '../controller/user.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {updateHRSettings} from '../controller/user.controller.js'

const userRoute = express.Router();

userRoute.get('/', getUser);
userRoute.get('/profile', authMiddleware, (req, res) => {
  res.json({ message: 'You are authorized', user: req.user });
});
userRoute.patch("/settings", authMiddleware, updateHRSettings);


export default userRoute;
import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { registerUser, loginUser } from '../controller/user.controller.js';
import jsonwebtoken from 'jsonwebtoken';
import authMiddleware from '../middleware/auth.middleware.js'
import User from '../models/user.model.js';

const authRoute = express.Router();


authRoute.post('/register', registerUser);

authRoute.post('/login', loginUser);


authRoute.get('/google', (req, res, next) => {
  const { role } = req.query;
  const state = JSON.stringify({ role: role?.toLowerCase() || 'applicant' });

  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state,
    prompt: 'select_account',
  })(req, res, next);
});


// 🔹 Google OAuth callback
authRoute.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login`,
    session: false,
  }),
  (req, res) => {
    const role = req.user.role;
    const isNewUser = req.user._isNewUser || false;

    const token = jwt.sign(
      {
        id: req.user._id,
        emailId: req.user.emailId,
        name: req.user.name,
        role,
        isNewUser,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.redirect(`${process.env.CLIENT_URL}/google-auth-success?token=${token}`);
  }
);

authRoute.patch('/set-role', authMiddleware, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['applicant', 'hr'].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be 'applicant' or 'hr'." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });

    user.role = role;
    await user.save();

    // Optionally: send a new token with updated role
    const newToken = jsonwebtoken.sign(
      {
        id: user._id,
        emailId: user.emailId,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ message: "Role updated successfully", token: newToken });
  } catch (err) {
    console.error("Error in set-role:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

authRoute.patch('/update-recruiter-details', authMiddleware, async (req, res) => {
  try {
    const { recruiterDetails } = req.body;

    if (!recruiterDetails || !recruiterDetails.companyName || !recruiterDetails.jobTitle) {
      return res.status(400).json({ message: 'Company name and job title are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.recruiterDetails = recruiterDetails;
    await user.save();

    const newToken = jwt.sign(
      {
        id: user._id,
        emailId: user.emailId,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Recruiter details updated successfully',
      token: newToken,
      user: {
        name: user.name,
        role: user.role,
        emailId: user.emailId,
        recruiterDetails: user.recruiterDetails,
      }
    });

  } catch (err) {
    console.error('Error updating recruiter details:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});


export default authRoute;

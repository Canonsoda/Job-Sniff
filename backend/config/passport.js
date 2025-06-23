import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import User from '../models/user.model.js';
import { sendRegistrationEmail } from '../utils/sendRegistrationEmail.js';

dotenv.config();

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    passReqToCallback: true,
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const state = JSON.parse(req.query.state || '{}');
      const inputRole = (state.role || '').toLowerCase();
      const role = ['applicant', 'hr'].includes(inputRole) ? inputRole : 'applicant';

      let user = await User.findOne({ emailId: profile.emails[0].value });

      if (user) {
        user._isNewUser = false;
        return done(null, user);
      }

      const newUser = new User({
        name: profile.displayName,
        emailId: profile.emails[0].value,
        phoneNumber: '',
        password: '',
        googleId: profile.id,
        role: role,
      });

      await newUser.save();
      await sendRegistrationEmail(newUser.emailId, newUser.name);
      newUser._isNewUser = true;

      return done(null, newUser);
    } catch (err) {
      return done(err, null);
    }
  }
));

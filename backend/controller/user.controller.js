import User from '../models/user.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {sendRegistrationEmail} from '../utils/sendRegistrationEmail.js';

export const registerUser = async (req, res) => {
  try {
    const { user } = req.body;
    if (!user?.name || !user?.emailId || (!user?.password && !user?.googleId)) {
      return res.status(400).json({ message: 'Please fill all the fields' });
    }

    const existingUser = await User.findOne({ emailId: user.emailId });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    if (!user.googleId && user.phoneNumber) {
      const phoneExists = await User.findOne({ phoneNumber: user.phoneNumber });
      if (phoneExists) {
        return res.status(409).json({ message: 'Phone number already registered' });
      }
    }

    const hashedPassword = user.password ? await bcrypt.hash(user.password, 10) : '';

    const role =
      typeof user.role === 'string' && ['applicant', 'hr'].includes(user.role.toLowerCase())
        ? user.role.toLowerCase()
        : 'applicant';

    const newUser = new User({
      name: user.name,
      emailId: user.emailId,
      phoneNumber: user.phoneNumber || '',
      password: hashedPassword,
      googleId: user.googleId || '',
      role: role,
    });

    await newUser.save();
    await sendRegistrationEmail(newUser.emailId, newUser.name);

    const token = jwt.sign(
      {
        id: newUser._id,
        role: newUser.role,
        name: newUser.name,
        emailId: newUser.emailId,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({ message: 'User registered successfully', token });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};
// `getUser` used to live here and returned every user document, password
// hashes included, from an unauthenticated route. Removed rather than gated,
// since nothing consumed it.
export const loginUser = async(req,res) =>{
    try{
        const {emailId, password} = req.body;
        if(!emailId || !password){
            return res.status(400).json({message: 'Email and password are required'});
        }

        const user = await User.findOne({ emailId });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Least privilege: an unset role must not read as anything other than
        // 'applicant'. The previous 'both' fallback was not 'applicant', so
        // every `role === 'applicant'` guard let it through as HR.
        const role = user.role === 'hr' ? 'hr' : 'applicant';
        // Generate JWT token
        const token = jwt.sign({
            id: user._id,
            role: role,
            name: user.name,
            emailId:user.emailId
        },
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name, 
                emailId: user.emailId, 
                role:role
            }
        });
    }catch(error){
        res.status(500).json({message: 'Error logging in', error: error.message});
    }
}

/**
 * Update the signed-in user's own account.
 *
 * Previously HR-only, which meant applicants got a 403 from a Settings page
 * that still showed them email and password fields. Any authenticated user can
 * now update their own credentials; recruiter details remain HR-only because
 * only HR accounts have them.
 */
export const updateUserSettings = async (req, res) => {
  try {
    const { emailId, password, recruiterDetails } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (emailId && emailId !== user.emailId) {
      // emailId is a unique index, so check first and return a useful message
      // instead of letting the save throw a duplicate-key error as a 500
      const taken = await User.findOne({ emailId, _id: { $ne: user._id } }).lean();
      if (taken) {
        return res.status(409).json({ message: "That email is already registered" });
      }
      user.emailId = emailId;
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    if (recruiterDetails && user.role === "hr") {
      user.recruiterDetails = {
        ...user.recruiterDetails,
        ...recruiterDetails,
      };
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        name: user.name,
        emailId: user.emailId,
        role: user.role,
        recruiterDetails: user.recruiterDetails,
      },
    });
  } catch (err) {
    console.error("Settings update failed:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};
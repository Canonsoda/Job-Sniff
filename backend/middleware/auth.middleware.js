import jsonwebtoken from 'jsonwebtoken';
import User from '../models/user.model.js';

/**
 * Verify the JWT, then take the role from the database rather than the token.
 *
 * A JWT is a snapshot taken at login. If a role changes afterwards the token
 * keeps asserting the old one until it expires, so a stale token could both
 * under-privilege a user (an HR who just picked their role still being treated
 * as an applicant) and over-privilege one (a downgraded account keeping HR
 * access for a day).
 *
 * The role is also normalised to 'hr' or 'applicant' here. Authorization checks
 * elsewhere are written as `role === 'applicant'`, so anything unrecognised -
 * null, undefined, the legacy 'both' - must collapse to the least-privileged
 * value instead of silently passing as HR.
 */
export const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    let decoded;
    try {
        decoded = jsonwebtoken.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(403).json({ message: 'Token is not valid' });
    }

    try {
        const user = await User.findById(decoded.id).select('role name emailId').lean();

        if (!user) {
            return res.status(401).json({ message: 'Account no longer exists' });
        }

        req.user = {
            ...decoded,
            id: decoded.id,
            role: user.role === 'hr' ? 'hr' : 'applicant',
            name: user.name,
            emailId: user.emailId,
        };
        next();
    } catch (error) {
        console.error('Auth lookup failed:', error);
        return res.status(500).json({ message: 'Authentication failed' });
    }
}

export default authMiddleware;

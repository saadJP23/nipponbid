const jwt = require('jsonwebtoken');
const { cache } = require('../config/redis');

// Cache decoded JWT payload for 5 minutes so we don't re-verify on every request
const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    // Check Redis first
    const cacheKey = `session:${token.slice(-16)}`; // last 16 chars as key (tokens are long)
    const cached = await cache.get(cacheKey);
    if (cached) {
      req.user = cached;
      return next();
    }

    // Verify JWT and cache the payload
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    await cache.set(cacheKey, payload, 300); // cache 5 minutes
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
};

module.exports = { auth, adminAuth };

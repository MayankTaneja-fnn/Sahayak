import jwt from 'jsonwebtoken';
const SECRET_KEY = process.env.SESSION_TOKEN_KEY || 'supersecret';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log('Auth Header:', authHeader);
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ message: 'Unauthorized: Missing token' });

  const token = authHeader.split(' ')[1];
  // console.log("token",token);
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.userId = decoded.uid; // ✅ Set userId to request
    // console.log(decoded.uid);
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

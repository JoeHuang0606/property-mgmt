const jwt = require('jsonwebtoken');

/**
 * JWT 認證中介層
 * 驗證 Authorization header 中的 Bearer token
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供認證權杖' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '權杖已過期，請重新登入' });
    }
    return res.status(401).json({ error: '無效的認證權杖' });
  }
}

module.exports = authenticate;

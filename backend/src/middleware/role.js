/**
 * 角色權限中介層工廠函式
 * @param  {...string} allowedRoles - 允許的角色列表
 * @returns {Function} Express 中介層
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未認證' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: '權限不足，無法執行此操作' });
    }

    next();
  };
}

module.exports = authorize;

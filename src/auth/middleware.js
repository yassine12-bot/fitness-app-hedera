const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  //console.log('🔵 AUTH MIDDLEWARE CALLED'); // ✨ ADD
  //console.log('   Headers:', req.headers.authorization); // ✨ ADD
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      //console.log('❌ No auth header'); // ✨ ADD
      return res.status(401).json({
        success: false,
        message: 'Token d\'authentification manquant',
        code: 'AUTH_REQUIRED'
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      //console.log('❌ No token after split'); // ✨ ADD
      return res.status(401).json({
        success: false,
        message: 'Format de token invalide',
        code: 'AUTH_INVALID'
      });
    }

    //console.log('🔍 Verifying token...'); // ✨ ADD
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //console.log('✅ Token decoded:', decoded); // ✨ ADD
    
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      name: decoded.name
    };

    //console.log('✅ req.user set:', req.user); // ✨ ADD

    next();
  } catch (error) {
    console.error('❌ Auth error:', error.message); // ✨ ADD
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expiré',
        code: 'AUTH_EXPIRED'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token invalide',
      code: 'AUTH_INVALID'
    });
  }
};

module.exports = authMiddleware;
const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    try {
        const token = auth.split(' ')[1];
        req.user = jwt.verify(token, process.env.JWT_SECRET || 'ptsi_secret');
        next();
    } catch (err) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
};

module.exports = { protect };

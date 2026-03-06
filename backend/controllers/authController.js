const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'ptsi_secret';

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        // Demo login bypass
        if (email === 'admin@ptsi.com' && password === 'admin123') {
            const token = jwt.sign({ id: 'demo_admin', role: 'admin', name: 'Admin User' }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ success: true, token, user: { id: 'demo_admin', name: 'Admin User', email, role: 'admin' } });
        }
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user._id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const hash = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hash, role: role || 'viewer' });
        await user.save();
        res.status(201).json({ success: true, message: 'User created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.me = async (req, res) => {
    res.json({ user: req.user });
};

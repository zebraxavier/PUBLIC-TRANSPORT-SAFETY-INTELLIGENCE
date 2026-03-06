const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const register = async (req, res, next) => {
    try {
        const { name, email, password, role } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ success: false, error: 'Email already registered' });
        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashed, role });
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'ptsi_secret', { expiresIn: '7d' });
        res.status(201).json({ success: true, token, user: { id: user._id, name, email, role: user.role } });
    } catch (err) { next(err); }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ success: false, error: 'Invalid credentials' });
        user.lastLogin = new Date();
        await user.save();
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'ptsi_secret', { expiresIn: '7d' });
        res.json({ success: true, token, user: { id: user._id, name: user.name, email, role: user.role } });
    } catch (err) { next(err); }
};

// Demo login - no DB required
const demoLogin = (req, res) => {
    const token = jwt.sign({ id: 'demo', role: 'admin' }, process.env.JWT_SECRET || 'ptsi_secret', { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: 'demo', name: 'Demo Admin', email: 'admin@ptsi.io', role: 'admin' } });
};

module.exports = { register, login, demoLogin };

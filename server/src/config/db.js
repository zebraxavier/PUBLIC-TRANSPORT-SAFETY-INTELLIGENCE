const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ptsi_db';
        await mongoose.connect(uri);
        console.log(`✅ MongoDB connected: ${uri}`);
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message);
        console.log('⚠️  Running in demo mode without database persistence');
    }
};

module.exports = connectDB;

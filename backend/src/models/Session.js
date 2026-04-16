const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: String, required: true },
    subject: { type: String, enum: ['DSA', 'OS', 'DBMS', 'CN', 'OOP', 'HR'], required: true },
    questionsAsked: [
        {
            questionText: String,
            userAnswer: String,
            score: Number,
            aiFeedback: String,
            timestamp: { type: Date, default: Date.now }
        }
    ],
    overallScore: { type: Number, default: 0 },
    status: { type: String, enum: ['in-progress', 'completed', 'abandoned'], default: 'in-progress' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Session', sessionSchema);
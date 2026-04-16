const mongoose = require('mongoose');

const topicsProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    totalSessionsCompleted: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    lastPracticed: { type: Date, default: Date.now },
    confidenceLevel: { type: String, enum: ['not-started', 'beginner', 'intermediate', 'strong'], default: 'beginner' },
    scoreHistory: [{ date: Date, score: Number }] // Keep track of progress over time
});

// Ensure a user has only one progress document per topic
topicsProgressSchema.index({ userId: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model('TopicsProgress', topicsProgressSchema);
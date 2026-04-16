const mongoose = require('mongoose');

const questionsLogSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    topic: { type: String, required: true },
    questionText: { type: String, required: true },
    askedAt: { type: Date, default: Date.now }
});

// Compound index for O(1) memory lookup [cite: 142, 324]
questionsLogSchema.index({ userId: 1, topic: 1 });

module.exports = mongoose.model('QuestionsLog', questionsLogSchema);
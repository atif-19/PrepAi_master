const Session = require('../models/Session');
const QuestionsLog = require('../models/QuestionsLog');
const AIService = require('../services/AIService');

exports.startSession = async (req, res) => {
    try {
        const { topic, subject } = req.body;
        const user = req.user; // From protect middleware

        // 1. Get question history for this topic 
        const history = await QuestionsLog.find({ userId: user._id, topic }).select('questionText');

        // 2. Create the Session document
        const session = await Session.create({
            userId: user._id,
            topic,
            subject,
            status: 'in-progress'
        });

        // 3. Call AI for the first question 
        // Note: For the first question, chatHistory and userMessage are empty
        const aiResponse = await AIService.generateAIResponse(
            user, 
            topic, 
            history, 
            {}, // topicProgress (we'll add this later)
            [], // chatHistory
            "Hello, let's start the interview."
        );

        // 4. Log this first question so it's not repeated 
        await QuestionsLog.create({
            userId: user._id,
            topic,
            questionText: aiResponse
        });

        res.status(201).json({
            sessionId: session._id,
            question: aiResponse
        });

    } catch (error) {
        res.status(500).json({ message: 'Failed to start session', error: error.message });
    }
};
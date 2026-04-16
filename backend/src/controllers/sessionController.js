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

// @desc    Submit an answer and get next question or evaluation
// @route   POST /api/session/answer
exports.answerSession = async (req, res) => {
    try {
        const { sessionId, questionText, userAnswer } = req.body;
        const user = req.user;

        // 1. Fetch the session
        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found" });

        // 2. Prepare Chat History for Gemini
        // We map our questionsAsked array into the format Gemini expects
        const chatHistory = session.questionsAsked.map(q => ([
            { role: "model", parts: [{ text: q.questionText }] },
            { role: "user", parts: [{ text: q.userAnswer }] }
        ])).flat();

        // 3. Check if it's time to end (e.g., after 8 questions)
        const questionCount = session.questionsAsked.length;
        const isLastQuestion = questionCount >= 8;

        let aiPrompt = userAnswer;
        if (isLastQuestion) {
            aiPrompt = `USER ANSWER: ${userAnswer}. \n\n That was the last question. Now, provide the final evaluation in the exact JSON format requested in the system instructions.`;
        }

        // 4. Get AI Response
        const aiResponse = await AIService.generateAIResponse(
            user,
            session.topic,
            [], // Log handled in startSession; we use history for context here
            {}, 
            chatHistory,
            aiPrompt
        );

        // 5. Update Session Document
        session.questionsAsked.push({
            questionText: questionText,
            userAnswer: userAnswer,
            timestamp: new Date()
        });

        // 6. Handle JSON Evaluation vs Next Question
        if (isLastQuestion) {
            // Attempt to parse the AI's JSON string
            try {
                const evaluation = JSON.parse(aiResponse);
                session.overallScore = evaluation.overall;
                session.status = 'completed';
                await session.save();
                return res.json({ type: 'evaluation', data: evaluation });
            } catch (e) {
                // Fallback if AI output isn't clean JSON
                return res.json({ type: 'text', content: aiResponse });
            }
        }

        // 7. If not finished, log the NEW question for future "no-repeat" memory
        await QuestionsLog.create({
            userId: user._id,
            topic: session.topic,
            questionText: aiResponse
        });

        await session.save();
        res.json({ type: 'question', content: aiResponse });

    } catch (error) {
        res.status(500).json({ message: 'Error processing answer', error: error.message });
    }
};
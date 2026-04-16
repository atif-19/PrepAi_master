const { GoogleGenerativeAI } = require('@google/generative-ai');
const { decrypt } = require('./EncryptionService');

// This function builds the complex "System Prompt" from your document [cite: 65, 67]
const buildSystemPrompt = (user, topic, questionsLog, topicProgress) => {
    const companies = Array.isArray(user.targetCompanies)
  ? user.targetCompanies.join(' or ')
  : 'top Indian service-based companies';
  if (!user.geminiApiKeyEncrypted) {
  throw new Error("API key not found");
}
    return `
You are a technical interviewer at a top Indian service-based company like ${companies}.
You are conducting a placement interview for ${user.name}. [cite: 71]

CANDIDATE PROFILE:
- Topic: ${topic} [cite: 73]
- Confidence Level: ${topicProgress?.confidenceLevel || 'beginner'} [cite: 74]
- Resume Context: ${user.resumeText?.slice(0, 500) || 'Not provided'} [cite: 75]

QUESTIONS ALREADY ASKED (NEVER repeat these):
${(questionsLog || [])
  .map(q => typeof q === 'string' ? '- ' + q : '- ' + q.questionText)
  .join('\n')} [cite: 76, 77]

INTERVIEW RULES:
1. Start with ONE easy confidence-building question. [cite: 79]
2. Ask ONE follow-up based on their answer. [cite: 80]
3. Increase difficulty if they are strong; give hints if they are weak. [cite: 81, 82]
4. After 8-10 questions, respond with the evaluation JSON structure. [cite: 83]
5. Ask only ONE question at a time. [cite: 86]
6. Focus only on ${topic}. [cite: 88]
`;
};

exports.generateAIResponse = async (user, topic, questionsLog, topicProgress, chatHistory, userMessage) => {
    // 1. Decrypt the user's API key [cite: 52, 199]
    const apiKey = decrypt(user.geminiApiKeyEncrypted);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // 2. Build the system instruction [cite: 60]
    const systemPrompt = buildSystemPrompt(user, topic, questionsLog, topicProgress);

    // 3. Start the chat with context [cite: 49]
    const chat = model.startChat({
        history: chatHistory,
        generationConfig: { maxOutputTokens: 1000 },
    });

    // We send the system prompt as a part of the context or first message
    const result = await chat.sendMessage(`SYSTEM INSTRUCTION: ${systemPrompt}\n\nUSER ANSWER: ${userMessage}`);
    return result.response.text();
};

// @desc    Submit an answer and get next question or evaluation
// @route   POST /api/session/answer
exports.answerSession = async (req, res) => {
    try {
        const { sessionId, questionText, userAnswer } = req.body;
        const user = req.user;

        const session = await Session.findById(sessionId);
        if (!session) return res.status(404).json({ message: "Session not found" });

        // FIX: Gemini history MUST start with a 'user' message.
        // We add a dummy "Let's start" message to satisfy the API.
        const chatHistory = [
            { role: "user", parts: [{ text: "I am ready for the interview." }] },
            ...session.questionsAsked.map(q => ([
                { role: "model", parts: [{ text: q.questionText }] },
                { role: "user", parts: [{ text: q.userAnswer }] }
            ])).flat()
        ];

        const questionCount = session.questionsAsked.length;
        const isLastQuestion = questionCount >= 8;

        let aiPrompt = `CURRENT QUESTION: ${questionText}\nUSER ANSWER: ${userAnswer}`;
        
        if (isLastQuestion) {
            aiPrompt += `\n\nThis was the 8th question. Provide final evaluation in the requested JSON format.`;
        } else {
            aiPrompt += `\n\nEvaluate briefly and ask the next technical question.`;
        }

        const aiResponse = await AIService.generateAIResponse(
            user,
            session.topic,
            [], 
            {}, 
            chatHistory,
            aiPrompt
        );

        // Save the Q&A pair we just finished
        session.questionsAsked.push({
            questionText: questionText,
            userAnswer: userAnswer,
            timestamp: new Date()
        });

        if (isLastQuestion || aiResponse.includes('"type": "evaluation"')) {
            try {
                // Clean the response in case Gemini adds markdown ```json blocks
                const cleanJson = aiResponse.replace(/```json|```/g, "").trim();
                const evaluation = JSON.parse(cleanJson);
                
                session.overallScore = evaluation.overall;
                session.status = 'completed';
                await session.save();
                return res.json({ type: 'evaluation', data: evaluation });
            } catch (e) {
                // If parsing fails, just send as text for now
                return res.json({ type: 'text', content: aiResponse });
            }
        }

        // Save to QuestionsLog to prevent repetition in FUTURE sessions [cite: 61, 141]
        await QuestionsLog.create({
            userId: user._id,
            topic: session.topic,
            questionText: aiResponse
        });

        await session.save();
        res.json({ type: 'question', content: aiResponse });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error processing answer', error: error.message });
    }
};
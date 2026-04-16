const { GoogleGenerativeAI } = require('@google/generative-ai');
const { decrypt } = require('./EncryptionService');

// This function builds the complex "System Prompt" from your document [cite: 65, 67]
const buildSystemPrompt = (user, topic, questionsLog, topicProgress) => {
    return `
You are a technical interviewer at a top Indian service-based company like ${user.targetCompanies.join(' or ')}. [cite: 68, 72]
You are conducting a placement interview for ${user.name}. [cite: 71]

CANDIDATE PROFILE:
- Topic: ${topic} [cite: 73]
- Confidence Level: ${topicProgress?.confidenceLevel || 'beginner'} [cite: 74]
- Resume Context: ${user.resumeText?.slice(0, 500) || 'Not provided'} [cite: 75]

QUESTIONS ALREADY ASKED (NEVER repeat these):
${questionsLog.map(q => '- ' + q.questionText).join('\n')} [cite: 76, 77]

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
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
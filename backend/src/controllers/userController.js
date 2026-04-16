const User = require('../models/User');
const { encrypt } = require('../services/EncryptionService');

// @desc    Save Gemini API Key
// @route   POST /api/user/apikey
exports.saveApiKey = async (req, res) => {
    try {
        const { geminiApiKey } = req.body;
        
        // Encrypt the key before saving [cite: 272]
        const encryptedKey = encrypt(geminiApiKey);
        
        await User.findByIdAndUpdate(req.user.id, {
            geminiApiKeyEncrypted: encryptedKey
        });

        res.json({ success: true, message: 'API Key saved securely' });
    } catch (error) {
        res.status(500).json({ message: 'Encryption failed', error: error.message });
    }
};

// @desc    Complete Onboarding (Companies, Prep Level, etc)
// @route   POST /api/user/onboarding
exports.completeOnboarding = async (req, res) => {
    try {
        const { targetCompanies, preparationLevel, currentSemester, resumeText } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user.id,
            {
                targetCompanies,
                preparationLevel,
                currentSemester,
                resumeText,
                onboardingComplete: true
            },
            { new: true }
        ).select('-passwordHash -geminiApiKeyEncrypted');

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Onboarding update failed', error: error.message });
    }
};
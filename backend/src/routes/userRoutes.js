const express = require('express');
const router = express.Router();
const { saveApiKey, completeOnboarding } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/apikey', protect, saveApiKey);
router.post('/onboarding', protect, completeOnboarding);

module.exports = router;
const express = require('express');
const router = express.Router();
const { startSession, answerSession } = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/start', protect, startSession);
router.post('/answer', protect, answerSession); // New route
module.exports = router;
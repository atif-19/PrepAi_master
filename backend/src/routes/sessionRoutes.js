const express = require('express');
const router = express.Router();
const { startSession } = require('../controllers/sessionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/start', protect, startSession);

module.exports = router;
const express = require('express');
const router = express.Router();
const { getDashboardStats, getWeakAreas } = require('../controllers/progressController');
const { protect } = require('../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardStats);
router.get('/weakareas', protect, getWeakAreas);

module.exports = router;
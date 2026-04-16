const TopicsProgress = require('../models/TopicsProgress');

// @desc    Get all topic progress for the dashboard
// @route   GET /api/progress/dashboard
exports.getDashboardStats = async (req, res) => {
    try {
        const stats = await TopicsProgress.find({ userId: req.user.id });
        
        // Calculate a simple streak or total count if needed
        const totalSessions = stats.reduce((acc, curr) => acc + curr.totalSessionsCompleted, 0);

        res.json({
            topicsProgress: stats,
            totalSessions
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dashboard', error: error.message });
    }
};

// @desc    Get topics where the user is struggling (Score < 5)
// @route   GET /api/progress/weakareas
exports.getWeakAreas = async (req, res) => {
    try {
        const weakTopics = await TopicsProgress.find({ 
            userId: req.user.id, 
            averageScore: { $lt: 5 },
            totalSessionsCompleted: { $gt: 0 } 
        });
        res.json(weakTopics);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching weak areas', error: error.message });
    }
};
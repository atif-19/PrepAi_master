const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // 2. Hash the password (Security first!) [cite: 98, 391]
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Create the user [cite: 266]
        const user = await User.create({
            name,
            email,
            passwordHash: hashedPassword
        });

        if (user) {
            // 4. Generate a JWT token [cite: 390]
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
                expiresIn: '7d'
            });

            res.status(201).json({
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
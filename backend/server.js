const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');

// Load environment variables from .env [cite: 393]
dotenv.config();

// Connect to MongoDB [cite: 176]
connectDB();

const app = express();

// Middleware
app.use(cors()); // Allows your frontend to talk to your backend [cite: 392]
app.use(express.json()); // Allows the server to accept JSON data in the request body

const authRoutes = require('./src/routes/authRoutes');
app.use('/api/auth', authRoutes);
// Basic Test Route
app.get('/', (req, res) => {
    res.send('PrepAI API is running...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
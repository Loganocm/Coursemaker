
const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();
const { processPdfWithAI } = require('./aiProcessor');

const app = express();
app.use(cors());
const port = 3000;

// Multer setup for handling file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for generating the course
app.post('/generate-course', upload.single('pdfFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    try {
        const fileBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;
        const modelChoice = req.body.aiModel; // e.g., 'gemini'

        console.log(`Received file: ${req.file.originalname}, processing with ${modelChoice}...`);

        const aiResponse = await processPdfWithAI(fileBuffer, mimeType, modelChoice);
        
        res.send(aiResponse);

    } catch (error) {
        console.error('Error processing file with AI:', error);
        res.status(500).json({ error: 'An error occurred while generating the course.' });
    }
});

const fs = require('fs');

// API endpoint to get all courses for a user
app.get('/courses/:userId', (req, res) => {
    const userId = req.params.userId;
    const userCoursesDir = path.join(__dirname, 'users', userId, 'courses');

    if (!fs.existsSync(userCoursesDir)) {
        return res.status(404).json({ message: 'User or courses directory not found.' });
    }

    fs.readdir(userCoursesDir, (err, files) => {
        if (err) {
            console.error('Error reading user courses directory:', err);
            return res.status(500).json({ error: 'Failed to retrieve courses.' });
        }
        const courseFiles = files.filter(file => file.endsWith('.txt'));
        res.json(courseFiles);
    });
});

// API endpoint to get a specific course for a user
app.get('/courses/:userId/:courseName', (req, res) => {
    const userId = req.params.userId;
    const courseName = req.params.courseName;
    const coursePath = path.join(__dirname, 'users', userId, 'courses', courseName);

    if (!fs.existsSync(coursePath)) {
        return res.status(404).json({ message: 'Course not found.' });
    }

    fs.readFile(coursePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading course file:', err);
            return res.status(500).json({ error: 'Failed to retrieve course content.' });
        }
        res.send(data);
    });
});

// API endpoint to save a course for a user
app.post('/save-course/:userId', express.text({ type: '*/*' }), (req, res) => {
    const userId = req.params.userId;
    const courseContent = req.body; // Markdown content
    const userCoursesDir = path.join(__dirname, 'users', userId, 'courses');

    if (!fs.existsSync(userCoursesDir)) {
        fs.mkdirSync(userCoursesDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
    const courseFileName = `course_${timestamp}.txt`;
    const coursePath = path.join(userCoursesDir, courseFileName);

    fs.writeFile(coursePath, courseContent, 'utf8', (err) => {
        if (err) {
            console.error('Error saving course file:', err);
            return res.status(500).json({ error: 'Failed to save course.' });
        }
        res.status(200).json({ message: 'Course saved successfully!', fileName: courseFileName });
    });
});

const server = app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

module.exports = app; // Export app for testing

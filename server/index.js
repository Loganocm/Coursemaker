const express = require('express');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();
const { processPdfWithAI } = require('./aiProcessor');
const { processPdfWithAgent } = require('./agentProcessor');
const fs = require('fs');

const app = express();
app.use(cors());
const port = 3001;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for generating the course
app.post('/generate-course', upload.single('pdfFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    const modelChoice = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    try {
        const courseMarkdown = await processPdfWithAI(fileBuffer, mimeType, modelChoice);
        const courseFileName = `course_${new Date().toISOString().replace(/[:.-]/g, '_')}.txt`;
        const outputPath = path.join(__dirname, 'generated_courses', courseFileName);
        fs.writeFileSync(outputPath, courseMarkdown, 'utf8');
        console.log(`Course generated and saved to ${outputPath}`);
        res.status(200).send(courseMarkdown); // Send markdown directly
    } catch (error) {
        console.error('Error generating course:', error);
        res.status(500).json({ error: error.message || 'Failed to generate course.' });
    }
});

// API endpoint for the AI agent to generate a course from a PDF
app.post('/create-course-agent', upload.single('pdfFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    const modelChoice = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    try {
        const courseMarkdown = await processPdfWithAgent(fileBuffer, mimeType, modelChoice);
        const courseFileName = `course_${new Date().toISOString().replace(/[:.-]/g, '_')}.txt`;
        const outputPath = path.join(__dirname, 'generated_courses', courseFileName);
        fs.writeFileSync(outputPath, courseMarkdown, 'utf8');
        console.log(`Agent Course generated and saved to ${outputPath}`);
        res.status(200).send(courseMarkdown); // Send markdown directly
    } catch (error) {
        console.error('Error generating agent course:', error);
        res.status(500).json({ error: error.message || 'Failed to generate agent course.' });
    }
});

// API endpoint to get all courses for a user
app.get('/courses/:userId', (req, res) => {
    const userId = req.params.userId;
    const userCoursesDir = path.join(__dirname, 'users', userId, 'courses');

    if (!fs.existsSync(userCoursesDir)) {
        // This is not an error, just no courses yet. Return an empty array.
        return res.json([]);
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

    try {
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
    } catch (error) {
        console.error('Error in save-course endpoint:', error);
        res.status(500).json({ error: 'Failed to save course.' });
    }
});

// Generic error handler for all routes
app.use((err, req, res, next) => {
    console.error("Generic error handler caught an error:", err);
    res.status(500).json({ error: 'An unexpected error occurred.', details: err.message });
});

let server;

if (require.main === module) {
    server = app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });

    server.on('error', (err) => {
        console.error('Server error:', err);
    });
}

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific logging, throwing an error, or other logic here
});

// Catch uncaught exceptions
process.on('uncaughtException', (err, origin) => {
  console.error(`Caught exception: ${err}\n` + `Exception origin: ${origin}`);
});


module.exports = app; // Export app for testing
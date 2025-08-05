
const request = require('supertest');
const app = require('../index'); // Import the Express app
const { processPdfWithAI } = require('../aiProcessor');

// Mock the aiProcessor module
jest.mock('../aiProcessor', () => ({
  processPdfWithAI: jest.fn(),
}));

describe('POST /generate-course', () => {
  beforeEach(() => {
    // Reset the mock before each test
    processPdfWithAI.mockReset();
  });

  it('should return 400 if no file is uploaded', async () => {
    const res = await request(app)
      .post('/generate-course')
      .send();
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toEqual('No PDF file uploaded.');
  });

  it('should process the PDF with AI and return the generated course', async () => {
    const mockAiResponse = {
      notes: 'Test notes',
      flashcards: [],
      quizzes: [],
    };
    processPdfWithAI.mockResolvedValueOnce(JSON.stringify(mockAiResponse));

    const pdfBuffer = Buffer.from('This is a test PDF content.');

    const res = await request(app)
      .post('/generate-course')
      .attach('pdfFile', pdfBuffer, 'test.pdf')
      .field('aiModel', 'claude');

    expect(processPdfWithAI).toHaveBeenCalledTimes(1);
    expect(processPdfWithAI).toHaveBeenCalledWith(
      expect.any(Buffer),
      'application/pdf',
      'claude' // Assuming 'claude' is the default model choice for now
    );
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockAiResponse);
  });

  it('should return 500 if AI processing fails', async () => {
    processPdfWithAI.mockRejectedValueOnce(new Error('AI processing error'));

    const pdfBuffer = Buffer.from('This is a test PDF content.');

    const res = await request(app)
      .post('/generate-course')
      .attach('pdfFile', pdfBuffer, 'test.pdf')
      .field('aiModel', 'claude');

    expect(processPdfWithAI).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toEqual(500);
    expect(res.body.error).toEqual('An error occurred while generating the course.');
  });

  it('should return 500 if AI response is not valid JSON', async () => {
    processPdfWithAI.mockResolvedValueOnce('This is not JSON');

    const pdfBuffer = Buffer.from('This is a test PDF content.');

    const res = await request(app)
      .post('/generate-course')
      .attach('pdfFile', pdfBuffer, 'test.pdf')
      .field('aiModel', 'claude');

    expect(processPdfWithAI).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toEqual(500);
    expect(res.body.error).toEqual('Failed to get structured data from AI.');
    expect(res.body.details).toEqual('This is not JSON');
  });
});

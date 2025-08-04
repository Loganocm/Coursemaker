const { processPdfWithAI } = require('../aiProcessor');
const Anthropic = require('@anthropic-ai/sdk');

// Mock the Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
    return jest.fn().mockImplementation(() => {
        return {
            messages: {
                create: jest.fn(),
            },
        };
    });
});

describe('aiProcessor', () => {
    const mockFileBuffer = Buffer.from('mock pdf content');
    const mockMimeType = 'application/pdf';

    beforeEach(() => {
        // Clear all mocks before each test
        Anthropic.mockClear();
        Anthropic().messages.create.mockClear();

        process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    });

    afterEach(() => {
        delete process.env.ANTHROPIC_API_KEY;
    });

    // --- Claude Tests ---
    test('should process PDF with Claude and return valid JSON', async () => {
        const mockJsonResponse = {
            notes: "## Test Notes",
            flashcards: [{ front: "Q1", back: "A1" }],
            quizzes: [{ question: "Q?", options: ["O1", "O2"], correctAnswer: "O1" }]
        };

        Anthropic().messages.create.mockResolvedValueOnce({
            content: [{ text: JSON.stringify(mockJsonResponse) }]
        });

        const result = await processPdfWithAI(mockFileBuffer, mockMimeType);
        expect(result).toEqual(JSON.stringify(mockJsonResponse));
        expect(Anthropic().messages.create).toHaveBeenCalledTimes(1);
        expect(Anthropic).toHaveBeenCalledWith({ apiKey: 'test-anthropic-key' });
    });

    test('should throw error if Claude API key is missing', async () => {
        delete process.env.ANTHROPIC_API_KEY;
        await expect(processPdfWithAI(mockFileBuffer, mockMimeType))
            .rejects.toThrow('Anthropic API Key is missing.');
    });

    test('should handle non-JSON response from Claude gracefully', async () => {
        const mockPlainTextResponse = "This is not a JSON response.";
        Anthropic().messages.create.mockResolvedValueOnce({
            content: [{ text: mockPlainTextResponse }]
        });

        const result = await processPdfWithAI(mockFileBuffer, mockMimeType);
        expect(result).toEqual(mockPlainTextResponse);
    });

    test('should throw error if Claude API call fails', async () => {
        const errorMessage = 'Claude API error';
        Anthropic().messages.create.mockImplementationOnce(() => {
            throw new Error(errorMessage);
        });

        await expect(processPdfWithAI(mockFileBuffer, mockMimeType))
            .rejects.toThrow(`Claude API call failed.`);
    });
});
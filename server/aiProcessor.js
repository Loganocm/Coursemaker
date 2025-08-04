const Anthropic = require('@anthropic-ai/sdk');
const pdfParse = require('pdf-parse');
const fs = require('fs'); // Added for file system operations

// --- Prompt Engineering: The Core Instruction for the AI ---
const generationPrompt = `You are an expert instructional designer and content generator. Your primary task is to meticulously analyze the entire provided PDF document and synthesize its information into a comprehensive set of learning materials.

**Your output MUST be a single, complete, and valid JSON object. No exceptions.**

**Strict Output Formatting Rules:**
1.  **NO extraneous text:** Do not include any introductory phrases, conversational filler, concluding remarks, or any text whatsoever outside of the pure JSON object.
2.  **NO markdown fences:** Do NOT wrap the JSON object in markdown code block fences (e.g., \`\`\`json or \`\`\`). The response must be a plain JSON string that can be directly parsed by \`JSON.parse()\`.
3.  **Syntactic correctness:** Ensure the JSON is always syntactically correct, including proper commas, brackets, braces, and escaped characters. Do not truncate the JSON response; ensure all arrays and objects are properly closed.

**JSON Structure and Content Requirements:**

Adhere strictly to the following JSON structure. If a section is not applicable or insufficient content is found, ensure the structure remains (e.g., empty array or null if explicitly allowed, but try to always provide content where relevant).

Example JSON Structure:

{
  "courseTitle": "Example Course Title",
  "modules": [
    {
      "moduleTitle": "Module 1: Introduction",
      "notes": {
        "summary": "This is a summary of the module content, covering key concepts and important details. It should be 200-300 words.",
        "keywords": [
          "keyword1",
          "keyword2",
          "keyword3"
        ]
      },
      "flashcards": [
        {
          "question": "What is a flashcard?",
          "answer": "A learning tool with a question on one side and an answer on the other."
        },
        {
          "question": "How many flashcards should there be?",
          "answer": "At least 10 in total across all modules."
        }
      ],
      "quiz": [
        {
          "question": "Which of the following is true?",
          "options": {
            "A": "Option A",
            "B": "Option B",
            "C": "Option C",
            "D": "Option D"
          },
          "correctAnswer": "A"
        },
        {
          "question": "What is the capital of France?",
          "options": {
            "A": "Berlin",
            "B": "Madrid",
            "C": "Paris",
            "D": "Rome"
          },
          "correctAnswer": "C"
        }
      ]
    },
    {
      "moduleTitle": "Module 2: Advanced Topics",
      "notes": {
        "summary": "Summary for module 2.",
        "keywords": [
          "advanced",
          "topics"
        ]
      },
      "flashcards": [
        {
          "question": "Advanced question?",
          "answer": "Advanced answer."
        }
      ],
      "quiz": [
        {
          "question": "Advanced quiz question?",
          "options": {
            "A": "Opt A",
            "B": "Opt B",
            "C": "Opt C",
            "D": "Opt D"
          },
          "correctAnswer": "B"
        }
      ]
    }
  ]
}


**Detailed Requirements for Content Generation:**

1.  **courseTitle**: A concise and descriptive string (e.g., "Introduction to Computer Architecture").
2.  **modules**: An array of module objects. Structure the modules logically based on the PDF's chapters or main sections. Each module object must contain:
    * **moduleTitle**: A clear and concise string for the module title.
    * **notes**: An object containing:
        * **summary**: A string (200-300 words) providing a comprehensive summary of the module's core content, key concepts, and important details.
        * **keywords**: An array of strings (minimum 10, maximum 50 words total) containing important keywords, terms, and concepts from the module, relevant for studying.
    * **flashcards**: An array of flashcard objects. Each flashcard object must contain:
        * **question**: A concise string for the flashcard question, designed to test recall of a specific fact or concept.
        * **answer**: A concise string for the flashcard answer.
        * Ensure there are at least 10 high-quality flashcards in total across all modules, focusing on essential definitions, facts, and concepts.
    * **quiz**: An array of quiz objects. Each quiz object must contain:
        * **question**: A clear, unambiguous string for the quiz question, designed to test understanding of the module's content.
        * **options**: An object with exactly four keys ("A", "B", "C", "D") and string values for the multiple-choice options. Ensure options are distinct and plausible distractors.
        * **correctAnswer**: A single character string representing the correct option (e.g., "A", "B", "C", or "D").
        * Ensure there are at least 5 high-quality, well-thought-out quiz questions in total across all modules, testing core concepts and avoiding ambiguity.

`
// Function to estimate token count (very rough, character-based)
function estimateTokens(text) {
    return Math.ceil(text.length / 4); // Claude uses ~4 characters per token
}

// Function to chunk text based on token limit
function chunkText(text, maxTokens) {
    const chunks = [];
    let currentChunk = "";
    const paragraphs = text.split(/\n\s*\n/); // Split by paragraphs

    for (const paragraph of paragraphs) {
        if (estimateTokens(currentChunk + paragraph) < maxTokens) {
            currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
        } else {
            chunks.push(currentChunk);
            currentChunk = paragraph;
        }
    }
    if (currentChunk) {
        chunks.push(currentChunk);
    }
    return chunks;
}

async function processPdfWithAI(fileBuffer, mimeType) {
    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("Anthropic API Key is missing.");
    }
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        let contentToSendToAI;

        if (mimeType === 'application/pdf') {
            const data = await pdfParse(fileBuffer);
            contentToSendToAI = data.text;
            console.log("PDF text extracted.");
        } else if (mimeType.startsWith('text/')) { // Check for common text types
            contentToSendToAI = fileBuffer.toString('utf8');
            console.log(`MIME Type: ${mimeType}`);
            console.log(`File Buffer Length: ${fileBuffer.length}`);
            console.log(`Content Snippet (first 100 chars): ${contentToSendToAI.substring(0, 100)}`);
        } else {
            throw new Error(`Unsupported file type: ${mimeType}. Only PDF and text-based files are supported.`);
        }

        const maxClaudeTokens = 200000; // Claude's max token limit
        const promptTokens = estimateTokens(generationPrompt);
        const maxChunkTokens = 99000; // Maximum tokens for each chunk
        const availableTokensForContent = Math.min(maxChunkTokens, maxClaudeTokens - promptTokens - 5000); // Ensure chunks don't exceed 48000 tokens, and leave buffer

        const textChunks = chunkText(contentToSendToAI, availableTokensForContent);
        let currentCourseJson = { courseTitle: "", modules: [] };

        for (let i = 0; i < textChunks.length; i++) {
            const chunk = textChunks[i];
            let userMessageContent;

            if (i === 0) {
                userMessageContent =
                    `AFTER COMPLETING YOUR RESPONSE CHECK OVER FOR ACCURACY AND PROPER JSON FORMATTING (all opening and closing brackets and ""). YOUR RESPONSE TO THIS MUST BE A COMPLETE AND VALID JSON OBJECT WITH NO PRECEDING OR SUCCEEDING TEXT. IF IT DOES NOT ADHERE TO THIS, YOU HAVE FAILED!!! It must Be a full JSON Object with no text before or after.. You are an expert instructional designer. Your task is to analyze the content of the provided PDF document and generate a comprehensive set of learning materials from it. The output must be a single, plain text string formatted as a JSON object, strictly adhering to the following structure. Do not include any text or code block syntax before or after the JSON content. The JSON should be directly parsable. Each response should be a complete and valid JSON object, even if it only contains a subset of the overall course content. The application will handle merging these individual JSON responses into a single, unified course.\n\n` +
                    generationPrompt +
                    `\n\n` +
                    chunk;
            } else {
                // For subsequent chunks, provide the current JSON and the new chunk
                userMessageContent =
                    `AFTER COMPLETING YOUR RESPONSE CHECK OVER FOR ACCURACY AND PROPER JSON FORMATTING (all opening and closing brackets and ""). YOUR RESPONSE TO THIS MUST COMPLETELY END THE JSON OBJECT IN 5000 CHARACTERS AND NOT HAVE ANY PRECEEDING TEXT BEFORE THE { or AFTER THE }, IF IT DOES HAVE THAT YOU HAVE FAILED!!! It must Be a full JSON Object with no text before or after. Here is the current course JSON generated so far:\n\n` +
                    `${JSON.stringify(currentCourseJson, null, 2)}\n\n` +
                    `Continue generating course content based on the following new text, and integrate it into the provided JSON structure. Only output the complete, updated JSON object. Do not include any introductory or concluding text.\n\n` +
                    chunk;
            }

            const stream = anthropic.messages.stream({
                max_tokens: 4000, // Max tokens for the response from Claude
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: userMessageContent,
                            },
                        ],
                    },
                ],
                model: "claude-3-haiku-20240307",
            });

            let streamedResponse = "";
            for await (const chunk of stream) {
                if (chunk.type === "content_block_delta") {
                    streamedResponse += chunk.delta.text;
                }
            }
            const message = { content: [{ text: streamedResponse }] };

            // Add a delay to avoid hitting rate limits
            if (i < textChunks.length - 1) {
                const delayMs = 31000; // Minimum 25 seconds, or calculated based on 2000 tokens/2 seconds
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }

            if (message && message.content && message.content[0] && message.content[0].text) {
                // Save the first initial response from the AI
                if (i === 0) {
                    const initialResponseDir = './initial_responses';
                    if (!fs.existsSync(initialResponseDir)) {
                        fs.mkdirSync(initialResponseDir);
                    }
                    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
                    const initialResponseFileName = `initial_response_${timestamp}.txt`;
                    const initialResponsePath = `${initialResponseDir}/${initialResponseFileName}`;
                    fs.writeFileSync(initialResponsePath, message.content[0].text, 'utf8');
                    console.log(`Initial AI response saved to: ${initialResponsePath}`);
                }
                try {
                    const jsonStartIndex = message.content[0].text.indexOf('{');
                    const jsonEndIndex = message.content[0].text.lastIndexOf('}');
                    let jsonString = message.content[0].text;

                    if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                        jsonString = message.content[0].text.substring(jsonStartIndex, jsonEndIndex + 1);
                    } else if (jsonStartIndex === -1 && jsonEndIndex === -1) {
                        // If no curly braces are found, assume the entire response *should* be JSON
                        // and let JSON.parse handle the error if it's not.
                        console.warn("No curly braces found in AI response. Attempting to parse full response as JSON.");
                    } else {
                        // Handle cases where only one brace is found or braces are in wrong order
                        console.error("Malformed JSON response: Incomplete curly braces.", message.content[0].text);
                        throw new Error("Malformed JSON response: Incomplete curly braces.");
                    }
                    currentCourseJson = JSON.parse(jsonString);
                } catch (parseError) {
                    console.error(`Error parsing JSON from Claude response for chunk ${i}:`, parseError);
                    const errorLogsDir = './error_logs';
                    if (!fs.existsSync(errorLogsDir)) {
                        fs.mkdirSync(errorLogsDir);
                    }
                    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
                    const promptFileName = `${errorLogsDir}/prompt_error_${timestamp}_chunk_${i}.txt`;
                    const responseFileName = `${errorLogsDir}/response_error_${timestamp}_chunk_${i}.txt`;
                    fs.writeFileSync(promptFileName, userMessageContent, 'utf8');
                    fs.writeFileSync(responseFileName, message.content[0].text, 'utf8');
                    console.log(`Error prompt saved to: ${promptFileName}`);
                    console.log(`Error response saved to: ${responseFileName}`);
                    throw new Error("Claude API response was not valid JSON for chunk " + i);
                }
            } else {
                const errorLogsDir = './error_logs';
                if (!fs.existsSync(errorLogsDir)) {
                    fs.mkdirSync(errorLogsDir);
                }
                const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
                const promptFileName = `${errorLogsDir}/prompt_malformed_${timestamp}_chunk_${i}.txt`;
                const responseFileName = `${errorLogsDir}/response_malformed_${timestamp}_chunk_${i}.txt`;
                fs.writeFileSync(promptFileName, userMessageContent, 'utf8');
                fs.writeFileSync(responseFileName, message.content[0].text || '[EMPTY RESPONSE]', 'utf8');
                console.log(`Malformed/Empty response prompt saved to: ${promptFileName}`);
                console.log(`Malformed/Empty response saved to: ${responseFileName}`);
                throw new Error("Claude API response was malformed or empty for chunk " + i);
            }
        }

        const finalMarkdown = convertJsonToMarkdown(currentCourseJson);

        // Save the final markdown to a local file
        const userCoursesDir = './users/admin/courses'; // Hardcoded 'admin' for now
        if (!fs.existsSync(userCoursesDir)) {
            fs.mkdirSync(userCoursesDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.-]/g, '_');
        const outputFileName = `course_${timestamp}.txt`;
        const outputPath = `${userCoursesDir}/${outputFileName}`;
        fs.writeFileSync(outputPath, finalMarkdown, 'utf8');
        console.log(`Generated course saved to: ${outputPath}`);

        return finalMarkdown;

    } catch (error) {
        console.error("Error in Claude API call:", error.message);
        throw new Error(`Claude API call failed.`);
    }
}

function convertJsonToMarkdown(jsonData) {
    let markdown = `# ${jsonData.courseTitle}\n\n`;

    jsonData.modules.forEach(module => {
        markdown += `## ${module.moduleTitle}\n\n`;

        // Notes
        if (module.notes && module.notes.summary) {
            markdown += `### notes - ${module.notes.summary}\n\n`;
        }

        // Flashcards
        if (module.flashcards && module.flashcards.length > 0) {
            markdown += `### flashcards\n`;
            module.flashcards.forEach(card => {
                markdown += `Q: ${card.question}\n`;
                markdown += `A: ${card.answer}\n\n`;
            });
        }

        // Quiz
        if (module.quiz && module.quiz.length > 0) {
            markdown += `### quiz\n`;
            module.quiz.forEach(q => {
                markdown += `Q: ${q.question}\n`;
                Object.keys(q.options).forEach(optionKey => {
                    markdown += `${optionKey}) ${q.options[optionKey]}\n`;
                });
                markdown += `CORRECT: ${q.correctAnswer}\n\n`;
            });
        }
    });

    return markdown;
}

module.exports = { processPdfWithAI };
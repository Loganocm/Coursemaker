const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Rate Limiter
const requestTimestamps = [];
const MAX_REQUESTS_PER_MINUTE = 15;

async function rateLimiter() {
    const now = Date.now();
    // Remove timestamps older than 60 seconds
    while (requestTimestamps.length > 0 && now - requestTimestamps[0] > 60000) {
        requestTimestamps.shift();
    }

    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
        const timeToWait = 60000 - (now - requestTimestamps[0]);
        console.log(`Rate limit approaching. Waiting for ${timeToWait}ms...`);
        await delay(timeToWait);
    }

    requestTimestamps.push(Date.now());
}

const generationPrompt = `You are an expert instructional designer and content generator. Your primary task is to meticulously analyze the entire provided document and synthesize its information into a comprehensive set of learning materials.

**Your output MUST be a single, complete, and valid JSON object. No exceptions.**
**You are NOT allowed to truncate the end of any responses, they must be fully completed within the length limit.**

**Strict Output Formatting Rules:**
1.  **NO extraneous text:** Do not include any introductory phrases, conversational filler, concluding remarks, or any text whatsoever outside of the pure JSON object.
2.  **NO markdown fences:** Do NOT wrap the JSON object in markdown code block fences . The response must be a plain JSON string that can be directly parsed by JSON.parse().
3.  **Syntactic correctness:** Ensure the JSON is always syntactically correct, including proper QUOTATION MARKS (important), commas, brackets, braces, and escaped characters. Do not truncate the JSON response; ensure all arrays and objects are properly closed.
4.  **Completeness:** The generated JSON must be a complete and valid JSON object. It should not be a partial or incomplete response.
5.  **Character Limit:** The entire response must not exceed 200,000 characters.
6.  **Token Limit:** The entire response must not exceed 65,536 tokens.
7.  **No Truncation:** The response must be fully completed and not truncated.
8.  **Valid JSON:** The response must have a complete beginning and ending with valid JSON.



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
          "answer": "Between 3 and 8 flashcards per module."
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
          "question": "How many quiz questions should there be?",
          "options": {
            "A": "1-2",
            "B": "2-3",
            "C": "4-6",
            "D": "7-8"
          },
          "correctAnswer": "C"
        }
      ]
    }
  ]
}
`;

const summarizationPrompt = `You are an expert summarizer. Your task is to read the following text chunk, which is part of a larger document, and create a detailed, structured summary. The summary should capture all the essential information, key concepts, headings, and topics in the order they appear. This summary will be used by another AI to generate a course, so it needs to be comprehensive.\n\nDo not omit any major topics. Preserve the structure of the original text as much as possible in your summary. The response should not be too large and must end with - END OF RESPONSE -.\n\nHere is the text chunk:\n`;

const verificationPrompt = `You are a JSON syntax validator and corrector. Your task is to analyze the provided text, which is supposed to be a JSON object, and ensure it is a single, complete, and valid JSON object.\n\n**Strict Rules:**\n1.  **Analyze the input:** Check for any syntax errors, missing brackets, incorrect commas, or any other JSON validation issues.\n2.  **Correct the input:** If the JSON is invalid or incomplete, fix it. Ensure all objects and arrays are properly closed.\n3.  **Escape Quotes:** Pay special attention to unescaped double quotes within string values. These are a common source of errors. Find any double quotes that are part of the text content and escape them with a backslash (e.g., "hello" becomes "hello").\n4.  **Return ONLY the JSON:** Your output MUST be ONLY the corrected, valid JSON object. Do not include any other text, explanations, or markdown fences. The output must be directly parseable by \`JSON.parse()\`. \n5.  **If the input is already valid:** Simply return the original, unmodified JSON.\n\nHere is the JSON to validate and correct:\n`;

const factCheckPrompt = `You are an expert fact-checker and content improver. Your task is to review the provided course content (in JSON format) for factual accuracy, clarity, and completeness. If you find any inaccuracies, ambiguities, or areas that could be improved for better learning, correct them. Ensure the information is truthful and well-presented. Maintain the original JSON structure. Your output MUST be a single, complete, and valid JSON object, representing the fact-checked and corrected course content. Do not include any extraneous text, explanations, or markdown fences outside of the pure JSON object.\n\nHere is the course content (JSON) to fact-check and correct:\n`;

async function factCheckWithAI(jsonString, modelChoice) {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error("Google API Key is missing.");
    }
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelChoice });

    const prompt = `${factCheckPrompt}

${jsonString}`;

    try {
        await rateLimiter();
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const factCheckedText = response.text();

        const sanitizedFactCheckedText = extractJson(factCheckedText);
        if (sanitizedFactCheckedText) {
            console.log("AI fact-check successful. Returning fact-checked JSON.");
            return sanitizedFactCheckedText;
        } else {
            console.warn("AI fact-check did not return a valid JSON object. Returning original string.");
            return jsonString;
        }
    } catch (error) {
        console.error("Error during AI fact-check:", error);
        return jsonString;
    }
}

// Function to extract JSON from a string
function extractJson(text) {
    const jsonStartIndex = text.indexOf("{");
    const jsonLastIndex = text.lastIndexOf("}");
    if (jsonStartIndex !== -1 && jsonLastIndex !== -1 && jsonLastIndex > jsonStartIndex) {
        return text.substring(jsonStartIndex, jsonLastIndex + 1);
    }
    const arrayStartIndex = text.indexOf("[");
    const arrayLastIndex = text.lastIndexOf("]");
    if (arrayStartIndex !== -1 && arrayLastIndex !== -1 && arrayLastIndex > arrayStartIndex) {
        return text.substring(arrayStartIndex, arrayLastIndex + 1);
    }
    return null;
}

async function verifyJsonWithAI(jsonString, modelChoice) {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error("Google API Key is missing.");
    }
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelChoice });

    const prompt = `${verificationPrompt}\n\n${jsonString}`;

    try {
        await rateLimiter();
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const validatedText = response.text();

        const sanitizedValidatedText = extractJson(validatedText);
        if (sanitizedValidatedText) {
            console.log("AI verification successful. Returning validated JSON.");
            return sanitizedValidatedText;
        } else {
            console.warn("AI verification did not return a valid JSON object. Returning original string.");
            return jsonString;
        }
    } catch (error) {
        console.error("Error during AI verification:", error);
        return jsonString;
    }
}

async function processPdfWithAI(fileBuffer, mimeType, modelChoice) {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error("Google API Key is missing.");
    }
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

    try {
        let contentToSendToAI;

        if (mimeType === "application/pdf") {
            const data = await pdfParse(fileBuffer);
            contentToSendToAI = data.text;
            console.log("PDF text extracted.");
        } else if (mimeType.startsWith("text/")) {
            contentToSendToAI = fileBuffer.toString("utf8");
            console.log(`MIME Type: ${mimeType}`);
        } else {
            throw new Error(`Unsupported file type: ${mimeType}. Only PDF and text-based files are supported.`);
        }

        const TOKEN_LIMIT = 150000; // More conservative token limit
        const estimatedTokens = contentToSendToAI.length / 4; // Simple estimation

        if (estimatedTokens > TOKEN_LIMIT) {
            console.log(`Estimated tokens (${Math.round(estimatedTokens)}) exceed the limit of ${TOKEN_LIMIT}. Chunking and summarizing...`);

            const charLimit = TOKEN_LIMIT * 3; // Use a character limit that's safely under the token limit
            const chunks = [];
            for (let i = 0; i < contentToSendToAI.length; i += charLimit) {
                chunks.push(contentToSendToAI.substring(i, i + charLimit));
            }

            console.log(`Split content into ${chunks.length} chunks.`);

            const summaries = [];
            for (let i = 0; i < chunks.length; i++) {
                console.log(`Summarizing chunk ${i + 1} of ${chunks.length}...`);
                const summarizationContent = `${summarizationPrompt}\n\n${chunks[i]}`;
                
                const model = genAI.getGenerativeModel({ model: modelChoice });
                await rateLimiter();
                const result = await model.generateContent(summarizationContent);
                const response = await result.response;
                const summary = response.text();
                summaries.push(summary);

                if (i < chunks.length - 1) {
                    console.log("Waiting for 65 seconds before next API call to respect rate limits...");
                    await delay(65000);
                }
            }

            console.log("All chunks summarized. Combining summaries...");
            contentToSendToAI = summaries.join("\n\n---\n\n");
        }

        const userMessageContent = `${generationPrompt}\n\n${contentToSendToAI}`;

        const model = genAI.getGenerativeModel({ model: modelChoice });
        await rateLimiter();
        const result = await model.generateContent(userMessageContent, { maxOutputTokens: 65536 });
        const response = await result.response;
        const text = response.text();

        if (text) {
            const initialResponseDir = "./initial_responses";
            if (!fs.existsSync(initialResponseDir)) {
                fs.mkdirSync(initialResponseDir);
            }
            const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
            const initialResponseFileName = `initial_response_${timestamp}.txt`;
            const initialResponsePath = path.join(initialResponseDir, initialResponseFileName);
            fs.writeFileSync(initialResponsePath, text, "utf8");
            console.log(`Initial AI response saved to: ${initialResponsePath}`);

            try {
                const jsonStartIndex = text.indexOf("{");
                const jsonEndIndex = text.lastIndexOf("}");
                let jsonString = text;

                if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                    jsonString = text.substring(jsonStartIndex, jsonEndIndex + 1);
                } else {
                    throw new Error("Malformed JSON response: No valid JSON object found.");
                }

                console.log("Verifying generated JSON with AI...");
                const verifiedJsonString = await verifyJsonWithAI(jsonString, modelChoice);
                console.log("Fact-checking generated JSON with AI...");
                const factCheckedJsonString = await factCheckWithAI(verifiedJsonString, modelChoice);

                const finalCourseJson = JSON.parse(factCheckedJsonString);
                const finalMarkdown = convertJsonToMarkdown(finalCourseJson);

                return finalMarkdown;

            } catch (parseError) {
                console.error(`Error parsing JSON from Gemini response:`, parseError);
                const errorLogsDir = "./error_logs";
                if (!fs.existsSync(errorLogsDir)) {
                    fs.mkdirSync(errorLogsDir);
                }
                const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
                const promptFileName = path.join(errorLogsDir, `prompt_error_${timestamp}.txt`);
                const responseFileName = path.join(errorLogsDir, `response_error_${timestamp}.txt`);
                fs.writeFileSync(promptFileName, userMessageContent, "utf8");
                fs.writeFileSync(responseFileName, text, "utf8");
                console.log(`Error prompt saved to: ${promptFileName}`);
                console.log(`Error response saved to: ${responseFileName}`);
                throw new Error("Gemini API response was not valid JSON.");
            }
        } else {
            throw new Error("Gemini API response was malformed or empty.");
        }

    } catch (error) {
        console.error("Error in Gemini API call:", error.message);
        throw new Error(`Gemini API call failed.`);
    }
}

function convertJsonToMarkdown(jsonData) {
    let markdown = `# ${jsonData.courseTitle}\n\n`;

    jsonData.modules.forEach(module => {
        markdown += `## ${module.moduleTitle}\n\n`;

        if (module.notes && module.notes.summary) {
            markdown += `### notes - ${module.notes.summary}\n\n`;
        }

        if (module.flashcards && module.flashcards.length > 0) {
            markdown += `### flashcards\n`;
            module.flashcards.forEach(card => {
                markdown += `Q: ${card.question}\n`;
                markdown += `A: ${card.answer}\n\n`;
            });
        }

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
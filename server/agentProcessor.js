const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Rate Limiter
const requestTimestamps = [];
const MAX_REQUESTS_PER_MINUTE = 15;
const MAX_MODULES = 75; // Added a max modules limit

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

// Prompts for the agent
const chunkingPrompt = `You are a course creation agent. Your first task is to analyze the provided textbook content. Identify and list all chapters, sub-sections, and core topics in a structured JSON format. The root object must have a "courseTitle" (string) and a "modules" (array of objects) property. Each object in the "modules" array should represent a chapter and have a "title" (string) and "content" (string). If you cannot identify any chapters, return an empty "modules" array. The response should not be too large and must end with - END OF RESPONSE -.`;

const combinedPrompt = `Based on the content for the chapter "[Chapter Name]", generate a complete learning module. This module should include:\n\n1.  **Notes:** Detailed, easy-to-understand notes covering all the key concepts. Use bullet points and sub-headings to make them highly readable. The notes should be concise but comprehensive.\n2.  **Flashcards:** 20 flashcards, each with a "front" (a question) and a "back" (the answer). Focus on fundamental terms and concepts.\n3.  **Quiz:** A 10-question multiple-choice quiz. Each question should have a "question" string, an array of "options", and a string indicating the "correct_answer". Ensure distractors are plausible.\n\nReturn the entire module as a single, valid JSON object with the following structure: { "notes": "...", "flashcards": [...], "quiz": [...] }. If the provided text is insufficient to generate any of these, return an empty object for that key (e.g., "flashcards": []).`;

const verificationPrompt = `You are a JSON syntax validator and corrector. Your task is to analyze the provided text, which is supposed to be a JSON object, and ensure it is a single, complete, and valid JSON object.\n\n**Strict Rules:**\n1.  **Analyze the input:** Check for any syntax errors, missing brackets, incorrect commas, or any other JSON validation issues.\n2.  **Correct the input:** If the JSON is invalid or incomplete, fix it. Ensure all objects and arrays are properly closed.\n3.  **Escape Quotes:** Pay special attention to unescaped double quotes within string values. These are a common source of errors. Find any double quotes that are part of the text content and escape them with a backslash (e.g., "hello" becomes "hello").\n4.  **Return ONLY the JSON:** Your output MUST be ONLY the corrected, valid JSON object. Do not include any other text, explanations, or markdown fences. The output must be directly parsable by \`JSON.parse()\`. \n5.  **If the input is already valid:** Simply return the original, unmodified JSON.\n\nHere is the JSON to validate and correct:\n`;

const factCheckPrompt = `You are an expert fact-checker and content improver. Your task is to review the provided course content (in JSON format) for factual accuracy, clarity, and completeness. If you find any inaccuracies, ambiguities, or areas that could be improved for better learning, correct them. Ensure the information is truthful and well-presented. Maintain the original JSON structure. Your output MUST be a single, complete, and valid JSON object, representing the fact-checked and corrected course content. Do not include any extraneous text, explanations, or markdown fences outside of the pure JSON object.\n\nHere is the course content (JSON) to fact-check and correct:\n`;

async function factCheckWithAI(jsonString, model) {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error("Google API Key is missing.");
    }
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const factCheckModel = genAI.getGenerativeModel({ model: model });

    const prompt = `${factCheckPrompt}\n\n${jsonString}`;

    try {
        await rateLimiter();
        const result = await factCheckModel.generateContent(prompt);
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

// Function to save error logs
function saveErrorLog(step, prompt, response, error) {
    console.error(`Error during agent step: ${step}`, error);
    const errorLogsDir = "./error_logs";
    if (!fs.existsSync(errorLogsDir)) {
        fs.mkdirSync(errorLogsDir);
    }
    const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
    const promptFileName = path.join(errorLogsDir, `prompt_error_${timestamp}_${step}.txt`);
    const responseFileName = path.join(errorLogsDir, `response_error_${timestamp}_${step}.txt`);

    const errorDetails = `Error during step: ${step}\n\nError: ${error.message}\n\nStack: ${error.stack}`;

    fs.writeFileSync(promptFileName, prompt, "utf8");
    fs.writeFileSync(responseFileName, `--- AI RESPONSE THAT CAUSED ERROR ---\n${response}\n\n--- ERROR DETAILS ---\n${errorDetails}`, "utf8");
    
    console.log(`Agent error log for step '${step}' saved to ${responseFileName}`);
}

// Function to handle API calls with exponential backoff
async function generateWithBackoff(model, prompt, maxRetries = 5) {
    await rateLimiter();
    let attempt = 0;
    let backoff = 1000; // Start with 1 second
    while (attempt < maxRetries) {
        try {
            const result = await model.generateContent(prompt);
            return result;
        } catch (error) {
            if (error.status === 429) {
                console.warn(`Rate limit hit. Retrying in ${backoff}ms...`);
                await delay(backoff);
                backoff *= 2; // Double the backoff time for the next attempt
                attempt++;
            } else {
                throw error; // Re-throw other errors immediately
            }
        }
    }
    throw new Error("Max retries reached. Could not complete the API request.");
}

// Function to verify and correct JSON using an AI model
async function verifyJsonWithAI(jsonString, model) {
    const sanitizedJson = extractJson(jsonString);
    if (!sanitizedJson) {
        console.warn("Could not extract a valid JSON object or array from the response.");
        return jsonString;
    }

    const prompt = `${verificationPrompt}\n\n${sanitizedJson}`;
    const result = await generateWithBackoff(model, prompt);
    const response = await result.response;
    const validatedText = response.text();

    if (validatedText && (validatedText.trim().startsWith("{") || validatedText.trim().startsWith("["))) {
        console.log("AI verification successful. Returning validated JSON.");
        return validatedText;
    } else {
        console.warn("AI verification did not return a valid JSON object. Returning original string.");
        return sanitizedJson;
    }
}

// Function to convert the final JSON course structure to Markdown
function convertJsonToMarkdown(jsonData) {
    let markdown = `# ${jsonData.courseTitle}\n\n`;

    jsonData.modules.forEach(module => {
        markdown += `## ${module.moduleTitle}\n\n`;

        if (module.notes) {
            markdown += `### notes - ${module.notes}\n\n`;
        }

        if (module.flashcards && module.flashcards.length > 0) {
            markdown += `### flashcards\n`;
            module.flashcards.forEach(card => {
                markdown += `Q: ${card.front}\n`;
                markdown += `A: ${card.back}\n\n`;
            });
        }

        if (module.quiz && module.quiz.length > 0) {
            markdown += `### quiz\n`;
            module.quiz.forEach(q => {
                markdown += `Q: ${q.question}\n`;
                if (Array.isArray(q.options)) {
                    q.options.forEach((option, index) => {
                        markdown += `${String.fromCharCode(65 + index)}) ${option}\n`;
                    });
                }
                markdown += `CORRECT: ${q.correct_answer}\n\n`;
            });
        }
    });

    return markdown;
}

async function processPdfWithAgent(fileBuffer, mimeType, modelChoice) {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error("Google API Key is missing.");
    }
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelChoice });

    let textContent;
    console.log("Agent: Starting PDF processing...");
    if (mimeType === "application/pdf") {
        const data = await pdfParse(fileBuffer);
        textContent = data.text;
    } else {
        textContent = fileBuffer.toString("utf-8");
    }
    console.log("Agent: PDF content extracted successfully.");

    // 1. Content Chunking & Analysis
    let chapters;
    let chunkingText = "";
    const TOKEN_LIMIT = 150000; // Set a token limit for chunking
    const estimatedTokens = textContent.length / 4; // Simple estimation

    if (estimatedTokens > TOKEN_LIMIT) {
        console.log(`Estimated tokens (${Math.round(estimatedTokens)}) exceed the limit of ${TOKEN_LIMIT}. Chunking and summarizing...`);

        const charLimit = TOKEN_LIMIT * 3; // Use a character limit that's safely under the token limit
        const chunks = [];
        for (let i = 0; i < textContent.length; i += charLimit) {
            chunks.push(textContent.substring(i, i + charLimit));
        }

        console.log(`Split content into ${chunks.length} chunks.`);

        const summaries = [];
        for (let i = 0; i < chunks.length; i++) {
            console.log(`Summarizing chunk ${i + 1} of ${chunks.length}...`);
            const summarizationContent = `${chunkingPrompt}\n\n${chunks[i]}`;
            
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
        textContent = summaries.join("\n\n---\n\n");
    }

    const chunkingRequest = `${chunkingPrompt}\n\n${textContent}`;
    try {
        console.log("Agent: Sending content to AI for chunking and analysis...");
        const chunkingResult = await generateWithBackoff(model, chunkingRequest);
        const chunkingResponse = await chunkingResult.response;
        chunkingText = chunkingResponse.text();
        console.log("Agent: Received chunking response from AI.");

        const verifiedChunkingText = await verifyJsonWithAI(chunkingText, model);
        chapters = JSON.parse(verifiedChunkingText);
        console.log("Agent: Successfully parsed course structure.");

        if (!chapters.courseTitle || !Array.isArray(chapters.modules)) {
            throw new Error("Invalid course structure returned from AI. Missing courseTitle or modules array.");
        }

        if (chapters.modules.length > MAX_MODULES) {
            throw new Error(`The AI generated an unexpectedly high number of modules (${chapters.modules.length}). Aborting to prevent excessive API usage.`);
        }

    } catch (error) {
        saveErrorLog("chunking", chunkingRequest, chunkingText, error);
        throw new Error("Failed to parse course structure from AI response.");
    }

    const course = {
        courseTitle: chapters.courseTitle,
        modules: []
    };

    for (const chapter of chapters.modules) {
        console.log(`Agent: Processing chapter - ${chapter.title}`);
        const chapterContent = chapter.content;

        // 2. Generate Combined Module
        let moduleData;
        let moduleText = "";
        const moduleRequest = `${combinedPrompt.replace("[Chapter Name]", chapter.title)}\n\n${chapterContent}`;
        try {
            console.log(`Agent: Generating combined module for '${chapter.title}'...`);
            const moduleResult = await generateWithBackoff(model, moduleRequest);
            const moduleResponse = moduleResult.response;
            moduleText = moduleResponse.text();
            console.log(`Agent: Received combined module response for '${chapter.title}'.`);
            const verifiedModuleText = await verifyJsonWithAI(moduleText, model);
            const factCheckedModuleText = await factCheckWithAI(verifiedModuleText, model);
            moduleData = JSON.parse(factCheckedModuleText);
            console.log(`Agent: Successfully parsed and fact-checked combined module for '${chapter.title}'.`);
        } catch (error) {
            saveErrorLog(`combined-${chapter.title}`, moduleRequest, moduleText, error);
            moduleData = { notes: "", flashcards: [], quiz: [] }; // Create an empty module on failure
        }

        course.modules.push({
            moduleTitle: chapter.title,
            notes: moduleData.notes,
            flashcards: moduleData.flashcards,
            quiz: moduleData.quiz
        });
    }

    console.log("Agent: All modules processed. Converting final course to Markdown...");
    const finalMarkdown = convertJsonToMarkdown(course);

    const outputPath = `./generated_courses/course_${new Date().toISOString().replace(/[:.-]/g, "_")}.txt`;
    fs.writeFileSync( outputPath, finalMarkdown, "utf8");
    console.log(`Agent: Generated course saved to: ${outputPath}`);

    return finalMarkdown;
}

module.exports = { processPdfWithAgent };
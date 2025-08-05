const { GoogleGenerativeAI } = require("@google/generative-ai");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const requestTimestamps = [];
const MAX_REQUESTS_PER_MINUTE = 15;
const MAX_MODULES = 75;

async function rateLimiter() {
    const now = Date.now();
    while (requestTimestamps.length > 0 && now - requestTimestamps[0] > 60000) {
        requestTimestamps.shift();
    }
    if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
        const timeToWait = 60000 - (now - requestTimestamps[0]);
        console.log(`Rate limit approaching. Waiting for ${timeToWait}ms...`);
        await delay(timeToWait);
    }
    requestTimestamps.push(now);
}

// NEW PROMPT: A dedicated prompt for AI-driven chapter detection.
const chapterDetectionPrompt = `You are a course structure analysis agent. Your task is to analyze the provided text from a course guide and identify its chapters. Return the identified chapters as a single JSON object with the following structure:
{
  "courseTitle": "string",
  "modules": [
    { "title": "string (chapter title)", "content": "string (full text content of the chapter)" },
    ...
  ]
}
The 'courseTitle' should be "Virginia Tech Corps of Cadets Family Guide 2024-2025".
The 'modules' array should contain an object for each chapter found. Each object must have a 'title' and the 'content' of that chapter. If you cannot identify distinct chapters, return the entire content as a single module with the title "Course Content". Do not include any text, explanations, or markdown fences outside of the pure JSON object.

Text to analyze:\n`;

const moduleGenerationPrompt = `You are a course creation agent. Your task is to generate a comprehensive learning module based on the provided chapter content. The module must be returned as a single, valid JSON object with the following structure:
{
  "moduleTitle": "string",
  "notes": "string (detailed, easy-to-understand notes covering all key concepts)",
  "flashcards": [
    { "front": "string (question)", "back": "string (answer)" },
    ... (10-20 flashcards in total)
  ],
  "quiz": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correct_answer": "string (the correct option text)"
    },
    ... (5-10 quiz questions in total)
  ]
}
If the provided chapter content is insufficient to generate any of these components, return an empty object or array for that key (e.g., "flashcards": []). Do not include any text, explanations, or markdown fences outside of the pure JSON object.

Chapter Content:\n`;

const verificationPrompt = `You are a JSON syntax validator and corrector. Your task is to analyze the provided text, which is supposed to be a JSON object, and ensure it is a single, complete, and valid JSON object. Your output MUST be ONLY the corrected, valid JSON object. Do not include any other text, explanations, or markdown fences. The output must be directly parsable by \`JSON.parse()\`. \n\nJSON to validate and correct:\n`;

async function verifyJsonWithAI(jsonString, model) {
    const sanitizedJson = extractJson(jsonString);
    if (!sanitizedJson) {
        console.warn("Could not extract a valid JSON object or array from the response. Returning original string.");
        return jsonString;
    }
    const prompt = `${verificationPrompt}\n\n${sanitizedJson}`;
    try {
        const result = await generateWithBackoff(model, prompt);
        const response = result.response;
        const validatedText = response.text();
        if (validatedText && (validatedText.trim().startsWith("{") || validatedText.trim().startsWith("["))) {
            console.log("AI verification successful. Returning validated JSON.");
            return validatedText;
        } else {
            console.warn("AI verification did not return a valid JSON object. Returning original string.");
            return sanitizedJson;
        }
    } catch (error) {
        console.error("Error during AI JSON verification:", error);
        return sanitizedJson;
    }
}

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

async function generateWithBackoff(model, prompt, maxRetries = 5) {
    await rateLimiter();
    let attempt = 0;
    let backoff = 1000;
    while (attempt < maxRetries) {
        try {
            const result = await model.generateContent(prompt);
            return result;
        } catch (error) {
            if (error.status === 429) {
                console.warn(`Rate limit hit. Retrying in ${backoff}ms...`);
                await delay(backoff);
                backoff *= 2;
                attempt++;
            } else {
                throw error;
            }
        }
    }
    throw new Error("Max retries reached. Could not complete the API request.");
}

function convertJsonToMarkdown(jsonData) {
    let markdown = `# ${jsonData.courseTitle}\n\n`;
    jsonData.modules.forEach(module => {
        markdown += `## ${module.moduleTitle}\n\n`;
        if (module.notes) {
            markdown += `### Notes\n\n${module.notes}\n\n`;
        }
        if (module.flashcards && module.flashcards.length > 0) {
            markdown += `### Flashcards\n`;
            module.flashcards.forEach(card => {
                markdown += `Q: ${card.front}\n`;
                markdown += `A: ${card.back}\n\n`;
            });
        }
        if (module.quiz && module.quiz.length > 0) {
            markdown += `### Quiz\n`;
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

// NEW FUNCTION: Use AI to extract course structure from text
async function extractCourseStructureWithAI(textContent, model) {
    console.log("Agent: Sending content to AI for chapter detection...");
    const prompt = chapterDetectionPrompt + textContent;

    try {
        const result = await generateWithBackoff(model, prompt);
        const responseText = result.response.text();
        console.log("Agent: Received AI response for chapter detection. Verifying JSON...");

        const verifiedText = await verifyJsonWithAI(responseText, model);
        const courseStructure = JSON.parse(verifiedText);

        if (!courseStructure || !Array.isArray(courseStructure.modules) || !courseStructure.courseTitle) {
            console.warn("AI failed to return a valid course structure. Falling back to single module.");
            return {
                courseTitle: "Virginia Tech Corps of Cadets Family Guide 2024-2025",
                modules: [{ title: "Course Content", content: textContent.trim() }]
            };
        }

        console.log(`Agent: Successfully parsed course structure with ${courseStructure.modules.length} modules.`);
        return courseStructure;

    } catch (error) {
        saveErrorLog("chapter-detection", prompt, "N/A", error);
        console.error("Error during AI-based chapter detection. Falling back to single module.", error);
        return {
            courseTitle: "Virginia Tech Corps of Cadets Family Guide 2024-2025",
            modules: [{ title: "Course Content", content: textContent.trim() }]
        };
    }
}


async function processPdfWithAgent(fileBuffer, mimeType, modelChoice) {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error("Google API Key is missing.");
    }
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelChoice });

    let textContent;
    console.log("Agent: Starting content extraction...");
    if (mimeType === "application/pdf") {
        const data = await pdfParse(fileBuffer);
        textContent = data.text;
    } else {
        textContent = fileBuffer.toString("utf-8");
    }
    console.log(`Agent: PDF content extracted successfully. Total characters: ${textContent.length}`);

    let courseStructure;
    try {
        courseStructure = await extractCourseStructureWithAI(textContent, model);
    } catch (error) {
        saveErrorLog("structure-extraction", textContent, "N/A", error);
        throw new Error("Failed to parse course structure from content.");
    }

    const finalCourse = {
        courseTitle: courseStructure.courseTitle,
        modules: []
    };

    if (courseStructure.modules.length > MAX_MODULES) {
        throw new Error(`Too many modules (${courseStructure.modules.length}) detected. Aborting to prevent excessive API usage.`);
    }

    for (const chapter of courseStructure.modules) {
        if (chapter.content.trim().length === 0) {
            console.warn(`Warning: Chapter '${chapter.title}' has no content. Skipping module generation.`);
            finalCourse.modules.push({
                moduleTitle: chapter.title,
                notes: "",
                flashcards: [],
                quiz: []
            });
            continue;
        }

        let moduleData;
        let moduleResponseText = "";
        
        const moduleRequest = moduleGenerationPrompt + `\n\n${chapter.content}`;
        console.log(`Agent: Generating module for chapter '${chapter.title}'...`);
        try {
            const moduleResult = await generateWithBackoff(model, moduleRequest);
            moduleResponseText = moduleResult.response.text();
            console.log(`Agent: Received response for '${chapter.title}'. Verifying JSON...`);
            
            const verifiedModuleText = await verifyJsonWithAI(moduleResponseText, model);
            moduleData = JSON.parse(verifiedModuleText);
            
            finalCourse.modules.push({
                moduleTitle: chapter.title,
                notes: moduleData.notes || "",
                flashcards: moduleData.flashcards || [],
                quiz: moduleData.quiz || []
            });
            console.log(`Agent: Successfully processed and added module for '${chapter.title}'.`);
        } catch (error) {
            saveErrorLog(`module-generation-${chapter.title}`, moduleRequest, moduleResponseText, error);
            console.error(`Error processing chapter '${chapter.title}'. Adding empty module.`);
            finalCourse.modules.push({
                moduleTitle: chapter.title,
                notes: "",
                flashcards: [],
                quiz: []
            });
        }
    }

    console.log("Agent: All modules processed. Converting final course to Markdown...");
    const finalMarkdown = convertJsonToMarkdown(finalCourse);
    const outputPath = `./generated_courses/course_${new Date().toISOString().replace(/[:.-]/g, "_")}.txt`;
    fs.writeFileSync(outputPath, finalMarkdown, "utf8");
    console.log(`Agent: Generated course saved to: ${outputPath}`);

    return finalMarkdown;
}

module.exports = { processPdfWithAgent };
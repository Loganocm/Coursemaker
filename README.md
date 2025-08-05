# Courseforge2: AI-Powered Learning Material Generation

## Project Overview

Courseforge is an innovative application designed to revolutionize the creation of educational content. It automates the process of transforming raw document content (such as PDFs or text files) into structured, comprehensive learning modules, complete with notes, flashcards, and quizzes. This tool significantly reduces the manual effort and time required to develop engaging and effective course materials, making it invaluable for educators, trainers, and content developers.

## Technical Architecture

Courseforge follows a client-server architecture, ensuring a clear separation of concerns and scalability.

### Frontend (Client)

- **Framework:** React with Vite for a fast and efficient development experience.
- **Language:** TypeScript, providing type safety and improved code maintainability.
- **Styling:** Tailwind CSS for utility-first CSS, enabling rapid UI development and consistent design.
- **Dependencies:** `firebase` for potential future integration with backend services (e.g., user authentication, data storage), `lucide-react` for icons, `pdf-parse` (though primarily used on the server, it's listed here as a dependency for completeness if any client-side parsing was intended or for type definitions), `react-dom`.
- **Testing:** Jest and React Testing Library for robust unit and integration testing of UI components.

### Backend (Server)

- **Runtime:** Node.js with Express.js for building a robust and scalable API.
- **AI Integration:** Utilizes Google's Generative AI (Gemini API) for content generation, summarization, and validation.
- **PDF Processing:** `pdf-parse` for extracting text content from PDF documents.
- **Utilities:** `dotenv` for environment variable management, `cors` for handling cross-origin requests, `multer` for file uploads, `uuid` for unique ID generation.
- **Testing:** Jest and Supertest for API testing.

## Core Functionality and AI Workflow

The heart of Courseforge lies in its intelligent AI processing pipeline, orchestrated by `aiProcessor.js` and `agentProcessor.js` on the server.

1.  **Document Ingestion:** Users upload PDF or text files to the application.
2.  **Content Extraction:** The server uses `pdf-parse` to extract raw text from PDF documents.
3.  **Intelligent Content Processing (`agentProcessor.js`):**
    - **Chapter Detection:** The AI analyzes the extracted text to identify and segment it into logical chapters or modules. This is a crucial step for structuring the course content effectively.
    - **Content Chunking & Summarization (if necessary):** For very large documents, the content is intelligently chunked to fit within AI model token limits. Each chunk is then summarized by the AI to retain essential information, which is then combined for comprehensive processing. This prevents loss of context and ensures all relevant information is considered.
    - **Module Generation:** For each identified chapter, the AI generates detailed learning materials, including:
      - **Notes:** Comprehensive summaries of the chapter's key concepts.
      - **Flashcards:** Interactive question-and-answer pairs for self-assessment.
      - **Quizzes:** Multiple-choice questions to test understanding.
4.  **AI Response Verification and Fact-Checking (`aiProcessor.js`):**
    - **JSON Validation:** AI-generated responses are rigorously validated to ensure they adhere to a strict JSON schema. This involves checking for syntax errors, missing elements, and proper formatting.
    - **Fact-Checking:** The AI performs an additional pass to fact-check the generated content, ensuring accuracy and clarity. This step is vital for maintaining the quality and reliability of the learning materials.
5.  **Markdown Conversion:** The structured JSON output is then converted into a human-readable Markdown format, making it easy to review, edit, and integrate into various learning platforms.
6.  **Error Handling & Logging:** Comprehensive error logging is implemented to capture issues during AI processing, API calls, and JSON parsing, aiding in debugging and system maintenance.

## Problem Solving in Code

Several key challenges were addressed in the development of Courseforge:

- **Handling Large Documents:** Large documents often exceed the token limits of AI models. This was solved by implementing a robust **chunking and summarization pipeline**. Documents are split into manageable chunks, summarized by the AI, and then these summaries are combined for the final course generation. This ensures that even extensive materials can be processed without losing critical information.
- **Ensuring Valid AI Output:** AI models can sometimes produce malformed or incomplete JSON. This was mitigated through:
  - **Strict Prompt Engineering:** Prompts are meticulously crafted with explicit instructions for JSON structure, character limits, and the absolute requirement for valid JSON output.
  - **AI-driven JSON Verification:** A dedicated AI verification step (`verifyJsonWithAI`) is used to correct and validate the JSON output, ensuring it is always parseable and correctly structured.
  - **`extractJson` Utility:** A utility function `extractJson` is used to robustly extract JSON objects from AI responses that might contain extraneous text.
- **Managing API Rate Limits:** Frequent AI API calls can quickly hit rate limits. A custom **`rateLimiter` and `generateWithBackoff` mechanism** was implemented to manage API call frequency, introducing delays and retries to ensure smooth operation and prevent service interruptions.
- **Robust Error Logging:** Detailed error logs are generated for each stage of the AI processing pipeline, capturing prompts, responses, and error details. This is crucial for identifying and debugging issues related to AI model behavior or unexpected outputs.

## Workflow for Users

1.  **Upload Document:** The user uploads a PDF or text file through the intuitive frontend interface.
2.  **AI Processing:** The backend processes the document using its AI pipeline, generating course content. This may take some time depending on the document size.
3.  **Course Generation:** Once processed, the application presents the generated learning materials in a structured Markdown format.
4.  **Review & Utilize:** Users can then review the generated course, make any necessary adjustments, and utilize it for their educational purposes.

## Technologies Used

### Frontend

- React
- Vite
- TypeScript
- Tailwind CSS
- Firebase (for potential future integrations)
- Lucide React (icons)
- Jest
- React Testing Library

### Backend

- Node.js
- Express.js
- Google Generative AI (Gemini API)
- `pdf-parse`
- `dotenv`
- `cors`
- `multer`
- `uuid`
- Jest
- Supertest

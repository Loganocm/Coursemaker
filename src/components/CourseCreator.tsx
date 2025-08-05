import React, { useState } from "react";
import { BookOpen, FileText, Plus } from "lucide-react";
import { parseCourseText } from "../utils/courseParser";
import { Course } from "../types";

interface CourseCreatorProps {
  onCourseCreate: (course: Course) => void;
}

const CourseCreator: React.FC<CourseCreatorProps> = ({ onCourseCreate }) => {
  const [creationMode, setCreationMode] = useState<"standard" | "agent">(
    "standard"
  );
  const [preview, setPreview] = useState<Course | null>(null);

  const sampleText = `# Introduction to React

## Module 1: React Basics

### Notes - React is a JavaScript library for building user interfaces. It allows developers to create reusable UI components and manage application state efficiently.

Key concepts:
- Components: Reusable pieces of UI
- Props: Data passed to components
- State: Component-specific data that can change
- JSX: JavaScript syntax extension for writing HTML-like code

### Flashcards
Q: What is React?
A: A JavaScript library for building user interfaces

Q: What is JSX?
A: A syntax extension for JavaScript that allows writing HTML-like code

Q: What are props in React?
A: Data passed from parent components to child components

Q: What is state in React?
A: Component-specific data that can change

### Quiz
Q: Which of the following is NOT a core concept of React?
A) Components
B) Props
C) Variables
D) State
CORRECT: C

Q: What does JSX stand for?
A) JavaScript XML
B) Java Syntax Extension
C) JavaScript Extension
D) Java XML
CORRECT: A

Q: How do you pass data from a parent component to a child component in React?
A) Using state
B) Using props
C) Using context
D) Using refs
CORRECT: B

Q: Which of the following is a benefit of using React?
A) Faster page load times
B) Easier debugging
C) Reusable UI components
D) Built-in routing
CORRECT: C

## Module 2: State Management

### Notes - State management is crucial in React applications. The useState hook allows functional components to have local state.

Important points:
- State should be immutable
- Use setState function to update state
- Lifting state up for shared state

### Flashcards
Q: What is the purpose of the useState hook?
A: To add state to functional components

Q: Why is state considered immutable in React?
A: To ensure predictable updates and avoid side effects

Q: How do you update state in a functional component?
A: Using the setState function returned by useState

Q: What is "lifting state up" in React?
A: Moving shared state to the closest common ancestor component

### Quiz
Q: Which hook is used for state management in functional components?
A) useEffect
B) useState
C) useContext
D) useReducer
CORRECT: B

Q: What is the recommended way to update state in React?
A) Directly modifying the state object
B) Using the setState function
C) Using a forceUpdate method
D) Using a ref
CORRECT: B

Q: Why should state be immutable in React?
A) To prevent direct manipulation of the DOM
B) To ensure predictable updates and avoid side effects
C) To improve performance of re-renders
D) To make state easier to debug
CORRECT: B

Q: When should you use the \`useReducer\` hook instead of \`useState\`?
A) For simple state management
B) When state logic is complex or involves multiple sub-values
C) When state updates are infrequent
D) When you need to perform side effects
CORRECT: B

Q: Which of the following is a common pattern for sharing state between sibling components?
A) Passing state directly between siblings
B) Lifting state up to their common parent
C) Using a global variable
D) Using a ref to access sibling state
CORRECT: B
`;

  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  const handleFileUpload = async () => {
    if (!file || isUploading) {
      return;
    }
    setIsUploading(true);
    setUploadStatus("Uploading and processing... This may take a moment.");

    const formData = new FormData();
    formData.append("pdfFile", file);

    const endpoint =
      creationMode === "standard"
        ? "http://localhost:3001/generate-course"
        : "http://localhost:3001/create-course-agent";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate course.");
      }

      const courseMarkdown = await response.text();
      console.log("Received course markdown:", courseMarkdown);
      const parsedCourse = parseCourseText(courseMarkdown);
      console.log("Parsed course:", parsedCourse);
      onCourseCreate(parsedCourse);
      setUploadStatus("Course generated successfully!");
    } catch (error) {
      console.error(error);
      setUploadStatus(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const loadSample = () => {
    setPreview(parseCourseText(sampleText));
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Course Creator
        </h1>
        <p className="text-gray-600">
          Create interactive courses from a PDF or load a sample.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex justify-center mb-4">
            <button
              onClick={() =>
                setCreationMode(
                  creationMode === "standard" ? "agent" : "standard"
                )
              }
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor:
                  creationMode === "standard" ? "#3b82f6" : "#e5e7eb",
                color: creationMode === "standard" ? "white" : "black",
              }}
            >
              Standard AI Mode
            </button>
            <button
              onClick={() =>
                setCreationMode(
                  creationMode === "standard" ? "agent" : "standard"
                )
              }
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={{
                backgroundColor:
                  creationMode === "agent" ? "#3b82f6" : "#e5e7eb",
                color: creationMode === "agent" ? "white" : "black",
              }}
            >
              Agent Mode
            </button>
          </div>
          <label htmlFor="pdf-upload" className="font-medium text-gray-900">
            Generate from PDF
          </label>
          <input
            id="pdf-upload"
            type="file"
            onChange={handleFileChange}
            accept=".pdf"
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={handleFileUpload}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            disabled={!file || isUploading}
          >
            {isUploading
              ? uploadStatus
              : creationMode === "standard"
              ? "Upload and Generate"
              : "Upload and Generate with Agent"}
          </button>
          {isUploading && (
            <p className="text-sm text-gray-500 text-center">{uploadStatus}</p>
          )}
        </div>

        <button
          onClick={loadSample}
          className="w-full py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Load Sample
        </button>
      </div>

      {preview && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {preview.title}
              </h3>
              <div className="space-y-4">
                {preview.modules.map((module, index) => (
                  <div
                    key={module.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h4 className="font-semibold text-gray-900 mb-3">
                      {module.title}
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center text-blue-600">
                        <FileText className="w-4 h-4 mr-1" />
                        Notes
                      </div>
                      <div className="flex items-center text-green-600">
                        <BookOpen className="w-4 h-4 mr-1" />
                        {module.flashcards.length} Cards
                      </div>
                      <div className="flex items-center text-orange-600">
                        <Plus className="w-4 h-4 mr-1" />
                        {module.quiz.length} Questions
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => onCourseCreate(preview)}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Create Course
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseCreator;

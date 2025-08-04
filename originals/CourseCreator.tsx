import React, { useState } from "react";
import { BookOpen, FileText, Plus } from "lucide-react";
import { parseCourseText } from "../utils/courseParser";
import { Course } from "../types";

interface CourseCreatorProps {
  onCourseCreate: (course: Course) => void;
}

const CourseCreator: React.FC<CourseCreatorProps> = ({ onCourseCreate }) => {
  const [textInput, setTextInput] = useState("");
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

### Quiz
Q: Which hook is used for state management in functional components?
A) useEffect
B) useState
C) useContext
D) useReducer
CORRECT: B
`;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setTextInput(value);

    if (value.trim()) {
      try {
        const parsed = parseCourseText(value);
        setPreview(parsed);
      } catch (error) {
        setPreview(null);
      }
    } else {
      setPreview(null);
    }
  };

  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("pdfFile", file);
    formData.append("aiModel", "claude-haiku");

    try {
      const response = await fetch("http://localhost:3000/generate-course", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "An unknown error occurred.");
      }

      const data = await response.json();
      const parsed = parseAIGeneratedCourse(data);
      onCourseCreate(parsed);
    } catch (error) {
      console.error(error);
      // Handle error display in the UI
    }
  };

  const loadSample = () => {
    setTextInput(sampleText);
    setPreview(parseCourseText(sampleText));
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Course Creator
        </h1>
        <p className="text-gray-600">
          Create interactive courses with structured text input
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Course Content
            </h2>
            <button
              onClick={loadSample}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Load Sample
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
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
              disabled={!file}
            >
              Upload and Generate
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Syntax Guide:</h3>
            <pre className="text-sm text-gray-600 bg-white p-3 rounded-md overflow-x-auto">
              <code>
                {`{
                      "courseTitle": "Your Course Title",
                      "modules": [
                        {
                          "moduleTitle": "Module Title",
                          "notes": {
                            "summary": "Notes summary (200-300 words)",
                            "keywords": ["keyword1", "keyword2"]
                          },
                          "flashcards": [
                            { "question": "Flashcard Q", "answer": "Flashcard A" }
                          ],
                          "quiz": [
                            {
                              "question": "Quiz Question",
                              "options": { "A": "Option A", "B": "Option B" },
                              "correctAnswer": "A"
                            }
                          ]
                        }
                      ]
                    }`}
              </code>
            </pre>
          </div>

          <textarea
            value={textInput}
            onChange={handleTextChange}
            placeholder="Enter your course content using the syntax above..."
            className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
        </div>

        {/* Preview Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Preview</h2>

          {preview ? (
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
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                Enter course content to see preview
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCreator;

import React, { useState } from 'react';
import { Course, AIGeneratedCourse } from './types';
import CourseCreator from './components/CourseCreator';
import CourseViewer from './components/CourseViewer';

import { parseAIGeneratedCourse } from './utils/courseParser';

function App() {
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [aiResponse, setAiResponse] = useState<AIGeneratedCourse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCourseCreate = (course: Course) => {
    setCurrentCourse(course);
  };

  const handleBackToCourseCreator = () => {
    setCurrentCourse(null);
    setAiResponse(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentCourse ? (
        <CourseViewer 
          course={currentCourse} 
          onBack={handleBackToCourseCreator}
        />
      ) : (
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">CourseForge</h1>
          <h2 className="text-xl font-semibold mb-2">Create Course</h2>
          <CourseCreator onCourseCreate={handleCourseCreate} />
        </div>
      )}
    </div>
  );
}

export default App;
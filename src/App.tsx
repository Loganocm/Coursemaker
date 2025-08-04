import React, { useState } from "react";
import { Course, AIGeneratedCourse } from "./types";
import CourseCreator from "./components/CourseCreator";
import CourseViewer from "./components/CourseViewer";
import CourseList from "./components/CourseList";

import { parseAIGeneratedCourse } from "./utils/courseParser";

function App() {
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [savedCourses, setSavedCourses] = useState<Course[]>(() => {
    const stored = localStorage.getItem("savedCourses");
    return stored ? JSON.parse(stored) : [];
  });

  const handleCourseCreate = (course: Course) => {
    setCurrentCourse(course);
    const updated = [...savedCourses, course];
    setSavedCourses(updated);
    localStorage.setItem("savedCourses", JSON.stringify(updated));
  };

  const handleBackToCourseCreator = () => {
    setCurrentCourse(null);
  };

  const handleViewCourse = (index: number) => {
    setCurrentCourse(savedCourses[index]);
  };

  // Add this function to handle AI-generated courses
  const handleAIGeneratedCourse = (aiCourse: Course | AIGeneratedCourse) => {
    // If you use a parser for AI courses, parse it here
    const parsedCourse: Course =
      "lessons" in aiCourse ? aiCourse : parseAIGeneratedCourse(aiCourse);
    setCurrentCourse(parsedCourse);
    const updated = [...savedCourses, parsedCourse];
    setSavedCourses(updated);
    localStorage.setItem("savedCourses", JSON.stringify(updated));
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
          <CourseList
            courses={savedCourses}
            onViewCourse={handleViewCourse}
            onAIGeneratedCourse={handleAIGeneratedCourse} // <-- Pass the handler here
          />
        </div>
      )}
    </div>
  );
}

export default App;

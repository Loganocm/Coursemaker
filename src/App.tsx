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

  const handleAIGeneratedCourse = (aiCourse: Course | AIGeneratedCourse) => {
    const parsedCourse: Course =
      "lessons" in aiCourse ? aiCourse : parseAIGeneratedCourse(aiCourse);
    setCurrentCourse(parsedCourse);
    const updated = [...savedCourses, parsedCourse];
    setSavedCourses(updated);
    localStorage.setItem("savedCourses", JSON.stringify(updated));
  };

  const handleClearCourses = () => {
    setSavedCourses([]);
    localStorage.removeItem("savedCourses");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentCourse ? (
        <CourseViewer
          course={currentCourse}
          onBack={handleBackToCourseCreator}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
          <div className="lg:col-span-2">
            <CourseCreator onCourseCreate={handleCourseCreate} />
          </div>
          <div>
            <CourseList
              courses={savedCourses}
              onViewCourse={handleViewCourse}
              onAIGeneratedCourse={handleAIGeneratedCourse}
              onClearCourses={handleClearCourses} // Pass the clear function
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

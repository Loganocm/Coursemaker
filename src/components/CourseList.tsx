import React from 'react';

interface CourseListProps {
  courses: string[];
  onViewCourse: (courseName: string) => void;
}

const CourseList: React.FC<CourseListProps> = ({ courses, onViewCourse }) => {
  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Saved Courses</h2>
      {courses.length === 0 ? (
        <p className="text-gray-600">No courses saved yet. Create one!</p>
      ) : (
        <ul className="space-y-3">
          {courses.map((courseName) => (
            <li key={courseName} className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center shadow-sm">
              <span className="text-lg font-medium text-gray-800">{courseName.replace("course_", "").replace(".txt", "")}</span>
              <button
                onClick={() => onViewCourse(courseName)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                View Course
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CourseList;

import React, { useState } from 'react';
import { ArrowLeft, BookOpen, FileText, HelpCircle, CheckCircle, X } from 'lucide-react';
import { Course, Module, UserProgress } from '../types';
import ModuleNotes from './ModuleNotes';
import ModuleFlashcards from './ModuleFlashcards';
import ModuleQuiz from './ModuleQuiz';

interface CourseViewerProps {
  course: Course;
  onBack: () => void;
}

type ViewMode = 'overview' | 'notes' | 'flashcards' | 'quiz';

const CourseViewer: React.FC<CourseViewerProps> = ({ course, onBack }) => {
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [progress, setProgress] = useState<UserProgress>({
    courseId: 'current',
    currentModuleId: course.modules[0]?.id || '',
    completedModules: [],
    flashcardProgress: {},
    quizScores: {}
  });

  const currentModule = course.modules[currentModuleIndex];

  const updateProgress = (updates: Partial<UserProgress>) => {
    setProgress(prev => ({ ...prev, ...updates }));
  };

  const isModuleCompleted = (moduleId: string) => {
    return progress.completedModules.includes(moduleId);
  };

  const markModuleComplete = (moduleId: string) => {
    if (!isModuleCompleted(moduleId)) {
      updateProgress({
        completedModules: [...progress.completedModules, moduleId]
      });
    }
  };

  if (viewMode !== 'overview') {
    const renderContent = () => {
      switch (viewMode) {
        case 'notes':
          return (
            <ModuleNotes 
              module={currentModule}
              onComplete={() => markModuleComplete(currentModule.id)}
            />
          );
        case 'flashcards':
          return (
            <ModuleFlashcards 
              module={currentModule}
              progress={progress.flashcardProgress[currentModule.id] || []}
              onProgressUpdate={(cardProgress) => {
                updateProgress({
                  flashcardProgress: {
                    ...progress.flashcardProgress,
                    [currentModule.id]: cardProgress
                  }
                });
              }}
              onComplete={() => markModuleComplete(currentModule.id)}
            />
          );
        case 'quiz':
          return (
            <ModuleQuiz 
              module={currentModule}
              onScoreUpdate={(score) => {
                updateProgress({
                  quizScores: {
                    ...progress.quizScores,
                    [currentModule.id]: score
                  }
                });
                markModuleComplete(currentModule.id);
              }}
            />
          );
      }
    };

    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => setViewMode('overview')}
            className="flex items-center text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Module Overview
          </button>
        </div>
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Course Creator
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
            <p className="text-gray-600">
              {course.modules.length} modules • {progress.completedModules.length} completed
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {Math.round((progress.completedModules.length / course.modules.length) * 100)}%
            </div>
            <div className="text-sm text-gray-500">Progress</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-500"
            style={{ 
              width: `${(progress.completedModules.length / course.modules.length) * 100}%` 
            }}
          />
        </div>
      </div>

      {/* Module Navigation */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2">
          {course.modules.map((module, index) => (
            <button
              key={module.id}
              onClick={() => setCurrentModuleIndex(index)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                index === currentModuleIndex
                  ? 'bg-blue-600 text-white'
                  : isModuleCompleted(module.id)
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center">
                {isModuleCompleted(module.id) && (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Module {index + 1}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Current Module */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{currentModule.title}</h2>
          {isModuleCompleted(currentModule.id) && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-5 h-5 mr-2" />
              Completed
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Notes */}
          <div 
            onClick={() => setViewMode('notes')}
            className="bg-blue-50 rounded-lg p-6 cursor-pointer hover:bg-blue-100 transition-colors border-2 border-transparent hover:border-blue-300"
          >
            <div className="flex items-center mb-4">
              <FileText className="w-8 h-8 text-blue-600 mr-3" />
              <h3 className="text-lg font-semibold text-blue-900">Notes</h3>
            </div>
            <p className="text-blue-700 text-sm mb-4">
              Study the key concepts and information for this module.
            </p>
            <div className="text-blue-600 font-medium">Read Notes →</div>
          </div>

          {/* Flashcards */}
          <div 
            onClick={() => setViewMode('flashcards')}
            className="bg-green-50 rounded-lg p-6 cursor-pointer hover:bg-green-100 transition-colors border-2 border-transparent hover:border-green-300"
          >
            <div className="flex items-center mb-4">
              <BookOpen className="w-8 h-8 text-green-600 mr-3" />
              <h3 className="text-lg font-semibold text-green-900">Flashcards</h3>
            </div>
            <p className="text-green-700 text-sm mb-4">
              {currentModule.flashcards.length} cards to help reinforce your learning.
            </p>
            <div className="text-green-600 font-medium">Study Cards →</div>
          </div>

          {/* Quiz */}
          <div 
            onClick={() => setViewMode('quiz')}
            className="bg-orange-50 rounded-lg p-6 cursor-pointer hover:bg-orange-100 transition-colors border-2 border-transparent hover:border-orange-300"
          >
            <div className="flex items-center mb-4">
              <HelpCircle className="w-8 h-8 text-orange-600 mr-3" />
              <h3 className="text-lg font-semibold text-orange-900">Quiz</h3>
            </div>
            <p className="text-orange-700 text-sm mb-4">
              Test your knowledge with {currentModule.quiz.length} questions.
            </p>
            <div className="flex items-center justify-between">
              <div className="text-orange-600 font-medium">Take Quiz →</div>
              {progress.quizScores[currentModule.id] !== undefined && (
                <div className="text-sm text-orange-700">
                  Score: {progress.quizScores[currentModule.id]}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseViewer;
import React, { useState } from 'react';
import { CheckCircle, X, RotateCcw, Award } from 'lucide-react';
import { Module, QuizQuestion } from '../types';

interface ModuleQuizProps {
  module: Module;
  onScoreUpdate: (score: number) => void;
}

const ModuleQuiz: React.FC<ModuleQuizProps> = ({ module, onScoreUpdate }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const currentQuestion = module.quiz[currentQuestionIndex];
  const totalQuestions = module.quiz.length;

  const selectAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      finishQuiz();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const finishQuiz = () => {
    setShowResults(true);
    setQuizCompleted(true);
    
    const correctAnswers = module.quiz.reduce((count, question, index) => {
      return count + (selectedAnswers[index] === question.correctAnswer ? 1 : 0);
    }, 0);
    
    const score = Math.round((correctAnswers / totalQuestions) * 100);
    onScoreUpdate(score);
  };

  const resetQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);
    setQuizCompleted(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return 'Excellent work!';
    if (score >= 80) return 'Great job!';
    if (score >= 70) return 'Good effort!';
    if (score >= 60) return 'Not bad, but you can do better!';
    return 'Keep studying and try again!';
  };

  if (module.quiz.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500">No quiz questions available for this module.</p>
      </div>
    );
  }

  if (showResults) {
    const correctAnswers = module.quiz.reduce((count, question, index) => {
      return count + (selectedAnswers[index] === question.correctAnswer ? 1 : 0);
    }, 0);
    const score = Math.round((correctAnswers / totalQuestions) * 100);

    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
          <p className="text-gray-600">{module.title}</p>
        </div>

        <div className="text-center mb-8">
          <div className={`text-6xl font-bold mb-2 ${getScoreColor(score)}`}>
            {score}%
          </div>
          <p className="text-xl text-gray-700 mb-2">
            {correctAnswers} out of {totalQuestions} correct
          </p>
          <p className="text-lg text-gray-600">{getScoreMessage(score)}</p>
        </div>

        <div className="space-y-4 mb-8">
          {module.quiz.map((question, index) => {
            const userAnswer = selectedAnswers[index];
            const isCorrect = userAnswer === question.correctAnswer;
            
            return (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start mb-3">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1 mr-3 flex-shrink-0" />
                  ) : (
                    <X className="w-5 h-5 text-red-600 mt-1 mr-3 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2">{question.question}</p>
                    <div className="space-y-1">
                      <p className={`text-sm ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        Your answer: {question.options[userAnswer]}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-green-700">
                          Correct answer: {question.options[question.correctAnswer]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center">
          <button
            onClick={resetQuiz}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{module.title}</h2>
          <p className="text-gray-600">Quiz</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-orange-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h3 className="text-xl font-medium text-gray-900 mb-6">
          {currentQuestion.question}
        </h3>
        
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => (
            <button
              key={index}
              onClick={() => selectAnswer(index)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                selectedAnswers[currentQuestionIndex] === index
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${
                  selectedAnswers[currentQuestionIndex] === index
                    ? 'border-orange-500 bg-orange-500'
                    : 'border-gray-300'
                }`}>
                  {selectedAnswers[currentQuestionIndex] === index && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <span className="text-gray-900">{option}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={prevQuestion}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex gap-2">
          {Array.from({ length: totalQuestions }, (_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index === currentQuestionIndex
                  ? 'bg-orange-600'
                  : selectedAnswers[index] !== undefined
                  ? 'bg-green-400'
                  : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        <button
          onClick={nextQuestion}
          disabled={selectedAnswers[currentQuestionIndex] === undefined}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestionIndex === totalQuestions - 1 ? 'Finish Quiz' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default ModuleQuiz;
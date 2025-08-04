import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle } from 'lucide-react';
import { Module } from '../types';

interface ModuleFlashcardsProps {
  module: Module;
  progress: boolean[];
  onProgressUpdate: (progress: boolean[]) => void;
  onComplete: () => void;
}

const ModuleFlashcards: React.FC<ModuleFlashcardsProps> = ({
  module,
  progress,
  onProgressUpdate,
  onComplete
}) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardProgress, setCardProgress] = useState<boolean[]>(
    progress.length === module.flashcards.length ? progress : new Array(module.flashcards.length).fill(false)
  );

  const currentCard = module.flashcards[currentCardIndex];
  const completedCount = cardProgress.filter(Boolean).length;

  const nextCard = () => {
    if (currentCardIndex < module.flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  };

  const markCardComplete = () => {
    const newProgress = [...cardProgress];
    newProgress[currentCardIndex] = true;
    setCardProgress(newProgress);
    onProgressUpdate(newProgress);

    if (newProgress.every(Boolean)) {
      onComplete();
    }
  };

  const resetProgress = () => {
    const newProgress = new Array(module.flashcards.length).fill(false);
    setCardProgress(newProgress);
    onProgressUpdate(newProgress);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  if (module.flashcards.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <p className="text-gray-500">No flashcards available for this module.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{module.title}</h2>
          <p className="text-gray-600">Flashcards</p>
        </div>
        <button
          onClick={resetProgress}
          className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">
            Card {currentCardIndex + 1} of {module.flashcards.length}
          </span>
          <span className="text-sm text-green-600">
            {completedCount}/{module.flashcards.length} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / module.flashcards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex justify-center mb-8">
        <div
          className="relative w-full max-w-2xl h-80 cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div className={`absolute inset-0 w-full h-full transition-transform duration-600 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
            {/* Front */}
            <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg flex items-center justify-center p-8">
              <div className="text-center">
                <h3 className="text-white text-xl font-medium mb-4">Question</h3>
                <p className="text-white text-lg leading-relaxed">{currentCard.question}</p>
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg flex items-center justify-center p-8 rotate-y-180">
              <div className="text-center">
                <h3 className="text-white text-xl font-medium mb-4">Answer</h3>
                <p className="text-white text-lg leading-relaxed">{currentCard.answer}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <button
          onClick={prevCard}
          disabled={currentCardIndex === 0}
          className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Previous
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            {isFlipped ? 'Show Question' : 'Show Answer'}
          </button>

          {isFlipped && !cardProgress[currentCardIndex] && (
            <button
              onClick={markCardComplete}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Got It!
            </button>
          )}
        </div>

        <button
          onClick={nextCard}
          disabled={currentCardIndex === module.flashcards.length - 1}
          className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-5 h-5 ml-1" />
        </button>
      </div>

      {completedCount === module.flashcards.length && (
        <div className="mt-6 text-center p-4 bg-green-50 rounded-lg">
          <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-green-800 font-medium">All flashcards completed!</p>
        </div>
      )}
    </div>
  );
};

export default ModuleFlashcards;
import { Course, Module, Flashcard, QuizQuestion, AIGeneratedCourse } from '../types';

export function parseCourseText(text: string): Course {
  const lines = text.split('\n').map(line => line.trim());
  
  let course: Course = {
    title: '',
    modules: []
  };
  
  let currentModule: Partial<Module> | null = null;
  let currentSection: 'notes' | 'flashcards' | 'quiz' | null = null;
  let currentContent: string[] = [];
  
  for (const line of lines) {
    // Skip empty lines
    if (line.length === 0) {
      continue;
    }
    
    // Course title
    if (line.startsWith('# ')) {
      const titlePart = line.substring(2);
      // Handle format like "# Course Title - The Essentials of..."
      course.title = titlePart.includes(' - ') ? titlePart.split(' - ')[1] : titlePart;
      continue;
    }
    
    // Module title
    if (line.startsWith('## ')) {
      // Save previous module if exists
      if (currentModule) {
        finishCurrentSection(currentModule, currentSection, currentContent);
        course.modules.push(currentModule as Module);
      }
      
      // Start new module
      const titlePart = line.substring(3);
      // Handle format like "## Module Title - Chapter 1: Introduction"
      const moduleTitle = titlePart.includes(' - ') ? titlePart.split(' - ')[1] : titlePart;
      currentModule = {
        id: generateId(),
        title: moduleTitle,
        notes: '',
        flashcards: [],
        quiz: []
      };
      currentSection = null;
      currentContent = [];
      continue;
    }
    
    // Section headers with content on same line
    if (line.startsWith('### ')) {
      // Finish previous section
      if (currentModule && currentSection) {
        finishCurrentSection(currentModule, currentSection, currentContent);
      }
      
      const fullLine = line.substring(4);
      const parts = fullLine.split(' - ');
      
      if (parts.length >= 2) {
        const sectionTitle = parts[0].toLowerCase();
        const content = parts.slice(1).join(' - '); // Rejoin in case there are multiple " - " in content
        
        if (sectionTitle === 'notes') {
          currentSection = 'notes';
          currentContent = [content];
        } else if (sectionTitle === 'flashcards') {
          currentSection = 'flashcards';
          currentContent = [content];
        } else if (sectionTitle === 'quiz') {
          currentSection = 'quiz';
          currentContent = [content];
        } else {
          currentSection = null;
          currentContent = [];
        }
      } else {
        // Handle section headers without content on same line
        const sectionTitle = fullLine.toLowerCase();
        if (sectionTitle === 'notes') {
          currentSection = 'notes';
        } else if (sectionTitle === 'flashcards') {
          currentSection = 'flashcards';
        } else if (sectionTitle === 'quiz') {
          currentSection = 'quiz';
        } else {
          currentSection = null;
        }
        currentContent = [];
      }
      continue;
    }
    
    // Content lines (for multi-line sections)
    if (currentSection && !line.startsWith('#')) {
      currentContent.push(line);
    }
  }
  
  // Finish last module
  if (currentModule) {
    finishCurrentSection(currentModule, currentSection, currentContent);
    course.modules.push(currentModule as Module);
  }
  
  return course;
}

function finishCurrentSection(
  module: Partial<Module>, 
  section: 'notes' | 'flashcards' | 'quiz' | null, 
  content: string[]
) {
  if (!section || !module || content.length === 0) return;
  
  const fullContent = content.join('\n').trim();
  
  switch (section) {
    case 'notes':
      module.notes = fullContent;
      break;
    case 'flashcards':
      module.flashcards = parseFlashcards(content);
      break;
    case 'quiz':
      module.quiz = parseQuiz(content);
      break;
  }
}

function parseFlashcards(content: string[]): Flashcard[] {
  const flashcards: Flashcard[] = [];
  let currentQuestion = '';
  let currentAnswer = '';
  let isQuestion = false;

  for (const line of content) {
    if (line.startsWith('Q:')) {
      if (currentQuestion && currentAnswer) {
        flashcards.push({ id: generateId(), question: currentQuestion.trim(), answer: currentAnswer.trim() });
      }
      currentQuestion = line.substring(2).trim();
      isQuestion = true;
    } else if (line.startsWith('A:')) {
      currentAnswer = line.substring(2).trim();
      isQuestion = false;
    } else if (isQuestion) {
      currentQuestion += ' ' + line.trim(); // Append to question if it's a multi-line question
    } else if (currentAnswer) {
      currentAnswer += ' ' + line.trim(); // Append to answer if it's a multi-line answer
    }
  }

  if (currentQuestion && currentAnswer) {
    flashcards.push({ id: generateId(), question: currentQuestion.trim(), answer: currentAnswer.trim() });
  }

  return flashcards;
}

function parseQuiz(content: string[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  let currentQuestionText = '';
  let currentOptions: string[] = [];
  let currentCorrectAnswer: number | null = null;

  for (const line of content) {
    if (line.startsWith('Q:')) {
      // If we have a complete question from previous lines, push it
      if (currentQuestionText && currentOptions.length > 0 && currentCorrectAnswer !== null) {
        questions.push({
          id: generateId(),
          question: currentQuestionText.trim(),
          options: currentOptions,
          correctAnswer: currentCorrectAnswer
        });
      }
      // Start a new question
      currentQuestionText = line.substring(2).trim();
      currentOptions = [];
      currentCorrectAnswer = null;
    } else if (line.match(/^[A-D]\)/)) {
      // This is an option line
      currentOptions.push(line.substring(2).trim());
    } else if (line.startsWith('CORRECT:')) {
      // This is the correct answer line
      const correctLetter = line.substring(8).trim();
      currentCorrectAnswer = correctLetter.charCodeAt(0) - 'A'.charCodeAt(0);
    } else if (currentQuestionText) {
      // Append to question if it's a multi-line question
      currentQuestionText += ' ' + line.trim();
    }
  }

  // Push the last question if it exists
  if (currentQuestionText && currentOptions.length > 0 && currentCorrectAnswer !== null) {
    questions.push({
      id: generateId(),
      question: currentQuestionText.trim(),
      options: currentOptions,
      correctAnswer: currentCorrectAnswer
    });
  }

  return questions;
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function parseAIGeneratedCourse(aiCourse: AIGeneratedCourse): Course {
  const course: Course = {
    title: aiCourse.courseTitle,
    modules: aiCourse.modules.map(aiModule => ({
      id: generateId(),
      title: aiModule.moduleTitle,
      notes: aiModule.notes.summary,
      flashcards: aiModule.flashcards.map(card => ({
        id: generateId(),
        question: card.question,
        answer: card.answer,
      })),
      quiz: aiModule.quiz.map(q => ({
        id: generateId(),
        question: q.question,
        options: Object.values(q.options), // Convert options object to array
        correctAnswer: q.correctAnswer.charCodeAt(0) - 'A'.charCodeAt(0), // Convert 'A', 'B', etc. to 0, 1, etc.
      })),
    })),
  };

  return course;
}
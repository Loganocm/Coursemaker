export interface AIGeneratedCourse {
  courseTitle: string;
  modules: AIGeneratedModule[];
}

export interface AIGeneratedModule {
  moduleTitle: string;
  notes: {
    summary: string;
    keywords: string[];
  };
  flashcards: {
    question: string;
    answer: string;
  }[];
  quiz: {
    question: string;
    options: {
      [key: string]: string; // A, B, C, D
    };
    correctAnswer: string; // A, B, C, D
  }[];
}

export interface Course {
  title: string;
  modules: Module[];
}

export interface Module {
  title: string;
  notes: {
    summary: string;
    keywords: string[];
  };
  flashcards: {
    question: string;
    answer: string;
  }[];
  quiz: {
    question: string;
    options: {
      [key: string]: string; // A, B, C, D
    };
    correctAnswer: string; // A, B, C, D
  }[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface UserProgress {
  courseId: string;
  currentModuleId: string;
  completedModules: string[];
  flashcardProgress: Record<string, boolean[]>;
  quizScores: Record<string, number>;
}
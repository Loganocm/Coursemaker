import { parseAIGeneratedCourse } from '../utils/courseParser';
import { AIGeneratedCourse, Course } from '../types';

describe('parseAIGeneratedCourse', () => {
  const mockAIGeneratedCourse: AIGeneratedCourse = {
    courseTitle: "AI Generated Course",
    modules: [
      {
        moduleTitle: "Main Module",
        notes: {
          summary: "This is a summary of AI concepts.",
          keywords: ["AI", "concepts"]
        },
        flashcards: [
          { question: "What is AI?", answer: "Artificial Intelligence" },
          { question: "Who is Alan Turing?", answer: "Father of AI" },
        ],
        quiz: [
          {
            question: "Which of these is an AI concept?",
            options: { A: "Machine Learning", B: "Cooking", C: "Sleeping", D: "Running" },
            correctAnswer: "A",
          },
          {
            question: "What does ML stand for?",
            options: { A: "Machine Learning", B: "Mega Laptops", C: "Many Lights", D: "My Life" },
            correctAnswer: "A",
          },
        ],
      },
    ],
  };

  test('should correctly parse AI generated content into a Course object', () => {
    const course: Course = parseAIGeneratedCourse(mockAIGeneratedCourse);

    expect(course).toBeDefined();
    expect(course.courseTitle).toBe('AI Generated Course');
    expect(course.modules.length).toBe(1);

    const module = course.modules[0];
    expect(module.moduleTitle).toBe('Main Module');
    expect(module.notes.summary).toBe(mockAIGeneratedCourse.modules[0].notes.summary);
    expect(module.notes.keywords).toEqual(mockAIGeneratedCourse.modules[0].notes.keywords);

    expect(module.flashcards.length).toBe(mockAIGeneratedCourse.modules[0].flashcards.length);
    expect(module.flashcards[0].question).toBe(mockAIGeneratedCourse.modules[0].flashcards[0].question);
    expect(module.flashcards[0].answer).toBe(mockAIGeneratedCourse.modules[0].flashcards[0].answer);

    expect(module.quiz.length).toBe(mockAIGeneratedCourse.modules[0].quiz.length);
    expect(module.quiz[0].question).toBe(mockAIGeneratedCourse.modules[0].quiz[0].question);
    expect(module.quiz[0].options).toEqual(mockAIGeneratedCourse.modules[0].quiz[0].options);
    expect(module.quiz[0].correctAnswer).toBe(mockAIGeneratedCourse.modules[0].quiz[0].correctAnswer);
  });

  test('should handle empty notes, flashcards, and quizzes', () => {
    const emptyAIGeneratedCourse: AIGeneratedCourse = {
      courseTitle: "Empty Course",
      modules: [
        {
          moduleTitle: "Empty Module",
          notes: { summary: '', keywords: [] },
          flashcards: [],
          quiz: [],
        },
      ],
    };

    const course: Course = parseAIGeneratedCourse(emptyAIGeneratedCourse);

    expect(course).toBeDefined();
    expect(course.courseTitle).toBe('Empty Course');
    expect(course.modules.length).toBe(1);
    expect(course.modules[0].notes.summary).toBe('');
    expect(course.modules[0].notes.keywords).toEqual([]);
    expect(course.modules[0].flashcards.length).toBe(0);
    expect(course.modules[0].quiz.length).toBe(0);
  });
});
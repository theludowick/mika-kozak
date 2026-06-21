export const QUERY_KEYS = {
  quizQuestions: ['quiz', 'questions'] as const,
  menuItems: ['menu', 'items'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  quizAttempts: (userId: string) => ['quiz', 'attempts', userId] as const,
} as const;

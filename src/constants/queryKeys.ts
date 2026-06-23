export const QUERY_KEYS = {
  quizQuestions: ['quiz', 'questions'] as const,
  menuItems: ['menu', 'items'] as const,
  menuPhotos: (itemId: string) => ['menu', 'photos', itemId] as const,
  categories: ['menu', 'categories'] as const,
  subCategories: ['menu', 'sub_categories'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  quizAttempts: (userId: string) => ['quiz', 'attempts', userId] as const,
  hiddenPositions:       ['settings', 'hidden_positions'] as const,
  reportedIssues:        ['issues', 'reported'] as const,
  unresolvedIssueCount:  ['issues', 'unresolved_count'] as const,
} as const;

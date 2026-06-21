export const TOPIC_LIST = [
  'Explain a dish',
  'Describe a dish',
  'Guest Scenario',
  'General menu questions',
  'Wine List knowledge',
  'Wine Service',
  "What's the dish in the photo",
  'Operations',
  'Non alcoholic drinks',
  'Cocktails and other spirits',
] as const;

export type TopicName = (typeof TOPIC_LIST)[number];

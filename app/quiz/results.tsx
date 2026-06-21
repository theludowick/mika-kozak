import { Redirect } from 'expo-router';

// Results are rendered inline in the quiz tab; this route is a fallback redirect.
export default function QuizResultsPage() {
  return <Redirect href="/(tabs)/quiz" />;
}

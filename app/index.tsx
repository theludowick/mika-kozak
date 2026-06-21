import { Redirect } from 'expo-router';
import { useAuth } from '../src/features/auth/AuthContext';
import { LoadingState } from '../src/components/ui/LoadingState';

export default function Index() {
  const { isLoading, session } = useAuth();

  if (isLoading) return <LoadingState message="Restoring session…" />;
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)/quiz" />;
}

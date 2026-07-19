import { Redirect } from 'expo-router';

export default function Index() {
  // Root index redirects to tabs (auth will be handled by _layout)
  return <Redirect href="/(tabs)/explore" />;
}

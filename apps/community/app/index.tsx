import { Redirect } from 'expo-router';

export default function Index() {
  // The app opens straight to what's on; no sign-in needed to browse
  return <Redirect href="/(tabs)/tonight" />;
}

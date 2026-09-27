import { Redirect } from 'expo-router';

export default function Index() {
  // No sign-in needed to browse. The root layout shows the welcome screen first
  // to anyone who hasn't confirmed their age.
  return <Redirect href="/(tabs)/whats-on" />;
}

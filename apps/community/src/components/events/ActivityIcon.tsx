import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Activity icon keys (stored in Firestore) mapped to the icon set
const ICONS: Record<string, IconName> = {
  music: 'music',
  sparkles: 'shimmer',
  paw: 'paw',
  book: 'book-open-variant',
  mic: 'microphone',
  'help-circle': 'help-circle-outline',
  guitar: 'guitar-acoustic',
  smile: 'emoticon-happy-outline',
  dice: 'dice-5-outline',
  glass: 'glass-cocktail',
  coffee: 'coffee-outline',
  megaphone: 'bullhorn-outline',
  film: 'filmstrip',
  star: 'star-four-points-outline',
  heart: 'heart-outline',
  users: 'account-group-outline',
  shield: 'shield-outline',
  cup: 'cup-outline',
  'message-heart': 'heart-multiple-outline',
  palette: 'palette-outline',
  pencil: 'pencil-outline',
  activity: 'run',
  tree: 'pine-tree',
  utensils: 'silverware-fork-knife',
  'life-buoy': 'lifebuoy',
  flag: 'flag-outline',
  everything: 'dots-horizontal',
};

const FALLBACK_ICON: IconName = 'star-four-points-outline';

interface ActivityIconProps {
  icon: string;
  color: string;
  size?: number;
}

export const ActivityIcon: React.FC<ActivityIconProps> = ({ icon, color, size = 26 }) => (
  <MaterialCommunityIcons name={ICONS[icon] ?? FALLBACK_ICON} size={size} color={color} />
);

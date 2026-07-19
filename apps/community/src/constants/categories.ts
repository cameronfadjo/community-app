import { VenueCategory } from '../types';

export interface CategoryInfo {
  id: VenueCategory;
  label: string;
  icon: string; // Emoji or icon name
  description: string;
}

export const VENUE_CATEGORIES: CategoryInfo[] = [
  {
    id: 'resort',
    label: 'Resorts',
    icon: '🏖️',
    description: 'LGBTQ+ friendly resorts and hotels',
  },
  {
    id: 'club',
    label: 'Clubs',
    icon: '💃',
    description: 'Nightclubs and dance venues',
  },
  {
    id: 'bar',
    label: 'Bars',
    icon: '🍸',
    description: 'Bars and lounges',
  },
  {
    id: 'restaurant',
    label: 'Restaurants',
    icon: '🍽️',
    description: 'Dining establishments',
  },
  {
    id: 'event',
    label: 'Events',
    icon: '🎉',
    description: 'Pride events, festivals, and gatherings',
  },
  {
    id: 'attraction',
    label: 'Attractions',
    icon: '🎭',
    description: 'Tourist attractions and activities',
  },
];

export const getCategoryInfo = (categoryId: VenueCategory): CategoryInfo | undefined => {
  return VENUE_CATEGORIES.find((cat) => cat.id === categoryId);
};

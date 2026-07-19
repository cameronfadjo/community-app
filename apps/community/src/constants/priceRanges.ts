import { PriceRange } from '../types';

export interface PriceRangeInfo {
  value: PriceRange;
  label: string;
  symbol: string;
  description: string;
}

export const PRICE_RANGES: PriceRangeInfo[] = [
  {
    value: 1,
    label: 'Budget',
    symbol: '$',
    description: 'Affordable options under $25',
  },
  {
    value: 2,
    label: 'Moderate',
    symbol: '$$',
    description: 'Mid-range options $25-75',
  },
  {
    value: 3,
    label: 'Upscale',
    symbol: '$$$',
    description: 'Upscale options $75-150',
  },
  {
    value: 4,
    label: 'Luxury',
    symbol: '$$$$',
    description: 'Luxury experiences $150+',
  },
];

export const getPriceRangeInfo = (priceRange: PriceRange): PriceRangeInfo | undefined => {
  return PRICE_RANGES.find((range) => range.value === priceRange);
};

export const getPriceSymbol = (priceRange: PriceRange): string => {
  const info = getPriceRangeInfo(priceRange);
  return info?.symbol || '$';
};

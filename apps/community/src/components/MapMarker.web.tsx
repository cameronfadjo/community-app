import React from 'react';
import { Venue } from '../types';

interface MapMarkerProps {
  venue: Venue;
  onPress: () => void;
  isSelected?: boolean;
}

/**
 * Web version of MapMarker
 * This is not used in the web map implementation, but exported for compatibility
 */
export const MapMarker: React.FC<MapMarkerProps> = () => {
  return null;
};

import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';

/**
 * Request location permissions from the user
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'Community needs access to your location to show nearby LGBTQ+ venues and experiences.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Get the user's current location
 */
export const getCurrentLocation = async (): Promise<{
  latitude: number;
  longitude: number;
} | null> => {
  try {
    // On web, use browser geolocation API directly
    if (Platform.OS === 'web') {
      console.log('[Location] Using web geolocation API');
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          console.error('[Location] Geolocation is not supported by this browser');
          resolve(null);
          return;
        }

        console.log('[Location] Requesting position from browser...');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('[Location] Success:', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.error('[Location] Error getting web location:', {
              code: error.code,
              message: error.message,
            });
            resolve(null);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000, // 5 minutes cache
          }
        );
      });
    }

    // On native, use expo-location
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting current location:', error);
    if (Platform.OS !== 'web') {
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please make sure location services are enabled.'
      );
    }
    return null;
  }
};

/**
 * Watch the user's location for updates
 */
export const watchLocation = async (
  callback: (location: { latitude: number; longitude: number }) => void
): Promise<{ remove: () => void } | null> => {
  try {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 50, // Update every 50 meters
      },
      (location) => {
        callback({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    );

    return subscription;
  } catch (error) {
    console.error('Error watching location:', error);
    return null;
  }
};

/**
 * Open directions to a location in the default maps app
 */
export const openDirections = (latitude: number, longitude: number, label?: string) => {
  const scheme = Platform.select({
    ios: 'maps:0,0?q=',
    android: 'geo:0,0?q=',
  });
  const latLng = `${latitude},${longitude}`;
  const url = Platform.select({
    ios: `${scheme}${label || 'Location'}@${latLng}`,
    android: `${scheme}${latLng}(${label || 'Location'})`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${latLng}`,
  });

  if (url) {
    Linking.openURL(url);
  }
};

/**
 * Open phone dialer with a phone number
 */
export const openPhoneDialer = (phoneNumber: string) => {
  const url = `tel:${phoneNumber.replace(/[^0-9+]/g, '')}`;
  Linking.openURL(url);
};

/**
 * Open a website in the browser
 */
export const openWebsite = (url: string) => {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  Linking.openURL(url);
};

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, FONTS } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: BORDER_RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      paddingHorizontal: SPACING.lg,
    };

    // Size
    if (size === 'small') {
      baseStyle.minHeight = 44;
      baseStyle.paddingHorizontal = SPACING.md;
    } else if (size === 'large') {
      baseStyle.minHeight = 60;
    } else {
      baseStyle.minHeight = 56;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    // Variant
    if (variant === 'primary') {
      baseStyle.backgroundColor = COLORS.primary;
    } else if (variant === 'secondary') {
      baseStyle.backgroundColor = COLORS.text;
    } else if (variant === 'outline') {
      baseStyle.backgroundColor = COLORS.surface;
      baseStyle.borderWidth = 1;
      baseStyle.borderColor = COLORS.border;
    } else if (variant === 'text') {
      baseStyle.backgroundColor = 'transparent';
    }

    if (disabled) {
      baseStyle.opacity = 0.5;
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontFamily: FONTS.bold,
    };

    // Size
    if (size === 'small') {
      baseStyle.fontSize = FONT_SIZES.sm;
    } else {
      baseStyle.fontSize = 17;
    }

    // Variant
    if (variant === 'primary' || variant === 'secondary') {
      baseStyle.color = COLORS.textInverse;
    } else if (variant === 'outline') {
      baseStyle.color = COLORS.text;
    } else {
      baseStyle.color = COLORS.primaryDark;
    }

    return baseStyle;
  };

  const spinnerColor =
    variant === 'primary' || variant === 'secondary' ? COLORS.textInverse : COLORS.primary;

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

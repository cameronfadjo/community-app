import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES, FONT_WEIGHTS } from '../constants/theme';

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
      borderRadius: BORDER_RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size
    if (size === 'small') {
      baseStyle.paddingVertical = SPACING.sm;
      baseStyle.paddingHorizontal = SPACING.md;
    } else if (size === 'large') {
      baseStyle.paddingVertical = SPACING.lg;
      baseStyle.paddingHorizontal = SPACING.xl;
    } else {
      baseStyle.paddingVertical = SPACING.md;
      baseStyle.paddingHorizontal = SPACING.lg;
    }

    // Full width
    if (fullWidth) {
      baseStyle.width = '100%';
    }

    // Variant
    if (variant === 'primary') {
      baseStyle.backgroundColor = disabled ? COLORS.border : COLORS.primary;
    } else if (variant === 'secondary') {
      baseStyle.backgroundColor = disabled ? COLORS.border : COLORS.secondary;
    } else if (variant === 'outline') {
      baseStyle.backgroundColor = 'transparent';
      baseStyle.borderWidth = 2;
      baseStyle.borderColor = disabled ? COLORS.border : COLORS.primary;
    } else if (variant === 'text') {
      baseStyle.backgroundColor = 'transparent';
    }

    return baseStyle;
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: FONT_WEIGHTS.semibold,
    };

    // Size
    if (size === 'small') {
      baseStyle.fontSize = FONT_SIZES.sm;
    } else if (size === 'large') {
      baseStyle.fontSize = FONT_SIZES.lg;
    } else {
      baseStyle.fontSize = FONT_SIZES.md;
    }

    // Variant
    if (variant === 'primary' || variant === 'secondary') {
      baseStyle.color = COLORS.textInverse;
    } else if (variant === 'outline' || variant === 'text') {
      baseStyle.color = disabled ? COLORS.textTertiary : COLORS.primary;
    }

    if (disabled) {
      baseStyle.color = COLORS.textTertiary;
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'secondary' ? COLORS.textInverse : COLORS.primary}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

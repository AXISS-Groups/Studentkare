import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { useTheme } from '../theme/theme';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'reward' | 'impiloPill' | 'whitePill';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const { tokens, radius, spacing, isDark } = useTheme();

  // Signature Impilo Pill-in-Pill CTA Variant
  if (variant === 'impiloPill') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.impiloPillOuter,
          {
            backgroundColor: disabled ? tokens.veil : isDark ? tokens.lavender01 : tokens.lavender01,
            borderRadius: radius.full,
            opacity: disabled ? 0.6 : 1,
            width: fullWidth ? '100%' : 'auto',
          },
          style,
        ]}
      >
        <View
          style={[
            styles.impiloPillInner,
            {
              backgroundColor: isDark ? tokens.lavender05 : tokens.silver05,
              borderRadius: radius.full,
              paddingVertical: size === 'sm' ? 8 : size === 'lg' ? 14 : 11,
              paddingHorizontal: size === 'sm' ? 18 : size === 'lg' ? 32 : 24,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={tokens.blue02} size="small" />
          ) : (
            <View style={styles.contentRow}>
              {icon && <View style={{ marginRight: spacing.s8 }}>{icon}</View>}
              <Text
                style={[
                  styles.impiloPillText,
                  {
                    color: isDark ? tokens.blue01 : tokens.blue02,
                    fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
                  },
                  textStyle,
                ]}
              >
                {label}
              </Text>
              {iconRight && <View style={{ marginLeft: spacing.s8 }}>{iconRight}</View>}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // White Pill Variant (used on dark cards or hero backgrounds)
  if (variant === 'whitePill') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        disabled={disabled || loading}
        style={[
          styles.whitePillBase,
          {
            backgroundColor: tokens.silver05,
            borderRadius: radius.full,
            borderColor: tokens.lavender04,
            borderWidth: 1,
            paddingVertical: size === 'sm' ? 8 : size === 'lg' ? 14 : 11,
            paddingHorizontal: size === 'sm' ? 16 : size === 'lg' ? 28 : 22,
            opacity: disabled ? 0.6 : 1,
            width: fullWidth ? '100%' : 'auto',
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={tokens.action} size="small" />
        ) : (
          <View style={styles.contentRow}>
            {icon && <View style={{ marginRight: spacing.s8 }}>{icon}</View>}
            <Text
              style={[
                styles.buttonText,
                {
                  color: tokens.action,
                  fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 14,
                  fontWeight: '700',
                },
                textStyle,
              ]}
            >
              {label}
            </Text>
            {iconRight && <View style={{ marginLeft: spacing.s8 }}>{iconRight}</View>}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const getBackgroundColor = () => {
    if (disabled) return tokens.veil;
    switch (variant) {
      case 'primary':
        return tokens.action;
      case 'secondary':
        return tokens.surface3;
      case 'outline':
      case 'ghost':
        return 'transparent';
      case 'danger':
        return tokens.emergency;
      case 'reward':
        return tokens.reward;
      default:
        return tokens.action;
    }
  };

  const getTextColor = () => {
    if (disabled) return tokens.text3;
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'reward':
        return '#ffffff';
      case 'secondary':
        return tokens.action;
      case 'outline':
        return tokens.text;
      case 'ghost':
        return tokens.action;
      default:
        return '#ffffff';
    }
  };

  const getBorderColor = () => {
    if (variant === 'outline') return tokens.rule;
    return 'transparent';
  };

  const paddingVertical = size === 'sm' ? 8 : size === 'lg' ? 14 : 11;
  const paddingHorizontal = size === 'sm' ? 14 : size === 'lg' ? 26 : 20;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.buttonBase,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1 : 0,
          paddingVertical,
          paddingHorizontal,
          borderRadius: radius.full,
          opacity: disabled ? 0.6 : 1,
          width: fullWidth ? '100%' : 'auto',
          boxShadow: variant === 'primary' ? '0 4px 14px rgba(82, 79, 217, 0.32)' : 'none',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={{ marginRight: spacing.s8 }}>{icon}</View>}
          <Text
            style={[
              styles.buttonText,
              {
                color: getTextColor(),
                fontSize,
                fontWeight: '600',
              },
              textStyle,
            ]}
          >
            {label}
          </Text>
          {iconRight && <View style={{ marginLeft: spacing.s8 }}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  impiloPillOuter: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.25s ease',
  },
  impiloPillInner: {
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15), 0 -1px 2px 0 #b2b0ff inset, 0 0 0 1px rgba(60, 57, 185, 0.4)',
  },
  impiloPillText: {
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  whitePillBase: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(22, 22, 92, 0.08)',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    textAlign: 'center',
    letterSpacing: -0.3,
  },
});

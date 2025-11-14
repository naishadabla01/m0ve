// app/(auth)/signup.tsx - iOS 26 Glassmorphism
import { supabase } from '@/lib/supabase/client';
import { router } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, BorderRadius, Spacing, Typography, Shadows } from '../../constants/Design';

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleIn, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            display_name: displayName.trim() || firstName.trim(),
          }
        }
      });

      if (authError) throw authError;

      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: authData.user?.id,
          email: email.trim().toLowerCase(),
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          display_name: displayName.trim() || firstName.trim() || email.split('@')[0],
        }, {
          onConflict: 'user_id'
        });

      if (profileError) {
        console.warn('Profile creation warning:', profileError);
      }

      Alert.alert(
        'Success!',
        'Your account has been created!',
        [{ text: 'Get Started', onPress: () => router.replace('/(home)') }]
      );

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background.primary }}>
      <StatusBar barStyle="light-content" />

      {/* Animated Background */}
      <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
        <View
          style={{
            position: "absolute",
            top: -100,
            right: -60,
            width: 280,
            height: 280,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.accent.purple.light,
            opacity: 0.15,
            filter: Platform.OS === 'web' ? 'blur(70px)' : undefined,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -120,
            left: -80,
            width: 320,
            height: 320,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.accent.pink.light,
            opacity: 0.12,
            filter: Platform.OS === 'web' ? 'blur(80px)' : undefined,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: "40%",
            right: -40,
            width: 200,
            height: 200,
            borderRadius: BorderRadius.full,
            backgroundColor: Colors.accent.purple.DEFAULT,
            opacity: 0.1,
            filter: Platform.OS === 'web' ? 'blur(60px)' : undefined,
          }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: Spacing['2xl'],
            paddingVertical: Spacing['4xl'],
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Sign Up Modal */}
          <Animated.View
            style={{
              opacity: fadeIn,
              transform: [{ scale: scaleIn }],
            }}
          >
            <LinearGradient
              colors={Gradients.glass.medium}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: BorderRadius['2xl'],
                borderWidth: 1,
                borderColor: Colors.border.glass,
                padding: Spacing['3xl'],
                ...Shadows.xl,
              }}
            >
              {/* Logo */}
              <View style={{ alignItems: 'center', marginBottom: Spacing.xl }}>
                <LinearGradient
                  colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: BorderRadius.lg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: Spacing.md,
                    ...Shadows.lg,
                  }}
                >
                  <Text
                    style={{
                      color: Colors.text.primary,
                      fontSize: Typography.size['3xl'],
                      fontWeight: Typography.weight.extrabold,
                    }}
                  >
                    M
                  </Text>
                </LinearGradient>
                <Text
                  style={{
                    color: Colors.text.primary,
                    fontSize: Typography.size['2xl'],
                    fontWeight: Typography.weight.bold,
                  }}
                >
                  Create Account
                </Text>
                <Text
                  style={{
                    color: Colors.text.muted,
                    fontSize: Typography.size.sm,
                    marginTop: Spacing.xs,
                  }}
                >
                  Join the Move community
                </Text>
              </View>

              {/* Form */}
              <View style={{ gap: Spacing.lg }}>
                <GlassInput
                  label="First Name (Optional)"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  placeholder="John"
                />

                <GlassInput
                  label="Last Name (Optional)"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  placeholder="Doe"
                />

                <GlassInput
                  label="Display Name (Optional)"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="JohnD"
                />

                <GlassInput
                  label="Email *"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="you@example.com"
                />

                <GlassInput
                  label="Password *"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="At least 6 characters"
                />

                <GlassInput
                  label="Confirm Password *"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="Re-enter password"
                />

                <GradientButton
                  title={loading ? "Creating account..." : "Create Account"}
                  onPress={handleSignUp}
                  disabled={loading}
                  loading={loading}
                />

                <SecondaryButton
                  title="Already have an account? Sign In"
                  onPress={() => router.push('/(auth)/signin')}
                />
              </View>
            </LinearGradient>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* Glassmorphism Input */
function GlassInput(props: any) {
  const { label, ...inputProps } = props;
  return (
    <View style={{ gap: Spacing.sm }}>
      <Text
        style={{
          color: Colors.text.muted,
          fontSize: Typography.size.sm,
          fontWeight: Typography.weight.medium,
        }}
      >
        {label}
      </Text>
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
        style={{
          borderRadius: BorderRadius.md,
          borderWidth: 1,
          borderColor: Colors.border.glass,
          ...Shadows.sm,
        }}
      >
        <TextInput
          {...inputProps}
          placeholderTextColor={Colors.text.muted}
          style={{
            paddingVertical: Spacing.lg,
            paddingHorizontal: Spacing.lg,
            color: Colors.text.primary,
            fontSize: Typography.size.base,
          }}
        />
      </LinearGradient>
    </View>
  );
}

/* Gradient Button */
function GradientButton({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{ marginTop: Spacing.md }}
    >
      {({ pressed }) => (
        <LinearGradient
          colors={[Gradients.purplePink.start, Gradients.purplePink.end]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: Spacing.lg,
            borderRadius: BorderRadius.lg,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.7 : pressed ? 0.9 : 1,
            ...Shadows.lg,
          }}
        >
          {loading ? (
            <ActivityIndicator color={Colors.text.primary} />
          ) : (
            <Text
              style={{
                color: Colors.text.primary,
                fontWeight: Typography.weight.bold,
                fontSize: Typography.size.base,
              }}
            >
              {title}
            </Text>
          )}
        </LinearGradient>
      )}
    </Pressable>
  );
}

/* Secondary Glass Button */
function SecondaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <LinearGradient
          colors={Gradients.glass.light}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: Spacing.lg,
            borderRadius: BorderRadius.lg,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: Colors.border.glass,
            opacity: pressed ? 0.8 : 1,
            ...Shadows.sm,
          }}
        >
          <Text
            style={{
              color: Colors.text.secondary,
              fontWeight: Typography.weight.semibold,
              fontSize: Typography.size.base,
            }}
          >
            {title}
          </Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

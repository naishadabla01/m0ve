// components/profile/AnimatedAvatar.tsx - Dynamic animated avatar with cursive initials and energy decorations
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { Colors, BorderRadius } from '../../constants/Design';
import { EnergyLevel } from '../../constants/MusicPersonalization';

interface AnimatedAvatarProps {
  initials: string;
  size?: number;
  avatarUrl?: string | null;
  energyLevel?: EnergyLevel;
}

export function AnimatedAvatar({ initials, size = 120, avatarUrl, energyLevel = 'chill' }: AnimatedAvatarProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('[AnimatedAvatar] Energy Level:', energyLevel);

    // Continuous rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulsing scale animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [energyLevel]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Animation source based on energy level
  const getAnimationSource = () => {
    switch (energyLevel) {
      case 'chill':
        return require('../../assets/animations/waves.json');
      case 'hyped':
        return require('../../assets/animations/lightning.json');
      case 'storm':
        return require('../../assets/animations/fire.json');
      default:
        return require('../../assets/animations/waves.json');
    }
  };

  return (
    <View style={{ position: 'relative', width: size, height: size }}>
      {/* Animated gradient ring */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size + 8,
          height: size + 8,
          left: -4,
          top: -4,
          transform: [{ rotate }, { scale: scaleAnim }],
        }}
      >
        <LinearGradient
          colors={[
            Colors.accent.purple.light,
            Colors.accent.pink.light,
            '#60a5fa',
            Colors.accent.purple.light,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: size / 2 + 4,
          }}
        />
      </Animated.View>

      {/* Inner circle with animated background */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: Colors.background.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Animated gradient background */}
        <Animated.View
          style={{
            position: 'absolute',
            width: size * 2,
            height: size * 2,
            transform: [{ rotate }],
          }}
        >
          <LinearGradient
            colors={[
              'rgba(168, 85, 247, 0.2)',
              'rgba(236, 72, 153, 0.2)',
              'rgba(96, 165, 250, 0.2)',
              'rgba(168, 85, 247, 0.2)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: '100%',
              height: '100%',
            }}
          />
        </Animated.View>

        {/* Initials in cursive style */}
        {!avatarUrl && (
          <Text
            style={{
              fontSize: size * 0.4,
              color: Colors.text.primary,
              fontWeight: '300',
              fontStyle: 'italic',
              letterSpacing: 2,
              textShadowColor: 'rgba(168, 85, 247, 0.5)',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 10,
            }}
          >
            {initials}
          </Text>
        )}
      </View>

      {/* Energy-based Lottie Animation Decoration - Rendered on top */}
      <View
        style={{
          position: 'absolute',
          width: size + 40,
          height: size + 40,
          left: -20,
          top: -20,
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <LottieView
          source={getAnimationSource()}
          autoPlay
          loop
          style={{
            width: '100%',
            height: '100%',
          }}
          onAnimationFinish={() => console.log('[LottieView] Animation loop completed')}
        />
      </View>
    </View>
  );
}

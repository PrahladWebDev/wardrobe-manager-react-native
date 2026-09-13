import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Fades + slides its children up into place on mount. Stagger multiple
 * instances by giving each an increasing `delay` (ms) so a screen's
 * elements settle in one after another instead of all at once.
 */
export default function FadeInUp({ children, delay = 0, distance = 18, duration = 520, style }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

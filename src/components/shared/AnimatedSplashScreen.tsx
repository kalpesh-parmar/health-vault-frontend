import React, { useEffect, useState } from "react";
import { StyleSheet, View, Dimensions, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Rect, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.createAnimatedComponent(View);

interface AnimatedSplashScreenProps {
  onAnimationEnd: () => void;
}

export default function AnimatedSplashScreen({
  onAnimationEnd,
}: AnimatedSplashScreenProps) {
  const [animationStage, setAnimationStage] = useState(0);

  // Shared values for animations
  const bgOpacity = useSharedValue(0);
  const ecgProgress = useSharedValue(1);
  const vaultScale = useSharedValue(0);
  const vaultOpacity = useSharedValue(0);
  const shieldScale = useSharedValue(0.8);
  const shieldOpacity = useSharedValue(0);
  const card1Orbit = useSharedValue(0);
  const cardScale = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const logoOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const sweepTranslateX = useSharedValue(-150);

  // Floating particles initial shared values
  const p1Y = useSharedValue(height);
  const p2Y = useSharedValue(height - 100);
  const p3Y = useSharedValue(height - 200);

  useEffect(() => {
    // Stage 1: Fade in background and animate ECG line
    bgOpacity.value = withTiming(1, { duration: 1000 });
    
    // Draw ECG line (from right to left in dash offset terms)
    ecgProgress.value = withTiming(0, {
      duration: 1800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    // Animate glowing particles
    p1Y.value = withRepeat(
      withTiming(0, { duration: 5000, easing: Easing.linear }),
      -1,
      false
    );
    p2Y.value = withRepeat(
      withTiming(0, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );
    p3Y.value = withRepeat(
      withTiming(0, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );

    // Stage 2: Vault and Shield appearance
    vaultScale.value = withDelay(
      1800,
      withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.5)) })
    );
    vaultOpacity.value = withDelay(1800, withTiming(1, { duration: 600 }));

    shieldOpacity.value = withDelay(
      2200,
      withTiming(0.4, { duration: 800 })
    );
    shieldScale.value = withDelay(
      2200,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Stage 3: Holographic cards emergence and orbiting
    cardScale.value = withDelay(
      2600,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) })
    );
    card1Orbit.value = withDelay(
      2800,
      withTiming(
        360,
        { duration: 2500, easing: Easing.bezier(0.42, 0, 0.58, 1) },
        (finished) => {
          if (finished) {
            // Stage 4: Spiral cards inside the vault, unlock vault, show logo
            cardScale.value = withTiming(0, { duration: 400 });
            vaultScale.value = withSequence(
              withTiming(1.1, { duration: 200 }),
              withTiming(0, { duration: 600, easing: Easing.in(Easing.ease) })
            );
            vaultOpacity.value = withTiming(0, { duration: 700 });
            shieldOpacity.value = withTiming(0, { duration: 500 });

            // Reveal logo
            logoOpacity.value = withDelay(300, withTiming(1, { duration: 800 }));
            logoScale.value = withDelay(
              300,
              withTiming(1, { duration: 800, easing: Easing.out(Easing.back(1.2)) })
            );

            taglineOpacity.value = withDelay(900, withTiming(1, { duration: 600 }));
            
            // Sweep light across logo
            sweepTranslateX.value = withDelay(
              1100,
              withTiming(300, { duration: 1200, easing: Easing.ease }, (completed) => {
                if (completed) {
                  // Finish and callback
                  runOnJS(onAnimationEnd)();
                }
              })
            );
          }
        }
      )
    );
  }, []);

  // Animated styles
  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const ecgAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 500 * ecgProgress.value,
  }));

  const vaultStyle = useAnimatedStyle(() => ({
    opacity: vaultOpacity.value,
    transform: [{ scale: vaultScale.value }],
  }));

  const shieldStyle = useAnimatedStyle(() => ({
    opacity: shieldOpacity.value,
    transform: [{ scale: shieldScale.value }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sweepTranslateX.value }],
  }));

  // Card orbit calculations
  const card1Style = useAnimatedStyle(() => {
    const angle = (card1Orbit.value * Math.PI) / 180;
    const radius = 95 - (card1Orbit.value / 360) * 40; // Spiraling in effect
    const tx = Math.cos(angle) * radius;
    const ty = Math.sin(angle) * radius;
    return {
      opacity: cardScale.value,
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: cardScale.value },
      ],
    };
  });

  const card2Style = useAnimatedStyle(() => {
    const angle = ((card1Orbit.value + 120) * Math.PI) / 180;
    const radius = 95 - (card1Orbit.value / 360) * 40;
    const tx = Math.cos(angle) * radius;
    const ty = Math.sin(angle) * radius;
    return {
      opacity: cardScale.value,
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: cardScale.value },
      ],
    };
  });

  const card3Style = useAnimatedStyle(() => {
    const angle = ((card1Orbit.value + 240) * Math.PI) / 180;
    const radius = 95 - (card1Orbit.value / 360) * 40;
    const tx = Math.cos(angle) * radius;
    const ty = Math.sin(angle) * radius;
    return {
      opacity: cardScale.value,
      transform: [
        { translateX: tx },
        { translateY: ty },
        { scale: cardScale.value },
      ],
    };
  });

  // Particles styles
  const p1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: p1Y.value }],
  }));
  const p2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: p2Y.value }],
  }));
  const p3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: p3Y.value }],
  }));

  return (
    <AnimatedView style={[styles.container, bgStyle]}>
      <LinearGradient
        colors={["#0a192f", "#0f3a60", "#008080"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating particles background */}
      <AnimatedView style={[styles.particle, { left: 40, width: 4, height: 4 }, p1Style]} />
      <AnimatedView style={[styles.particle, { left: width - 80, width: 6, height: 6 }, p2Style]} />
      <AnimatedView style={[styles.particle, { left: width / 2 - 50, width: 5, height: 5 }, p3Style]} />

      <View style={styles.centerWrapper}>
        {/* ECG Heartbeat Line */}
        <View style={styles.ecgWrapper}>
          <Svg width={300} height={100} viewBox="0 0 300 100">
            <AnimatedPath
              d="M0,50 L80,50 L95,20 L110,80 L125,10 L135,65 L145,50 L300,50"
              fill="none"
              stroke="#00f2fe"
              strokeWidth={3}
              strokeDasharray={500}
              animatedProps={ecgAnimatedProps}
            />
          </Svg>
        </View>

        {/* Glowing Shield behind the vault */}
        <AnimatedView style={[styles.shieldWrapper, shieldStyle]}>
          <Ionicons name="shield-half-sharp" size={170} color="rgba(0, 242, 254, 0.15)" />
        </AnimatedView>

        {/* Secure Vault Icon */}
        <AnimatedView style={[styles.vaultWrapper, vaultStyle]}>
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.18)", "rgba(255, 255, 255, 0.04)"]}
            style={styles.vaultGlass}
          >
            <Ionicons name="lock-closed" size={70} color="#00f2fe" />
          </LinearGradient>
        </AnimatedView>

        {/* Holographic orbit cards */}
        <AnimatedView style={[styles.card, card1Style]}>
          <Ionicons name="document-text" size={24} color="#00f2fe" />
        </AnimatedView>
        <AnimatedView style={[styles.card, card2Style]}>
          <Ionicons name="medical" size={24} color="#00f2fe" />
        </AnimatedView>
        <AnimatedView style={[styles.card, card3Style]}>
          <Ionicons name="flask" size={24} color="#00f2fe" />
        </AnimatedView>
      </View>

      {/* Brand logo & tagline */}
      <View style={styles.footerWrapper}>
        <AnimatedView style={[styles.logoContainer, logoStyle]}>
          <Text style={styles.logoTitle}>Health Vault</Text>
          {/* Light Sweep Effect */}
          <AnimatedView style={[styles.lightSweep, sweepStyle]} />
        </AnimatedView>

        <AnimatedView style={taglineStyle}>
          <Text style={styles.tagline}>Secure. Smart. Always With You.</Text>
        </AnimatedView>
      </View>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a192f",
  },
  particle: {
    position: "absolute",
    backgroundColor: "rgba(0, 242, 254, 0.4)",
    borderRadius: 99,
  },
  centerWrapper: {
    width: 300,
    height: 300,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ecgWrapper: {
    position: "absolute",
    zIndex: 1,
  },
  vaultWrapper: {
    width: 130,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 35,
    overflow: "hidden",
    zIndex: 3,
  },
  vaultGlass: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(0, 242, 254, 0.35)",
    borderRadius: 35,
  },
  shieldWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  card: {
    position: "absolute",
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 242, 254, 0.5)",
    backgroundColor: "rgba(10, 25, 47, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00f2fe",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 4,
  },
  footerWrapper: {
    position: "absolute",
    bottom: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    overflow: "hidden",
    position: "relative",
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 8,
  },
  logoTitle: {
    fontSize: 34,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  lightSweep: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    transform: [{ skewX: "-25deg" }],
  },
  tagline: {
    fontSize: 13,
    color: "#94a3b8",
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.8,
  },
});

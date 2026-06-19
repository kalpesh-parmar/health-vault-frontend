import React, { useEffect, useState } from "react";
import { StyleSheet, View, Dimensions, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle, Rect, G, Defs, LinearGradient as SvgGradient, Stop, RadialGradient, Mask } from "react-native-svg";
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

const { width, height } = Dimensions.get("window");

// Create animated wrapper components
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedView = Animated.createAnimatedComponent(View);

interface AnimatedSplashScreenProps {
  onAnimationEnd: () => void;
}

export default function AnimatedSplashScreen({
  onAnimationEnd,
}: AnimatedSplashScreenProps) {
  // --- ANIMATED SHARED VALUES (Timeline matches 0s - 6s sequence) ---
  
  // Background & Volumetric Light (0s - 1s)
  const bgOpacity = useSharedValue(0);
  const raysOpacity = useSharedValue(0);
  const particlesOpacity = useSharedValue(0);
  
  // Vault & Shield (1s - 2s)
  const vaultOpacity = useSharedValue(0);
  const vaultScale = useSharedValue(0.85);
  const shieldOpacity = useSharedValue(0);
  const shieldScale = useSharedValue(0.7);
  const networkOpacity = useSharedValue(0);

  // Holographic Cards & Door details (2s - 3s)
  const cardLeftTopOpacity = useSharedValue(0);
  const cardLeftBottomOpacity = useSharedValue(0);
  const cardRightTopOpacity = useSharedValue(0);
  const cardRightCenterOpacity = useSharedValue(0);
  const cardRightBottomOpacity = useSharedValue(0);

  const cardLeftTopScale = useSharedValue(0.8);
  const cardLeftBottomScale = useSharedValue(0.8);
  const cardRightTopScale = useSharedValue(0.8);
  const cardRightCenterScale = useSharedValue(0.8);
  const cardRightBottomScale = useSharedValue(0.8);

  const ecgProgress = useSharedValue(1); // ECG heartbeat on the door display
  const greenLocksPulse = useSharedValue(0.5); // Green lock indicators on the door

  // Orbiting Energy Ring (3s - 4s)
  const ringRotation = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.9);

  // Camera Zoom & Reflections Shimmer (4s - 5s)
  const cameraZoomScale = useSharedValue(1);
  const reflectionsShimmer = useSharedValue(0);
  const glowIntensity = useSharedValue(1);

  // Logo & Tagline (5s - 6s)
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(20);

  useEffect(() => {
    // 0s - 1s: Background, rays, and particles fade in
    bgOpacity.value = withTiming(1, { duration: 800 });
    raysOpacity.value = withDelay(200, withTiming(0.85, { duration: 800 }));
    particlesOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));

    // 1s - 2s: Vault & Shield & Network Nodes
    vaultOpacity.value = withDelay(1000, withTiming(1, { duration: 1000 }));
    vaultScale.value = withDelay(1000, withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }));
    shieldOpacity.value = withDelay(1300, withTiming(1, { duration: 700 }));
    shieldScale.value = withDelay(1300, withTiming(1, { duration: 700, easing: Easing.out(Easing.back(1.5)) }));
    networkOpacity.value = withDelay(1500, withTiming(0.5, { duration: 800 }));

    // 2s - 3s: Holographic cards fade in one by one
    cardLeftTopOpacity.value = withDelay(2000, withTiming(1, { duration: 450 }));
    cardLeftTopScale.value = withDelay(2000, withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.5)) }));
    
    cardRightTopOpacity.value = withDelay(2200, withTiming(1, { duration: 450 }));
    cardRightTopScale.value = withDelay(2200, withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.5)) }));

    cardLeftBottomOpacity.value = withDelay(2400, withTiming(1, { duration: 450 }));
    cardLeftBottomScale.value = withDelay(2400, withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.5)) }));

    cardRightCenterOpacity.value = withDelay(2600, withTiming(1, { duration: 450 }));
    cardRightCenterScale.value = withDelay(2600, withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.5)) }));

    cardRightBottomOpacity.value = withDelay(2800, withTiming(1, { duration: 450 }));
    cardRightBottomScale.value = withDelay(2800, withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.5)) }));

    // Door details continuous animations
    ecgProgress.value = withRepeat(
      withTiming(0, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
    greenLocksPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 3s - 4s: Energy ring orbits and glow
    ringOpacity.value = withDelay(3000, withTiming(1, { duration: 800 }));
    ringScale.value = withDelay(3000, withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }));
    ringRotation.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );

    // 4s - 5s: Camera Zoom-in & Reflections Shimmer & Glow Pulse
    cameraZoomScale.value = withDelay(4000, withTiming(1.08, { duration: 1000, easing: Easing.out(Easing.quad) }));
    reflectionsShimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glowIntensity.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 5s - 6s: Bottom text and tagline fade-in
    textOpacity.value = withDelay(5000, withTiming(1, { duration: 800 }));
    textY.value = withDelay(5000, withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) }));

    // Finish sequence and callback (around 7s to give user time to read text)
    const timeout = setTimeout(() => {
      onAnimationEnd();
    }, 7500);

    return () => clearTimeout(timeout);
  }, []);

  // --- REANIMATED STYLE HOOKS ---

  const rootContainerStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cameraZoomScale.value }],
  }));

  const raysStyle = useAnimatedStyle(() => ({
    opacity: raysOpacity.value,
  }));

  const particlesStyle = useAnimatedStyle(() => ({
    opacity: particlesOpacity.value,
  }));

  const vaultHeroStyle = useAnimatedStyle(() => ({
    opacity: vaultOpacity.value,
    transform: [{ scale: vaultScale.value }],
  }));

  const shieldGlowStyle = useAnimatedStyle(() => ({
    opacity: shieldOpacity.value * glowIntensity.value,
    transform: [{ scale: shieldScale.value }],
  }));

  const networkStyle = useAnimatedStyle(() => ({
    opacity: networkOpacity.value,
  }));

  // Cards styles
  const cardLTStyle = useAnimatedStyle(() => ({
    opacity: cardLeftTopOpacity.value,
    transform: [{ scale: cardLeftTopScale.value }],
  }));
  const cardLBStyle = useAnimatedStyle(() => ({
    opacity: cardLeftBottomOpacity.value,
    transform: [{ scale: cardLeftBottomScale.value }],
  }));
  const cardRTStyle = useAnimatedStyle(() => ({
    opacity: cardRightTopOpacity.value,
    transform: [{ scale: cardRightTopScale.value }],
  }));
  const cardRCStyle = useAnimatedStyle(() => ({
    opacity: cardRightCenterOpacity.value,
    transform: [{ scale: cardRightCenterScale.value }],
  }));
  const cardRBStyle = useAnimatedStyle(() => ({
    opacity: cardRightBottomOpacity.value,
    transform: [{ scale: cardRightBottomScale.value }],
  }));

  // Svg dynamic components props
  const ecgAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: 120 * ecgProgress.value,
  }));

  const greenLock1Props = useAnimatedProps(() => ({
    opacity: greenLocksPulse.value,
    fill: `rgba(46, 213, 115, ${greenLocksPulse.value})`,
  }));

  // Energy ring properties
  const energyRingStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [
      { rotate: `${ringRotation.value}deg` },
      { scale: ringScale.value },
    ],
  }));

  // Bottom Branding Layout Style
  const footerStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  return (
    <AnimatedView style={[styles.container, rootContainerStyle]}>
      {/* 1. Deep navy to cyan gradient background */}
      <LinearGradient
        colors={["#030a16", "#07162c", "#05223c", "#09415c"]}
        locations={[0, 0.4, 0.75, 1.0]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.8, y: 0.9 }}
      />

      {/* 2. Soft volumetric god rays (diagonally top-right) */}
      <AnimatedView style={[StyleSheet.absoluteFill, raysStyle]} pointerEvents="none">
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <SvgGradient id="rayGrad" x1="1" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#00f2fe" stopOpacity="0.35" />
              <Stop offset="30%" stopColor="#00f2fe" stopOpacity="0.12" />
              <Stop offset="70%" stopColor="#09415c" stopOpacity="0.02" />
              <Stop offset="100%" stopColor="#030a16" stopOpacity="0" />
            </SvgGradient>
          </Defs>
          {/* Main Ray Polygon */}
          <Path d={`M${width},0 L${width - 60},0 L-100,${height - 180} L-100,${height} L0,${height} L${width},250 Z`} fill="url(#rayGrad)" />
          {/* Accent light rays */}
          <Path d={`M${width},50 L${width},0 L${width - 120},0 L-50,${height - 400} Z`} fill="url(#rayGrad)" opacity="0.6" />
          <Path d={`M${width},200 L${width},100 L-100,${height - 80} L-100,${height} Z`} fill="url(#rayGrad)" opacity="0.3" />
        </Svg>
      </AnimatedView>

      {/* Camera zoom container for centerpiece */}
      <AnimatedView style={[styles.cameraScaleWrapper, cameraStyle]}>

        {/* 3. Background secure cloud network nodes */}
        <AnimatedView style={[styles.networkContainer, networkStyle]} pointerEvents="none">
          <Svg width={360} height={360} viewBox="0 0 360 360">
            <Defs>
              <SvgGradient id="netGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#00f2fe" stopOpacity="0.25" />
                <Stop offset="100%" stopColor="#00f2fe" stopOpacity="0.03" />
              </SvgGradient>
            </Defs>
            {/* Network connection lines */}
            <Path
              d="M50,120 L120,60 L240,60 L310,120 L310,240 L240,300 L120,300 L50,240 Z M120,60 L180,180 L240,60 M50,120 L180,180 L310,120 M310,240 L180,180 L50,240 M120,300 L180,180 L240,300"
              fill="none"
              stroke="url(#netGrad)"
              strokeWidth="0.8"
            />
            {/* Node dots */}
            <Circle cx="50" cy="120" r="3" fill="#00f2fe" opacity="0.7" />
            <Circle cx="120" cy="60" r="3" fill="#00f2fe" opacity="0.7" />
            <Circle cx="240" cy="60" r="3" fill="#00f2fe" opacity="0.7" />
            <Circle cx="310" cy="120" r="3" fill="#00f2fe" opacity="0.7" />
            <Circle cx="310" cy="240" r="3" fill="#00f2fe" opacity="0.7" />
            <Circle cx="240" cy="300" r="3" fill="#00f2fe" opacity="0.7" />
            <Circle cx="120" cy="300" r="3" fill="#00f2fe" opacity="0.7" />
            <Circle cx="50" cy="240" r="3" fill="#00f2fe" opacity="0.7" />
            <Circle cx="180" cy="180" r="4.5" fill="#00f2fe" opacity="0.8" />
          </Svg>
        </AnimatedView>

        {/* 4. Tiny glowing cyan particles scattered around centerpiece */}
        <AnimatedView style={[styles.particlesContainer, particlesStyle]} pointerEvents="none">
          <View style={[styles.particle, { top: 60, left: 70, width: 3.5, height: 3.5, opacity: 0.6 }]} />
          <View style={[styles.particle, { top: 120, left: 300, width: 4.5, height: 4.5, opacity: 0.8, shadowRadius: 3 }]} />
          <View style={[styles.particle, { top: 290, left: 50, width: 3, height: 3, opacity: 0.5 }]} />
          <View style={[styles.particle, { top: 250, left: 320, width: 5, height: 5, opacity: 0.7, shadowRadius: 4 }]} />
          <View style={[styles.particle, { top: 70, left: 240, width: 4, height: 4, opacity: 0.6 }]} />
          <View style={[styles.particle, { top: 320, left: 210, width: 3.5, height: 3.5, opacity: 0.5 }]} />
        </AnimatedView>

        {/* 5. Centerpiece futuristic transparent vault */}
        <AnimatedView style={[styles.vaultCenterWrapper, vaultHeroStyle]}>
          
          {/* Light glow behind shield */}
          <AnimatedView style={[styles.shieldGlowBack, shieldGlowStyle]} />

          {/* SVG representation of the premium vault structure (matching reference composition exactly) */}
          <Svg width={250} height={250} viewBox="0 0 250 250">
            <Defs>
              {/* Metallic Gradient */}
              <SvgGradient id="metalGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <Stop offset="30%" stopColor="#d1d8e0" stopOpacity="0.95" />
                <Stop offset="70%" stopColor="#778ca3" stopOpacity="0.95" />
                <Stop offset="100%" stopColor="#4b6584" stopOpacity="0.9" />
              </SvgGradient>

              {/* Glassmorphism gradient for safe body */}
              <SvgGradient id="glassBodyGrad" x1="0.1" y1="0.1" x2="0.9" y2="0.9">
                <Stop offset="0%" stopColor="rgba(255, 255, 255, 0.12)" />
                <Stop offset="100%" stopColor="rgba(0, 242, 254, 0.04)" />
              </SvgGradient>

              {/* Cyan Neon Edges */}
              <SvgGradient id="cyanNeon" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#00f2fe" stopOpacity="0.8" />
                <Stop offset="100%" stopColor="#4facfe" stopOpacity="0.8" />
              </SvgGradient>

              {/* Lock dial metallic gradient */}
              <RadialGradient id="lockDialGrad" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#ffffff" />
                <Stop offset="50%" stopColor="#a5b1c2" />
                <Stop offset="90%" stopColor="#4b5563" />
                <Stop offset="100%" stopColor="#1f2937" />
              </RadialGradient>
            </Defs>

            {/* A. Outer Vault Backing and Glass Body */}
            <Rect
              x="30"
              y="30"
              width="180"
              height="190"
              rx="24"
              fill="url(#glassBodyGrad)"
              stroke="url(#cyanNeon)"
              strokeWidth="2.5"
              {...({ style: { shadowColor: "#00f2fe", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10 } } as any)}
            />

            {/* B. Silver Metallic Frame Bezel (Brushed frame) */}
            <Rect
              x="26"
              y="26"
              width="188"
              height="198"
              rx="28"
              fill="none"
              stroke="url(#metalGrad)"
              strokeWidth="4.5"
            />

            {/* Subtle bolts in the corner frame */}
            <Circle cx="40" cy="40" r="2.5" fill="#a5b1c2" />
            <Circle cx="200" cy="40" r="2.5" fill="#a5b1c2" />
            <Circle cx="40" cy="210" r="2.5" fill="#a5b1c2" />
            <Circle cx="200" cy="210" r="2.5" fill="#a5b1c2" />

            {/* C. Vault Interior Contents (Glowing shield with cross) */}
            {/* Shield outline */}
            <G transform="translate(62, 70)">
              {/* Semi-transparent shield back */}
              <Path
                d="M35,10 C50,10 60,3 65,0 C70,3 80,10 95,10 C95,45 65,75 65,75 C65,75 35,45 35,10 Z"
                fill="rgba(0, 242, 254, 0.12)"
                stroke="#00f2fe"
                strokeWidth="2.2"
                {...({ style: { shadowColor: "#00f2fe", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12 } } as any)}
              />
              {/* Bright Medical Cross inside */}
              <Path
                d="M60,25 L70,25 L70,35 L80,35 L80,45 L70,45 L70,55 L60,55 L60,45 L50,45 L50,35 L60,35 Z"
                fill="#00f2fe"
                {...({ style: { shadowColor: "#00f2fe", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8 } } as any)}
              />
              {/* Inner glowing core ring */}
              <Circle cx="65" cy="40" r="22" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" strokeDasharray="4 2" />
            </G>

            {/* D. Vault Door slightly open at 25 degrees (3D Perspective Representation) */}
            {/* Draw the glass door offset to simulate opening angle */}
            <G transform="translate(28, 0) skewY(-2.5) scale(0.9, 1)">
              {/* Transparent Door Body */}
              <Rect
                x="80"
                y="35"
                width="112"
                height="180"
                rx="16"
                fill="rgba(255, 255, 255, 0.08)"
                stroke="url(#metalGrad)"
                strokeWidth="3.2"
              />
              {/* Neon border of the door */}
              <Rect
                x="83"
                y="38"
                width="106"
                height="174"
                rx="13"
                fill="none"
                stroke="url(#cyanNeon)"
                strokeWidth="1.5"
                opacity="0.7"
              />

              {/* E. Embedded Digital Display Panel (Beside the Lock Wheel) */}
              {/* Display background */}
              <Rect
                x="92"
                y="105"
                width="24"
                height="45"
                rx="4"
                fill="#050a12"
                stroke="rgba(0, 242, 254, 0.4)"
                strokeWidth="1.2"
              />
              {/* ECG display window */}
              <Mask id="ecgMask">
                <Rect x="93" y="106" width="22" height="43" rx="3" fill="#ffffff" />
              </Mask>
              <G mask="url(#ecgMask)">
                {/* Simulated ECG Heartbeat Line */}
                <AnimatedPath
                  d="M93,128 L98,128 L100,120 L102,136 L104,115 L106,132 L108,128 L115,128"
                  fill="none"
                  stroke="#00f2fe"
                  strokeWidth="1.5"
                  strokeDasharray="120"
                  animatedProps={ecgAnimatedProps}
                />
              </G>

              {/* F. Circular Mechanical Lock Wheel (Right door face) */}
              <G transform="translate(148, 128)">
                {/* Shiny metal dial outer bezel */}
                <Circle cx="0" cy="0" r="24" fill="url(#metalGrad)" stroke="#1a202c" strokeWidth="1.5" />
                <Circle cx="0" cy="0" r="19" fill="url(#lockDialGrad)" />
                {/* Lock wheel spokes */}
                <Rect x="-2.5" y="-18" width="5" height="36" rx="2" fill="url(#metalGrad)" />
                <Rect x="-18" y="-2.5" width="36" height="5" rx="2" fill="url(#metalGrad)" />
                <Circle cx="0" cy="0" r="7" fill="url(#metalGrad)" />
                <Circle cx="0" cy="0" r="3.5" fill="#030a16" />

                {/* Handle bars sticking out (4 handles) */}
                <Path d="M0,-18 L0,-24" stroke="url(#metalGrad)" strokeWidth="4.5" strokeLinecap="round" />
                <Path d="M0,18 L0,24" stroke="url(#metalGrad)" strokeWidth="4.5" strokeLinecap="round" />
                <Path d="M-18,0 L-24,0" stroke="url(#metalGrad)" strokeWidth="4.5" strokeLinecap="round" />
                <Path d="M18,0 L24,0" stroke="url(#metalGrad)" strokeWidth="4.5" strokeLinecap="round" />
              </G>

              {/* G. Two Glowing Green Lock Indicators */}
              {/* Upper Green Light indicator */}
              <G transform="translate(148, 70)">
                <Circle cx="0" cy="0" r="9" fill="rgba(10, 25, 47, 0.8)" stroke="#2ed573" strokeWidth="1.2" />
                <AnimatedCircle cx="0" cy="0" r="4.5" animatedProps={greenLock1Props} />
                {/* Padlock icon in indicator */}
                <Path d="M-2.5,0 L-2.5,-3 A2.5,2.5 0 0,1 2.5,-3 L2.5,0" fill="none" stroke="#ffffff" strokeWidth="0.8" />
                <Rect x="-3.5" y="0" width="7" height="4.5" rx="1" fill="#ffffff" />
              </G>

              {/* Lower Green Light indicator */}
              <G transform="translate(148, 186)">
                <Circle cx="0" cy="0" r="9" fill="rgba(10, 25, 47, 0.8)" stroke="#2ed573" strokeWidth="1.2" />
                <AnimatedCircle cx="0" cy="0" r="4.5" animatedProps={greenLock1Props} />
                {/* Padlock lock icon */}
                <Path d="M-2.5,0 L-2.5,-3 A2.5,2.5 0 0,1 2.5,-3 L2.5,0" fill="none" stroke="#ffffff" strokeWidth="0.8" />
                <Rect x="-3.5" y="0" width="7" height="4.5" rx="1" fill="#ffffff" />
              </G>

              {/* Heavy duty door hinges (stacked vertically on left side of the door) */}
              <Rect x="77" y="52" width="6" height="15" rx="1.5" fill="url(#metalGrad)" stroke="#1a202c" strokeWidth="0.5" />
              <Rect x="77" y="162" width="6" height="15" rx="1.5" fill="url(#metalGrad)" stroke="#1a202c" strokeWidth="0.5" />
            </G>
          </Svg>
        </AnimatedView>

        {/* 6. Orbiting glowing cyan energy ring around the vault centerpiece */}
        <AnimatedView style={[styles.energyRingWrapper, energyRingStyle]} pointerEvents="none">
          <Svg width={310} height={310} viewBox="0 0 310 310">
            <Defs>
              <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#00f2fe" stopOpacity="0.8" />
                <Stop offset="50%" stopColor="#00f2fe" stopOpacity="0.2" />
                <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </SvgGradient>
            </Defs>
            {/* Glowing orbital path ellipse */}
            <Circle
              cx="155"
              cy="155"
              r="135"
              fill="none"
              stroke="url(#ringGrad)"
              strokeWidth="2.5"
              strokeDasharray="400 150"
              {...({ style: { shadowColor: "#00f2fe", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10 } } as any)}
            />
            {/* Bright trailing head dot */}
            <Circle cx="290" cy="155" r="4.5" fill="#00f2fe" {...({ style: { shadowColor: "#00f2fe", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1.0, shadowRadius: 6 } } as any)} />
          </Svg>
        </AnimatedView>

        {/* 7. FLOATING HOLOGRAPHIC HEALTHCARE CARDS */}

        {/* A. LEFT TOP: Medical records card with folder icon, medical cross, analytics chart */}
        <AnimatedView style={[styles.hologramCard, styles.cardLeftTop, cardLTStyle]}>
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.12)", "rgba(0, 242, 254, 0.03)"]}
            style={styles.cardGlass}
          >
            <View style={styles.cardHeader}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" fill="#00f2fe" />
                <Path d="M12 9v6M9 12h6" stroke="#05223c" strokeWidth="2" strokeLinecap="round" />
              </Svg>
              <Text style={styles.cardTitle}>RECORDS</Text>
            </View>
            {/* Analytical bars mock */}
            <View style={styles.chartContainer}>
              <View style={[styles.chartBar, { height: 16 }]} />
              <View style={[styles.chartBar, { height: 26 }]} />
              <View style={[styles.chartBar, { height: 12 }]} />
              <View style={[styles.chartBar, { height: 20 }]} />
              <View style={[styles.chartBar, { height: 18 }]} />
            </View>
          </LinearGradient>
        </AnimatedView>

        {/* B. LEFT BOTTOM: Medicine card with Rx bottle and pills */}
        <AnimatedView style={[styles.hologramCard, styles.cardLeftBottom, cardLBStyle]}>
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.12)", "rgba(0, 242, 254, 0.03)"]}
            style={styles.cardGlass}
          >
            <View style={styles.rxContainer}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2">
                {/* Rx Bottle */}
                <Path d="M6 3h12M9 3v3h6V3M7 6h10v14H7V6z" />
                <Path d="M10 11h4M12 9v4" />
              </Svg>
              <View style={styles.pillTextCol}>
                <Text style={styles.rxTitle}>MEDICINE</Text>
                <Text style={styles.rxSub}>Rx - 2 Daily</Text>
              </View>
            </View>
          </LinearGradient>
        </AnimatedView>

        {/* C. RIGHT TOP: Calendar with medical cross */}
        <AnimatedView style={[styles.hologramIconCard, styles.cardRightTop, cardRTStyle]}>
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.15)", "rgba(0, 242, 254, 0.03)"]}
            style={styles.iconCardGlass}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2">
              <Rect x="3" y="4" width="18" height="18" rx="2" />
              <Path d="M16 2v4M8 2v4M3 10h18" />
              <Path d="M12 13v6M9 16h6" strokeWidth="1.8" />
            </Svg>
          </LinearGradient>
        </AnimatedView>

        {/* D. RIGHT CENTER: Heartbeat/ECG icon */}
        <AnimatedView style={[styles.hologramIconCard, styles.cardRightCenter, cardRCStyle]}>
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.15)", "rgba(0, 242, 254, 0.03)"]}
            style={styles.iconCardGlass}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2">
              <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              <Path d="M6 12h3l2-3 2 6 2-3h3" stroke="#ffffff" strokeWidth="1.5" />
            </Svg>
          </LinearGradient>
        </AnimatedView>

        {/* E. RIGHT BOTTOM: Capsule medicine icon */}
        <AnimatedView style={[styles.hologramIconCard, styles.cardRightBottom, cardRBStyle]}>
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.15)", "rgba(0, 242, 254, 0.03)"]}
            style={styles.iconCardGlass}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#00f2fe" strokeWidth="2">
              {/* Capsule slanted */}
              <Path d="M14.7 9.3a4.95 4.95 0 0 0-7 0l-4 4a4.95 4.95 0 0 0 0 7 4.95 4.95 0 0 0 7 0l4-4a4.95 4.95 0 0 0 0-7z" />
              <Path d="M7.2 11.2l5.6 5.6" stroke="#ffffff" strokeWidth="1.5" />
            </Svg>
          </LinearGradient>
        </AnimatedView>

      </AnimatedView>

      {/* 8. Bottom branding text & Tagline */}
      <AnimatedView style={[styles.footer, footerStyle]}>
        <View style={styles.logoTextWrapper}>
          <Text style={styles.boldLogoText}>HEALTH </Text>
          <Text style={styles.thinLogoText}>VAULT</Text>
        </View>
        <Text style={styles.tagline}>Secure. Smart. Always With You.</Text>
      </AnimatedView>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#030a16",
  },
  cameraScaleWrapper: {
    width: 360,
    height: 480,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  networkContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  particle: {
    position: "absolute",
    backgroundColor: "#00f2fe",
    borderRadius: 99,
    shadowColor: "#00f2fe",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
  },
  vaultCenterWrapper: {
    width: 250,
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
    position: "relative",
  },
  shieldGlowBack: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(0, 242, 254, 0.18)",
    filter: "blur(18px)",
    zIndex: 3,
  },
  energyRingWrapper: {
    position: "absolute",
    width: 310,
    height: 310,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  // Floating Hologram Card Styles
  hologramCard: {
    position: "absolute",
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "rgba(0, 242, 254, 0.4)",
    overflow: "hidden",
    shadowColor: "#00f2fe",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 6,
  },
  hologramIconCard: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: "rgba(0, 242, 254, 0.4)",
    overflow: "hidden",
    shadowColor: "#00f2fe",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 6,
  },
  cardGlass: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(3, 10, 22, 0.7)",
  },
  iconCardGlass: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(3, 10, 22, 0.7)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#00f2fe",
    marginLeft: 5,
    letterSpacing: 0.5,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: 70,
    height: 30,
    paddingHorizontal: 4,
  },
  chartBar: {
    width: 6,
    backgroundColor: "#00f2fe",
    borderRadius: 1.5,
    opacity: 0.8,
  },
  rxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  pillTextCol: {
    marginLeft: 6,
  },
  rxTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#00f2fe",
    letterSpacing: 0.3,
  },
  rxSub: {
    fontSize: 7.5,
    color: "#a5b1c2",
    marginTop: 1,
  },
  // Positioning holographic elements matching 1:1 image exactly
  cardLeftTop: {
    left: -20,
    top: 40,
    width: 100,
  },
  cardLeftBottom: {
    left: -15,
    bottom: 80,
    width: 110,
  },
  cardRightTop: {
    right: 25,
    top: 50,
  },
  cardRightCenter: {
    right: 5,
    top: 170,
  },
  cardRightBottom: {
    right: 20,
    bottom: 90,
  },
  // Footer branding
  footer: {
    position: "absolute",
    bottom: 65,
    alignItems: "center",
    justifyContent: "center",
  },
  logoTextWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  boldLogoText: {
    fontSize: 35,
    fontWeight: "bold",
    color: "#ffffff",
    letterSpacing: 1.2,
    fontFamily: "System",
  },
  thinLogoText: {
    fontSize: 35,
    fontWeight: "200",
    color: "#ffffff",
    letterSpacing: 1.2,
    fontFamily: "System",
  },
  tagline: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.65)",
    letterSpacing: 0.8,
    fontFamily: "System",
    marginTop: 2,
  },
});


import React from "react";
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";

interface HealthVaultLogoProps {
  size?: number;
}

export default function HealthVaultLogo({ size = 100 }: HealthVaultLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <SvgGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
          {/* Purple to Blue gradient matching the theme */}
          <Stop offset="0%" stopColor="#7c3aed" />
          <Stop offset="40%" stopColor="#3b82f6" />
          <Stop offset="100%" stopColor="#1e3a8a" />
        </SvgGradient>
        <SvgGradient id="heartbeatGrad" x1="0" y1="0" x2="1" y2="0">
          {/* White/Cyan glow for heartbeat line */}
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <Stop offset="50%" stopColor="#06b6d4" stopOpacity="1.0" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
        </SvgGradient>
      </Defs>
      
      {/* 1. Outer Shield Body */}
      <Path
        d="M50,15 C65,15 78,20 82,23 C85,38 82,65 50,85 C18,65 15,38 18,23 C22,20 35,15 50,15 Z"
        fill="url(#shieldGrad)"
        stroke="#ffffff"
        strokeWidth="2.5"
      />
      
      {/* Inner glassmorphic shield highlight */}
      <Path
        d="M50,20 C62,20 73,24 77,26 C79,38 77,60 50,77 C23,60 21,38 23,26 C27,24 38,20 50,20 Z"
        fill="rgba(255, 255, 255, 0.15)"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1.2"
      />
      
      {/* 2. Medical Cross */}
      <Path
        d="M45,35 L55,35 L55,45 L65,45 L65,55 L55,55 L55,65 L45,65 L45,55 L35,55 L35,45 L45,45 Z"
        fill="#ffffff"
        opacity="0.95"
      />
      
      {/* 3. Heartbeat / ECG Wave Line (overlapping shield and cross) */}
      <Path
        d="M12,50 L32,50 L38,40 L44,60 L50,30 L56,58 L62,50 L88,50"
        fill="none"
        stroke="url(#heartbeatGrad)"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

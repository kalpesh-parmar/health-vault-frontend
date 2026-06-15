import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

interface DrawerHeaderProps {
  userDetails: any;
  initials: string;
  isDark: boolean;
  theme: any;
  navigation: any;
  insetsTop: number;
}

const DrawerHeader = React.memo(({ userDetails, initials, isDark, theme, navigation, insetsTop }: DrawerHeaderProps) => {
  const [imageError, setImageError] = useState(false);

  const displayName = userDetails?.fullName ||
    (userDetails?.firstName && userDetails?.lastName ? `${userDetails.firstName} ${userDetails.lastName}` : "") ||
    userDetails?.firstName ||
    userDetails?.userName ||
    "User Profile";

  const email = userDetails?.email || "";
  const headerColors = (isDark ? ["#2e1065", "#0b0f19"] : ["#5B4BFF", "#7C6CFF"]) as [string, string, ...string[]];
  const showInitials = imageError || !userDetails?.profileImageKey || userDetails.profileImageKey.includes("placeholder");

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => navigation.navigate("Profile")}
      accessibilityLabel={`Profile header of ${displayName}. Double tap to view your profile settings.`}
      accessibilityRole="header"
    >
      <LinearGradient
        colors={headerColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.headerContainer,
          {
            paddingTop: Math.max(20, insetsTop + 12),
            height: 190 + insetsTop,
          }
        ]}
      >
        <View style={[
          styles.avatarContainer,
          {
            borderColor: isDark ? theme.colors.border : "rgba(255, 255, 255, 0.7)",
          }
        ]}>
          {showInitials ? (
            <View style={[
              styles.initialsCircle,
              {
                backgroundColor: isDark ? theme.colors.surface : "rgba(255, 255, 255, 0.22)"
              }
            ]}>
              <Text style={styles.initialsText} allowFontScaling={true}>
                {initials || "?"}
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: userDetails?.profileImageKey }}
              style={styles.avatarImage}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
          )}
        </View>

        <View style={styles.headerInfoContainer}>
          <Text style={styles.usernameText} numberOfLines={2} allowFontScaling={true}>
            {displayName}
          </Text>
          {email ? (
            <Text style={styles.emailText} numberOfLines={1} ellipsizeMode="tail" allowFontScaling={true}>
              {email}
            </Text>
          ) : null}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
});

export default DrawerHeader;

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    justifyContent: "flex-end",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  initialsCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  initialsText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
  },
  headerInfoContainer: {
    marginTop: 12,
  },
  usernameText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.25,
  },
  emailText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 3,
    letterSpacing: 0.1,
  },
});

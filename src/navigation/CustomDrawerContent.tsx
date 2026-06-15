import React, { useState, useMemo } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useAppTheme } from "../context/ThemeContext";
import { AppStackParamList } from "./types";
import { getUser } from "../services/userService";
import ConfirmationModal from "../components/shared/ConfirmationModal";

// Import modular drawer components
import DrawerHeader from "../components/navigation/DrawerHeader";
import DrawerMenuItem from "../components/navigation/DrawerMenuItem";
import DrawerFooter from "../components/navigation/DrawerFooter";

const CustomDrawerContent = (props: any) => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { isDark, theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const { data: userDetails } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await getUser();
      return response?.data || response;
    },
  });

  const initials = useMemo(() => {
    const first = userDetails?.firstName ? userDetails.firstName.trim() : "";
    const last = userDetails?.lastName ? userDetails.lastName.trim() : "";
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
    }
    if (first) {
      return first.charAt(0).toUpperCase();
    }
    if (last) {
      return last.charAt(0).toUpperCase();
    }
    return "?";
  }, [userDetails?.firstName, userDetails?.lastName]);

  const state = props.state;
  const descriptors = props.descriptors;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Profile Section (stays fixed at top) */}
      <DrawerHeader
        userDetails={userDetails}
        initials={initials}
        isDark={isDark}
        theme={theme}
        navigation={navigation}
        insetsTop={insets.top}
      />

      {/* Menu Section using FlatList for high-performance scroll */}
      <FlatList
        data={state.routes}
        keyExtractor={(item) => item.key}
        renderItem={({ item, index }) => {
          const { options } = descriptors[item.key];
          const label = options.drawerLabel !== undefined
            ? options.drawerLabel
            : options.title !== undefined
              ? options.title
              : item.name;

          const isFocused = state.index === index;

          return (
            <DrawerMenuItem
              label={label}
              focused={isFocused}
              onPress={() => props.navigation.navigate(item.name)}
              icon={options.drawerIcon}
              isDark={isDark}
              theme={theme}
            />
          );
        }}
        contentContainerStyle={styles.listContentContainer}
        bounces={true}
        showsVerticalScrollIndicator={false}
      />

      {/* Footer Section (stays fixed at bottom) */}
      <DrawerFooter
        onLogoutPress={() => setShowModal(true)}
        insetsBottom={insets.bottom}
        theme={theme}
      />

      {showModal && (
        <ConfirmationModal
          showModal={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </View>
  );
};

export default CustomDrawerContent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContentContainer: {
    paddingVertical: 12,
  },
});

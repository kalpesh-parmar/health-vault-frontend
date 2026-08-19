import React, { useState, useMemo } from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useAppTheme } from "../context/ThemeContext";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { AppStackParamList } from "./types";
import { getUser } from "../services/userService";
import ConfirmationModal from "../components/shared/ConfirmationModal";
import { getInitials } from "../utils/avatarUtils";

// Import modular drawer components
import DrawerHeader from "../components/navigation/DrawerHeader";
import DrawerMenuItem from "../components/navigation/DrawerMenuItem";
import DrawerFooter from "../components/navigation/DrawerFooter";


const CustomDrawerContent = (props: DrawerContentComponentProps) => {
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
    return getInitials(userDetails?.firstName, userDetails?.lastName) || "?";
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
        keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) => {
          const { options } = descriptors[item.key];
          const label = typeof options.drawerLabel === "string"
            ? options.drawerLabel
            : typeof options.title === "string"
              ? options.title
              : item.name;

          const isFocused = state.index === index;

          return (
            <DrawerMenuItem
              label={label}
              focused={isFocused}
              onPress={() => props.navigation.navigate(item.name)}
              icon={options.drawerIcon as any}
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

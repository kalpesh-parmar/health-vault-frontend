import React, { forwardRef, useCallback, useEffect, useState } from "react";
import styled from "styled-components/native";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";
import { BackHandler } from "react-native";
import { useBottomBarPadding } from "../../hooks/useBottomBarPadding";

const BottomSheet = forwardRef(({ children }: any, ref: any) => {
  const { theme } = useAppTheme();
  const [sheetIndex, setSheetIndex] = useState(-1);
  const bottomPadding = useBottomBarPadding(15, 0);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
      />
    ),
    [],
  );

  useEffect(() => {
    const onBackPress = () => {
      if (sheetIndex >= 0) {
        ref.current?.close();
        return true;
      }
      // Allow default back behavior
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onBackPress,
    );

    return () => subscription.remove();
  }, [sheetIndex]);

  return (
    <BottomSheetModal
      ref={ref}
      enablePanDownToClose={true}
      onChange={setSheetIndex}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      enableDynamicSizing={true}
      backgroundStyle={{
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        backgroundColor: theme.colors.surface,
        paddingBottom: 15,
      }}
      handleIndicatorStyle={{
        width: 40,
        height: 5,
        backgroundColor: theme.colors.bottomSheetBorder,
        borderRadius: 20,
      }}
      
    >
      <BottomSheetView style={{ paddingBottom: bottomPadding }}>
        <CloseIconWrapper>
          <CloseIcon onPress={() => ref.current?.dismiss()}>
            <Ionicons name="close" size={24} color={theme.colors.background} />
          </CloseIcon>
        </CloseIconWrapper>

        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default BottomSheet;

const CloseIconWrapper = styled.View`
  position: absolute;
  right: 25px;
  z-index: 10;
`;

const CloseIcon = styled.TouchableOpacity`
  background-color: ${({ theme }: any) => theme.colors.textPrimary};
  height: 32px;
  width: 32px;
  border-radius: 16px;
  justify-content: center;
  align-items: center;
`;

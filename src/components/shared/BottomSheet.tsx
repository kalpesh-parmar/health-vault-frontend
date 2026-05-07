import React, { forwardRef } from "react";
import styled from "styled-components/native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../context/ThemeContext";

const BottomSheet = forwardRef(({ children }: any, ref: any) => {
  const { theme } = useAppTheme();

  return (
    <BottomSheetModal
      ref={ref}
      enablePanDownToClose={true}
      backgroundStyle={{
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        backgroundColor: theme.colors.bottomSheet,
        paddingBottom: 15,
        borderTopWidth: 25,
        borderColor: theme.colors.bottomSheetBorder,
      }}
      handleIndicatorStyle={{
        width: 23,
        height: 5,
        backgroundColor: theme.colors.textMuted,
      }}
    >
      <BottomSheetView style={{ flex: 1 }}>
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
  top: 20px;
  right: 20px;
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

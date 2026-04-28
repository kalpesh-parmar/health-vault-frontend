import React, { forwardRef } from "react";
import styled from "styled-components/native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/theme";
import { View } from "react-native";

const BottomSheet = forwardRef(({children}:any, ref : any) => {

  return (
    <BottomSheetModal
      ref={ref}
      enablePanDownToClose={true}
      backgroundStyle={{
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        backgroundColor: COLORS.emptyText,
        paddingBottom: 15,
      }}
      handleIndicatorStyle={{
        width: 23,
        height: 5,
      }}
      
    >
      <BottomSheetView style={{ flex: 1, height: 230 }}>
        <CloseIconWrapper>
          <CloseIcon onPress={() => ref.current?.dismiss()}>
            <Ionicons name="close" size={24} color="white" />
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
  background-color: black;
  height: 32px;
  width: 32px;
  border-radius: 16px;
  justify-content: center;
  align-items: center;
`;

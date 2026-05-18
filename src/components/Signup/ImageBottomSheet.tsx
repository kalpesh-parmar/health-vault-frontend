// src/components/Signup/ImageBottomSheet.tsx
import React, { forwardRef } from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import BottomSheet from "../shared/BottomSheet";
import AddDocumentSheet from "../shared/AddDocumentSheet";

interface ImageBottomSheetProps {
  onGalleryPick: () => Promise<void> | void;
  onCameraOpen: () => Promise<void> | void;
}

const ImageBottomSheet = forwardRef<BottomSheetModal, ImageBottomSheetProps>(
  ({ onGalleryPick, onCameraOpen }, ref) => {
    return (
      <BottomSheet ref={ref}>
        <AddDocumentSheet
          onGalleryPick={onGalleryPick}
          onCameraOpen={onCameraOpen}
        />
      </BottomSheet>
    );
  }
);

ImageBottomSheet.displayName = "ImageBottomSheet";

export default ImageBottomSheet;

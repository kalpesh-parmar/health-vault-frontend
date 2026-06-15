import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { documentUpload } from "../services/documentService";
import { uploadFileToS3 } from "../services/fileService";

export const useSaveDocument = (onSuccessGlobal?: () => void) => {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: documentUpload,
    mutationKey: ["documents"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
      queryClient.invalidateQueries({ queryKey: ["filteredDocuments"] });
      Toast.show({
        type: "success",
        text1: "Document Added",
        text2: "Your document has been uploaded successfully.",
      });

      onSuccessGlobal?.();
    },

    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Upload Failed",
        text2: error.message,
      });
    },
  });

  const handleSave = async ({
    fileName,
    documentType,
    images,
  }: {
    fileName: string;
    documentType: string;
    images: string;
  }) => {
    if (!images) return;

    try {
      setIsUploading(true);
      const uploadRes = await uploadFileToS3(images, "PATIENT_DOCUMENT");
      const fileData = uploadRes?.data?.data || uploadRes?.data || uploadRes || {};

      const payload = {
        documentType,
        s3Key: fileData.s3Key || `uploads/${Date.now()}-doc`,
        fileName: fileData.fileName || fileName,
        fileType: fileData.fileType || "application/pdf",
        fileSize: fileData.fileSize || 204800,
        s3Bucket: fileData.s3Bucket || "patient-documents",
        fileStoragePath: fileData.fileStoragePath || "",
      };

      await mutation.mutateAsync(payload);
    } catch (error: any) {
      console.log("Error in upload sequence:", error);
      Toast.show({
        type: "error",
        text1: "Upload Error",
        text2: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return {
    handleSave,
    isSaving: mutation.isPending || isUploading,
  };
};
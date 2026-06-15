import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { documentUpload, uploadDocument, runOcr, getOcrProgress } from "../services/documentService";
import type { AddDocumentPayload } from "../types";

export const useSaveDocument = (onSuccessGlobal?: () => void) => {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [ocrState, setOcrState] = useState({
    visible: false,
    percentage: 0,
    currentStep: "",
    hasError: false,
  });

  const closeOcrModal = () => setOcrState(prev => ({ ...prev, visible: false }));

  const mutation = useMutation({
    mutationFn: documentUpload,
    mutationKey: ["documents"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
      queryClient.invalidateQueries({ queryKey: ["filteredDocuments"] });
      
      setTimeout(() => {
        closeOcrModal();
        Toast.show({
          type: "success",
          text1: "Document Added",
          text2: "Your document has been uploaded successfully.",
        });
        onSuccessGlobal?.();
      }, 1000);
    },
    onError: (error: any) => {
      setOcrState(prev => ({ ...prev, hasError: true, currentStep: "Failed to save document." }));
      Toast.show({
        type: "error",
        text1: "Save Failed",
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
      
      // Step 1: Upload Document
      const uploadRes = await uploadDocument(images);
      const fileData = uploadRes?.data;
      
      if (!fileData?.fileKey) {
        throw new Error("Failed to get fileKey from upload response.");
      }

      // Step 2: Show Progress Modal before OCR
      setOcrState({
        visible: true,
        percentage: 0,
        currentStep: "Starting OCR...",
        hasError: false,
      });

      // Step 3: Run OCR
      const ocrRes = await runOcr(fileData.fileKey, documentType);
      
      // Update step after OCR initiates
      setOcrState(prev => ({
        ...prev,
        currentStep: ocrRes?.data?.stage || "OCR Queued...",
      }));

      let isCompleted = false;
      let ocrError: Error | null = null;

      while (!isCompleted) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        try {
          const progressRes = await getOcrProgress(fileData.fileKey);
          const progressData = progressRes.data;

          setOcrState({
            visible: true,
            percentage: progressData.percentage || 0,
            currentStep: progressData.currentStep || progressData.stage || "Processing...",
            hasError: false,
          });

          if (progressData.status === "COMPLETED") {
            isCompleted = true;
          } else if (progressData.status === "FAILED" || progressData.error) {
            isCompleted = true;
            ocrError = new Error(progressData.error || "OCR processing failed");
          }
        } catch (err: any) {
          isCompleted = true;
          ocrError = err;
        }
      }

      if (ocrError) {
        throw ocrError;
      }

      // Step 4: Add Document
      const payload: AddDocumentPayload = {
        documentType,
        s3Key: fileData.fileKey,
        fileName: fileName || fileData.originalName || "document.pdf",
        fileType: fileData.mimeType || "application/pdf",
        fileSize: fileData.size || 204800,
        s3Bucket: "patient-documents",
      };

      await mutation.mutateAsync(payload);

    } catch (error: any) {
      console.log("Error in upload sequence:", error);
      setOcrState(prev => ({ ...prev, hasError: true, currentStep: error.message || "An error occurred." }));
      Toast.show({
        type: "error",
        text1: "Upload Sequence Error",
        text2: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return {
    handleSave,
    isSaving: mutation.isPending || isUploading,
    ocrState,
    closeOcrModal,
  };
};
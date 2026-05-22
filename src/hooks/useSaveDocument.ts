import { useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { documentUpload } from "../services/documentService";
import { buildDocumentFormData } from "../utils/DocumentData";

export const useSaveDocument = (onSuccessGlobal?: () => void) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: documentUpload,
    mutationKey: ["documents"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
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

    const formData = buildDocumentFormData(
      fileName,
      documentType,
      images
    );

    mutation.mutateAsync(formData);
  };

  return {
    handleSave,
    isSaving: mutation.isPending,
  };
};
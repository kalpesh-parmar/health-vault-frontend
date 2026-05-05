import { useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { documentUpload } from "../services/authService";
import { buildDocumentFormData } from "../utils/DocumentData";

export const useSaveDocument = (onSuccessGlobal?: () => void) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: documentUpload,
    mutationKey: ["documents"],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      console.log("Document Added");
      Toast.show({
        type: "success",
        text1: "Document Added",
        text2: "Your document has been uploaded successfully.",
      });

      onSuccessGlobal?.();
    },

    onError: (error: any) => {
      console.log(error);
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
    console.log("Filename :- ", fileName);
    console.log("Category :- ", documentType);
    console.log("Images :- ", images);
    console.log("Formdata :- ", formData);

    mutation.mutateAsync(formData);
  };

  return {
    handleSave,
    isSaving: mutation.isPending,
  };
};
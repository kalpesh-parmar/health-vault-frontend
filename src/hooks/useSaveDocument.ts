import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { documentUpload, runOcr, getOcrStatus, addDocument } from "../services/documentService";

export interface UploadedFile {
  fileName: string;
  fileSize: number;
  fileType: string;
}

export const useSaveDocument = (onSuccessGlobal?: (file: UploadedFile) => void) => {
  const queryClient = useQueryClient();
  const [progressStage, setProgressStage] = useState<string>("IDLE");
  const [progressPercentage, setProgressPercentage] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async ({
      fileName,
      documentType,
      images,
    }: {
      fileName: string;
      documentType: string;
      images: string;
    }) => {
      // Step 1: Upload
      setProgressStage("UPLOADING_FILE");
      setProgressPercentage(10);
      setProgressMessage("Uploading report to secure storage...");

      const formData = new FormData();
      const uriParts = images.split(".");
      const fileExtension = uriParts[uriParts.length - 1] || "jpg";
      const name = `${fileName}.${fileExtension}`;
      const type =
        fileExtension === "pdf"
          ? "application/pdf"
          : `image/${fileExtension === "png" ? "png" : "jpeg"}`;

      formData.append("file", {
        uri: images,
        name: name,
        type: type,
      } as any);
      formData.append("uploadType", "PATIENT_DOCUMENT");
      formData.append("category", documentType || "medical_document");

      const uploadRes = await documentUpload(formData);
      const fileKey = uploadRes?.data?.fileKey;
      const mimeType = uploadRes?.data?.mimeType;

      if (!fileKey) {
        throw new Error("Upload response missing file key");
      }

      // Step 2: Trigger run-ocr
      setProgressStage("VALIDATING");
      setProgressPercentage(25);
      setProgressMessage("Checking whether the document is medical.");

      await runOcr({ fileKey, documentType });

      // Step 3: Poll status
      const maxRetries = 100;
      const delayMs = 1500;
      let job = null;

      for (let i = 0; i < maxRetries; i++) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        const statusRes = await getOcrStatus(fileKey);
        const jobData = statusRes?.data || statusRes;

        if (jobData?.stage === "OCR_QUEUED" || jobData?.stage === "OCR_STARTED") {
          setProgressStage("VALIDATING");
          setProgressPercentage(30);
          setProgressMessage("Checking whether the document is medical.");
        } else if (jobData?.stage === "VALIDATING") {
          setProgressStage("VALIDATING");
          setProgressPercentage(35);
          setProgressMessage("Checking whether the document is medical.");
        } else if (jobData?.stage === "EXTRACTING") {
          setProgressStage("EXTRACTING");
          setProgressPercentage(50);
          setProgressMessage("Reading report contents.");
        } else if (jobData?.stage === "ANALYZING") {
          setProgressStage("ANALYZING");
          setProgressPercentage(70);
          setProgressMessage("Finding tests and medical values.");
        } else if (jobData?.stage === "SUMMARIZING") {
          setProgressStage("SUMMARIZING");
          setProgressPercentage(90);
          setProgressMessage("Preparing easy explanation.");
        }

        if (jobData?.status === "COMPLETED") {
          setProgressStage("COMPLETED");
          setProgressPercentage(100);
          setProgressMessage("You can now ask questions.");
          job = jobData;
          break;
        }

        if (jobData?.status === "FAILED") {
          throw new Error(jobData?.error || "OCR extraction failed");
        }
      }

      if (!job) {
        throw new Error("OCR job timed out");
      }

      console.log("filekey :- ", fileKey);

      // Step 4: Add document
      const addRes = await addDocument({
        documentType,
        s3Key: fileKey,
        fileName,
        fileType: mimeType,
        s3bucket: uploadRes?.data?.s3Bucket,
        rawOcrData: job.rawOcrData,
        extractedStructuredData: job.extractedStructuredData,
        graphs: job.graphs || [],
        embeddingsGenerated: true
      });

      return {
        data: addRes.data,
        file: {
          fileName,
          fileSize: uploadRes?.data?.fileSize || 0,
          fileType: mimeType
        }
      };
    },
    mutationKey: ["documents"],
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
      queryClient.invalidateQueries({ queryKey: ["filteredDocuments"] });
      
      setTimeout(() => {
        Toast.show({
          type: "success",
          text1: "Document Added",
          text2: "Your document has been uploaded successfully.",
        });
        onSuccessGlobal?.(result.file);
      }, 1000);
    },
    onError: (error: any) => {
      const isInvalidDoc =
        error.message &&
        (error.message.includes("not a medical document") ||
          error.message.includes("valid medical report"));

      if (isInvalidDoc) {
        Toast.show({
          type: "error",
          text1: "Invalid Document",
          text2: "Please upload a valid medical report such as a lab report, prescription, X-ray, MRI, or discharge summary.",
          visibilityTime: 6000,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Upload Failed",
          text2: error.message || "An error occurred during upload/processing",
        });
      }
      console.log("Error :- ", error);
    },
  });

  const handleSave = async (params: {
    fileName: string;
    documentType: string;
    images: string;
  }) => {
    if (!params.images) return;
    try {
      setProgressStage("IDLE");
      setProgressPercentage(0);
      setProgressMessage("");
      await mutation.mutateAsync(params);
    } catch {
      // errors handled by mutation
    }
  };

  return {
    handleSave,
    isSaving: mutation.isPending,
    progressStage,
    progressPercentage,
    progressMessage,
  };
};

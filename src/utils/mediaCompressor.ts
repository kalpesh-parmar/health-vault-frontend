import * as FileSystem from "expo-file-system/legacy";
import { PickedFile } from "../hooks/useDocumentMedia";

const IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

const isImageFile = (file: PickedFile): boolean => {
  const mime = (file.type || "").toLowerCase();
  const ext = (file.name || "").split(".").pop()?.toLowerCase() || "";
  return IMAGE_MIMES.includes(mime) || IMAGE_EXTENSIONS.includes(ext);
};

export const compressImageIfNeeded = async (
  file: PickedFile,
  maxDimension = 1920,
  compressQuality = 0.75
): Promise<PickedFile> => {
  if (!isImageFile(file)) {
    return file;
  }

  try {
    let ImageManipulator: any = null;
    try {
      ImageManipulator = require("expo-image-manipulator");
    } catch {
      // Dynamic fallback if module is not bundled
      ImageManipulator = null;
    }

    if (!ImageManipulator?.manipulateAsync) {
      return file;
    }

    const actions = [
      {
        resize: {
          width: maxDimension,
        },
      },
    ];

    const result = await ImageManipulator.manipulateAsync(
      file.uri,
      actions,
      {
        compress: compressQuality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    if (result && result.uri) {
      const info = await FileSystem.getInfoAsync(result.uri);
      const newSize = (info && "size" in info && typeof info.size === "number") ? info.size : file.size;

      return {
        ...file,
        uri: result.uri,
        size: newSize,
        type: "image/jpeg",
      };
    }
  } catch (error) {
    console.warn(`[mediaCompressor] Compression skipped for "${file.name}":`, error);
  }

  return file;
};

export const batchCompressFiles = async (
  files: PickedFile[],
  onProgress?: (current: number, total: number) => void
): Promise<PickedFile[]> => {
  if (!files || files.length === 0) return [];

  const compressedResults: PickedFile[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const compressed = await compressImageIfNeeded(file);
    compressedResults.push(compressed);
    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return compressedResults;
};

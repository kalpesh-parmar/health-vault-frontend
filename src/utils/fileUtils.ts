/**
 * Extracts the file extension from a filename safely.
 * Returns the capitalized extension, or a default fallback if none exists.
 */
export const getFileExtension = (fileName?: string, defaultExt: string = "DOC"): string => {
  if (!fileName) return defaultExt;
  const parts = fileName.split(".");
  if (parts.length < 2) return defaultExt;
  const ext = parts[parts.length - 1];
  return ext ? ext.toUpperCase() : defaultExt;
};

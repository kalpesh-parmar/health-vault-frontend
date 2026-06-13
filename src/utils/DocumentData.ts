export const buildDocumentFormData = (
  fileName: string,
  documentType: string,
  images: string
): FormData => {
  const formData = new FormData();

  // Extract file extension from the image URI, default to 'jpg'
  const uriParts = images.split(".");
  const fileExtension = uriParts[uriParts.length - 1] || "jpg";
  const name = `${fileName}.${fileExtension}`;
  const type = `image/${fileExtension === "png" ? "png" : "jpeg"}`;

  // Append file with required React Native multipart object shape
  formData.append("file", {
    uri: images,
    name: name,
    type: type,
  } as any);

  formData.append("documentType", documentType);
  formData.append("fileName", fileName);

  return formData;
};

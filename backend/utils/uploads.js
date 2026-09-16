import fs from "fs";

export const removeTempFile = (file) => {
  if (!file?.path) return;
  fs.unlink(file.path, () => {});
};

export const imageToDataUrl = (buffer, contentType = "") => {
  if (contentType.includes("application/json")) {
    const parsed = JSON.parse(Buffer.from(buffer).toString("utf8"));
    const base64Image = parsed.result?.image;
    if (!base64Image) {
      throw new Error("Image generation returned no image data");
    }
    return `data:image/png;base64,${base64Image}`;
  }

  const base64Image = Buffer.from(buffer).toString("base64");
  return `data:image/png;base64,${base64Image}`;
};

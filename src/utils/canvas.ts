export const imageDataToBase64 = (imageData: ImageData): string => {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
};

export const base64ToImageData = (
  base64: string,
  targetCanvas: HTMLCanvasElement
): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    // Add reject handler
    const img = new Image();
    img.onerror = () => reject(new Error("Failed to load image")); // Add error handling
    img.onload = () => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = targetCanvas.width;
      tempCanvas.height = targetCanvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) {
        reject(new Error("Failed to get canvas context")); // Add error handling
        return;
      }

      // Calculate scaled dimensions while maintaining aspect ratio
      const scale = Math.min(
        targetCanvas.width / img.width,
        targetCanvas.height / img.height
      );

      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      // Center the image
      const x = (targetCanvas.width - scaledWidth) / 2;
      const y = (targetCanvas.height - scaledHeight) / 2;

      // Clear and draw new image with proper scaling
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(img, x, y, scaledWidth, scaledHeight);

      resolve(
        tempCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height)
      );
    };
    img.src = base64;
  });
};

export const normalizeCoordinates = (
  x: number,
  y: number,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
) => {
  const scaleX = targetWidth / sourceWidth;
  const scaleY = targetHeight / sourceHeight;
  return {
    x: x * scaleX,
    y: y * scaleY,
    scale: Math.min(scaleX, scaleY),
  };
};

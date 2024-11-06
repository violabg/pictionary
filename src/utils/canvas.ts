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
    const img = new Image();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.onload = () => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = targetCanvas.width;
      tempCanvas.height = targetCanvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      const scale = Math.min(
        targetCanvas.width / img.width,
        targetCanvas.height / img.height
      );

      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      const x = (targetCanvas.width - scaledWidth) / 2;
      const y = (targetCanvas.height - scaledHeight) / 2;

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

export const updateCanvasSize = (
  canvasRef: React.RefObject<HTMLCanvasElement>
) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const container = canvas.parentElement;
  if (!container) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Save the current canvas content
  const previousContent = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const oldWidth = canvas.width;
  const oldHeight = canvas.height;

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  // Calculate dimensions maintaining 16:9 aspect ratio
  let width = containerWidth;
  let height = containerWidth * (9 / 16);

  if (height > containerHeight) {
    height = containerHeight;
    width = containerHeight * (16 / 9);
  }

  // Create a temporary canvas to hold the content
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = oldWidth;
  tempCanvas.height = oldHeight;
  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) return;

  // Copy the content to the temporary canvas
  tempCtx.putImageData(previousContent, 0, 0);

  // Update the main canvas size
  canvas.width = width;
  canvas.height = height;

  // Reset context properties after resize
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = 2;

  // Draw the scaled content back to the main canvas
  ctx.drawImage(tempCanvas, 0, 0, oldWidth, oldHeight, 0, 0, width, height);
};

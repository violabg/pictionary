type CanvasSize = {
  width: number;
  height: number;
};

// Helper function to safely get canvas context
export const get2DContext = (
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context");
  }
  return ctx;
};

// Helper to create a temporary canvas with specific size
const createTempCanvas = ({ width, height }: CanvasSize): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

export const imageDataToBase64 = (imageData: ImageData): string => {
  try {
    const canvas = createTempCanvas(imageData);
    const ctx = get2DContext(canvas);
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Error converting ImageData to base64:", error);
    return "";
  }
};

export const base64ToImageData = (
  base64: string,
  targetCanvas: HTMLCanvasElement
): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Failed to load image"));
    img.onload = () => {
      try {
        const tempCanvas = createTempCanvas(targetCanvas);
        const tempCtx = get2DContext(tempCanvas);

        // Calculate scale while maintaining aspect ratio
        const scale = Math.min(
          targetCanvas.width / img.width,
          targetCanvas.height / img.height
        );
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        // Center the image
        const x = (targetCanvas.width - scaledWidth) / 2;
        const y = (targetCanvas.height - scaledHeight) / 2;

        // Enable smooth scaling
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = "high";

        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(img, x, y, scaledWidth, scaledHeight);

        resolve(
          tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
        );
      } catch (error) {
        reject(error);
      }
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
): { x: number; y: number; scale: number } => {
  const scaleX = targetWidth / sourceWidth;
  const scaleY = targetHeight / sourceHeight;
  return {
    x: x * scaleX,
    y: y * scaleY,
    scale: Math.min(scaleX, scaleY),
  };
};

export const updateCanvasSize = (canvas: HTMLCanvasElement): void => {
  const container = canvas.parentElement;
  if (!container) return;

  // Calculate new dimensions
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  let width = containerWidth;
  let height = containerWidth * (9 / 16);

  if (height > containerHeight) {
    height = containerHeight;
    width = containerHeight * (16 / 9);
  }

  // Skip if size hasn't changed
  if (canvas.width === width && canvas.height === height) return;

  try {
    const ctx = get2DContext(canvas);

    // Save current content
    const previousContent = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const oldSize = { width: canvas.width, height: canvas.height };

    // Create and setup temporary canvas
    const tempCanvas = createTempCanvas(oldSize);
    const tempCtx = get2DContext(tempCanvas);
    tempCtx.putImageData(previousContent, 0, 0);

    // Update main canvas size
    canvas.width = width;
    canvas.height = height;

    // Reset context properties
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 2;

    // Enable smooth scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw scaled content back
    ctx.drawImage(
      tempCanvas,
      0,
      0,
      oldSize.width,
      oldSize.height,
      0,
      0,
      width,
      height
    );
  } catch (error) {
    console.error("Error updating canvas size:", error);
  }
};

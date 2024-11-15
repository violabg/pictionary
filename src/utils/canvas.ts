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
  // Calculate scale to fit the source canvas into target while maintaining aspect ratio
  const scale = Math.min(
    targetWidth / sourceWidth,
    targetHeight / sourceHeight
  );

  // Calculate offset to center the drawing
  const offsetX = (targetWidth - sourceWidth * scale) / 2;
  const offsetY = (targetHeight - sourceHeight * scale) / 2;

  return {
    x: x * scale + offsetX,
    y: y * scale + offsetY,
    scale,
  };
};

export const updateCanvasSize = (canvas: HTMLCanvasElement): void => {
  const container = canvas.parentElement;
  if (!container) return;

  // Use full container dimensions
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Skip if size hasn't changed
  if (canvas.width === width && canvas.height === height) return;

  try {
    const ctx = get2DContext(canvas);

    // Save current content
    const previousContent = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const oldSize = { width: canvas.width, height: canvas.height };

    // Create temporary canvas
    const tempCanvas = createTempCanvas(oldSize);
    const tempCtx = get2DContext(tempCanvas);
    tempCtx.putImageData(previousContent, 0, 0);

    // Update canvas size
    canvas.width = width;
    canvas.height = height;

    // Reset context properties
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Calculate scaling to maintain aspect ratio
    const scale = Math.min(width / oldSize.width, height / oldSize.height);

    // Calculate centering offsets
    const offsetX = (width - oldSize.width * scale) / 2;
    const offsetY = (height - oldSize.height * scale) / 2;

    // Draw scaled and centered content back
    ctx.drawImage(
      tempCanvas,
      0,
      0,
      oldSize.width,
      oldSize.height,
      offsetX,
      offsetY,
      oldSize.width * scale,
      oldSize.height * scale
    );
  } catch (error) {
    console.error("Error updating canvas size:", error);
  }
};

"use client";

import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";

interface ImageCropperModalProps {
  imageSrc: string;
  onCropDone: (blob: Blob) => void;
  onCancel: () => void;
}

export function ImageCropperModal({ imageSrc, onCropDone, onCancel }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ width: number; height: number; x: number; y: number } | null>(null);

  const onCropComplete = useCallback((_croppedArea: unknown, croppedAreaPixels: { width: number; height: number; x: number; y: number }) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCrop = useCallback(async () => {
    if (!croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropDone(croppedImage);
    } catch (e) {
      console.error(e);
    }
  }, [croppedAreaPixels, imageSrc, onCropDone]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md bg-background rounded-xl overflow-hidden shadow-2xl border border-foreground/10 flex flex-col">
        <div className="p-4 border-b border-foreground/10 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-foreground">Ajustar Foto</h3>
          <button onClick={onCancel} className="text-foreground/50 hover:text-foreground text-xl leading-none">×</button>
        </div>
        
        <div className="relative w-full h-[300px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
            cropShape="rect"
            showGrid={false}
          />
        </div>
        
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-xs text-foreground/60">Zoom</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1 bg-foreground/20 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-foreground/20 hover:bg-foreground/5 transition-colors text-foreground"
            >
              Cancelar
            </button>
            <button
              onClick={handleCrop}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Recortar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utilidad para extraer el Blob del canvas
async function getCroppedImg(imageSrc: string, pixelCrop: { width: number; height: number; x: number; y: number }): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Set canvas size to the cropped size (or max 300x300)
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // If we want exactly 300x300 max, we can resize it down if it's larger
  if (canvas.width > 300 || canvas.height > 300) {
    const resizedCanvas = document.createElement("canvas");
    resizedCanvas.width = 300;
    resizedCanvas.height = 300;
    const resizedCtx = resizedCanvas.getContext("2d");
    if (resizedCtx) {
      resizedCtx.drawImage(canvas, 0, 0, 300, 300);
      return new Promise((resolve, reject) => {
        resizedCanvas.toBlob((file) => {
          if (file) resolve(file);
          else reject(new Error("Error creando blob"));
        }, "image/jpeg", 0.9);
      });
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) resolve(file);
      else reject(new Error("Error creando blob"));
    }, "image/jpeg", 0.9);
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

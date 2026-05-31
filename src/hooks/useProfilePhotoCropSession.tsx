"use client";

import { useCallback, useState } from "react";
import { ProfilePhotoCropper } from "@/components/media/ProfilePhotoCropper";
import { readFileAsDataUrl } from "@/lib/media/crop-image";
import type { ProfilePhotoCropSettings } from "@/types/specialist-application";

export interface ProfilePhotoCropSavePayload {
  croppedImageData: string;
  originalImageData: string;
  cropSettings: ProfilePhotoCropSettings;
}

interface CropSession {
  imageSrc: string;
  originalImageData: string;
  initialCrop: { x: number; y: number };
  initialZoom: number;
  onSave: (payload: ProfilePhotoCropSavePayload) => void;
}

export function useProfilePhotoCropSession() {
  const [session, setSession] = useState<CropSession | null>(null);

  const openCropFromFile = useCallback(
    (
      file: File,
      onSave: (payload: ProfilePhotoCropSavePayload) => void,
      existingCrop?: ProfilePhotoCropSettings | null
    ) => {
      void readFileAsDataUrl(file).then((originalImageData) => {
        setSession({
          imageSrc: originalImageData,
          originalImageData,
          initialCrop: {
            x: existingCrop?.x ?? 0,
            y: existingCrop?.y ?? 0,
          },
          initialZoom: existingCrop?.zoom ?? 1,
          onSave,
        });
      });
    },
    []
  );

  const openCropFromOriginal = useCallback(
    (
      originalImageData: string,
      onSave: (payload: ProfilePhotoCropSavePayload) => void,
      existingCrop?: ProfilePhotoCropSettings | null
    ) => {
      if (!originalImageData.trim()) return;
      setSession({
        imageSrc: originalImageData,
        originalImageData,
        initialCrop: {
          x: existingCrop?.x ?? 0,
          y: existingCrop?.y ?? 0,
        },
        initialZoom: existingCrop?.zoom ?? 1,
        onSave,
      });
    },
    []
  );

  const closeCrop = useCallback(() => {
    setSession(null);
  }, []);

  const cropModal =
    session != null ? (
      <ProfilePhotoCropper
        imageSrc={session.imageSrc}
        initialCrop={session.initialCrop}
        initialZoom={session.initialZoom}
        aspect={1}
        onCancel={closeCrop}
        onSave={(croppedImageData, cropSettings) => {
          session.onSave({
            croppedImageData,
            originalImageData: session.originalImageData,
            cropSettings,
          });
          closeCrop();
        }}
      />
    ) : null;

  return {
    openCropFromFile,
    openCropFromOriginal,
    closeCrop,
    cropModal,
    isCropOpen: session != null,
  };
}

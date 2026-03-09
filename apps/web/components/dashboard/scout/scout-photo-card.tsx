"use client";

/**
 * ScoutPhotoCard — Snap Photo card for Manual Scout.
 * T011 [US2]: Camera capture (getUserMedia) when available, else file picker.
 * Per contracts/scout-ui-016.md §3 and research.md §1.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, FlipHorizontal } from "lucide-react";

export interface ScoutPhotoCardProps {
  onFileSelect: (file: File) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

/** T028: Photo card accepts PNG, JPEG only per spec edge case */
const ACCEPT = "image/png,image/jpeg,image/jpg";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const VALID_MIMES = ["image/png", "image/jpeg", "image/jpg"] as const;

function validateFile(file: File): string | null {
  const type = file.type?.toLowerCase() || "";
  if (!VALID_MIMES.includes(type as (typeof VALID_MIMES)[number])) {
    return "Please upload PNG or JPEG only. Unsupported image type.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return `File too large (max ${Math.round(MAX_SIZE_BYTES / 1024 / 1024)} MB)`;
  }
  return null;
}

function hasGetUserMedia(): boolean {
  return !!(typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia);
}

export function ScoutPhotoCard({
  onFileSelect,
  onError,
  disabled = false,
}: ScoutPhotoCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment"
  );
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleFilePicker = useCallback(() => {
    if (disabled) return;
    setError(null);
    inputRef.current?.click();
  }, [disabled]);

  const startCamera = useCallback(
    async (mode: "user" | "environment") => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
        audio: false,
      });
      streamRef.current = stream;
      setFacingMode(mode);
      setCameraMode(true);
      setError(null);
      // Check if multiple cameras available (enumerateDevices works after getUserMedia grants permission)
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setCanSwitchCamera(videoInputs.length >= 2);
      return stream;
    },
    []
  );

  const handleCameraCapture = useCallback(async () => {
    if (disabled) return;
    setError(null);
    if (!hasGetUserMedia()) {
      handleFilePicker();
      return;
    }
    try {
      await startCamera("environment");
    } catch {
      setError("Camera access denied. Choose an image instead.");
      onError?.("Camera access denied");
      handleFilePicker();
    }
  }, [disabled, handleFilePicker, onError, startCamera]);

  /** Switch between front and back camera when multiple are available */
  const handleSwitchCamera = useCallback(async () => {
    if (!canSwitchCamera || disabled) return;
    const nextMode: "user" | "environment" =
      facingMode === "environment" ? "user" : "environment";
    stopStream();
    setError(null);
    try {
      await startCamera(nextMode);
      const video = videoRef.current;
      const stream = streamRef.current;
      if (video && stream) {
        video.srcObject = stream;
        video.play().catch(() => {});
      }
    } catch {
      // Device may only support one facing mode; fall back to previous
      try {
        await startCamera(facingMode);
      } catch {
        setError("Could not switch camera. Choose an image instead.");
      }
    }
  }, [canSwitchCamera, disabled, facingMode, startCamera, stopStream]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.readyState < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `capture-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopStream();
        setCameraMode(false);
        setError(null);
        onFileSelect(file);
      },
      "image/jpeg",
      0.9
    );
  }, [onFileSelect, stopStream]);

  const handleCancelCamera = useCallback(() => {
    stopStream();
    setCameraMode(false);
    setError(null);
  }, [stopStream]);

  useEffect(() => {
    if (!cameraMode) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraMode]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      const err = validateFile(file);
      if (err) {
        setError(err);
        onError?.(err);
        return;
      }
      setError(null);
      onFileSelect(file);
    },
    [onFileSelect, onError]
  );

  if (cameraMode) {
    return (
      <div
        className="rounded-lg border bg-card p-4 shadow-sm sm:col-span-3"
        aria-label="Camera capture"
      >
        <div className="flex flex-col gap-3">
          <div className="relative aspect-video overflow-hidden rounded-md bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
              aria-label="Camera preview"
            />
            {canSwitchCamera && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                disabled={disabled}
                className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50"
                aria-label={
                  facingMode === "environment"
                    ? "Switch to front camera"
                    : "Switch to back camera"
                }
              >
                <FlipHorizontal className="size-5" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCapture}
              disabled={disabled}
              className="min-h-[44px] flex-1 rounded-md bg-electric-mint px-4 py-2 text-sm font-medium text-navy transition-colors hover:bg-electric-mint/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Capture photo"
            >
              Capture
            </button>
            <button
              type="button"
              onClick={handleCancelCamera}
              disabled={disabled}
              className="min-h-[44px] rounded-md border border-muted-foreground/40 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Cancel camera"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border bg-card p-4 shadow-sm transition-colors ${
        disabled ? "pointer-events-none opacity-60" : "hover:border-electric-mint/50"
      }`}
      aria-label="Snap Photo"
    >
      <button
        type="button"
        onClick={handleCameraCapture}
        disabled={disabled}
        className="flex min-h-[44px] w-full items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-electric-mint focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
        aria-label="Snap photo with camera or choose image"
      >
        <span
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-electric-mint/20"
          aria-hidden
        >
          <Camera className="size-6 text-navy" />
        </span>
        <span className="text-sm font-medium text-foreground">Snap Photo</span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        disabled={disabled}
        onChange={handleChange}
        className="sr-only"
        aria-hidden
      />
    </div>
  );
}

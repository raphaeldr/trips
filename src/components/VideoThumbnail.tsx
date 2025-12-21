import { useState, useRef, useEffect } from "react";

interface VideoThumbnailProps {
  src: string;
  className?: string;
}

export const VideoThumbnail = ({ src, className }: VideoThumbnailProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const captureFrame = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setThumbnailUrl(dataUrl);
        }
      } catch (e) {
        console.error("Failed to capture video frame:", e);
      }
    };

    video.addEventListener("loadeddata", captureFrame);

    // If video is already loaded
    if (video.readyState >= 2) {
      captureFrame();
    }

    return () => {
      video.removeEventListener("loadeddata", captureFrame);
    };
  }, [src]);

  return (
    <>
      {/* Hidden video element for frame capture */}
      <video
        ref={videoRef}
        src={`${src}#t=0.5`}
        muted
        playsInline
        preload="auto"
        crossOrigin="anonymous"
        className="hidden"
      />
      {/* Display captured frame or fallback */}
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt=""
          className={className}
        />
      ) : (
        <div className={`bg-muted aspect-video w-full ${className}`} />
      )}
    </>
  );
};

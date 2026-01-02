import { useRef, useEffect, useState } from "react";
import { formatLocation, getLocationParts } from "@/utils/location";
import { Button } from "@/components/ui/button";
import { MapPin, Eye, EyeOff, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

import { resolveMediaUrl } from "@/lib/utils";

interface PhotoCardProps {
  id: string;
  storagePath: string;
  thumbnailPath?: string | null;
  title?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  takenAt?: string;
  cameraMake?: string;
  cameraModel?: string;

  mimeType?: string;
  destinationName?: string;
  country?: string;
  className?: string;
  status?: string | null;
  onDelete?: () => void;
  onStatusToggle?: () => void;
  onClick?: () => void;
}

export const PhotoCard = ({
  id,
  storagePath,
  thumbnailPath,
  title,
  description,
  latitude,
  longitude,
  takenAt,
  mimeType,
  destinationName,
  country,
  className,
  status,
  onDelete,
  onStatusToggle,
  onClick,
}: PhotoCardProps & { className?: string }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAdminAuth();

  const isVideo = mimeType?.toLowerCase().startsWith("video/") || mimeType === "video";
  const isAudio = mimeType?.toLowerCase().startsWith("audio/") ||
    mimeType === "audio" ||
    (!mimeType && (storagePath?.endsWith('.webm') || storagePath?.endsWith('.mp3') || storagePath?.endsWith('.wav') || storagePath?.endsWith('.m4a') || storagePath?.endsWith('.ogg')));

  const publicUrl = resolveMediaUrl(storagePath) || "";
  const thumbnailUrl = thumbnailPath ? resolveMediaUrl(thumbnailPath) : null;

  // Use thumbnail if available, otherwise use publicUrl (for photos) or VideoThumbnail (for videos without thumb)
  // OPTIMIZATION: If falling back to publicUrl for a photo, request a resized version (600px width)
  const displayUrl = thumbnailUrl
    ? thumbnailUrl
    : (!isVideo && !isAudio
      ? resolveMediaUrl(storagePath, { width: 400 })
      : null);

  const formattedLocation = formatLocation(destinationName || "", country);
  const formattedTime = takenAt ? format(new Date(takenAt), "HH:mm") : null;

  const handleClick = (e: React.MouseEvent) => {
    // If clicking admin buttons, don't trigger lightbox
    // But admin buttons have e.stopPropagation() so this is fine.
    if (onClick) onClick();
  };

  return (
    <div
      className={`relative group cursor-pointer overflow-hidden bg-muted rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 ease-out ${className || ""}`}
      onClick={handleClick}
    >
      {/* Content Rendering Logic */}
      {status === 'draft' && (
        <div className="absolute top-2 right-2 z-30 px-2 py-0.5 bg-background/80 backdrop-blur-sm text-foreground/70 text-[10px] font-bold uppercase tracking-wider rounded-sm shadow-sm pointer-events-none border border-border/50">
          Draft
        </div>
      )}

      {(mimeType === 'text/plain' || mimeType === 'text') ? (
        // --- TEXT CARD ---
        <div className="w-full aspect-[4/5] bg-secondary/30 flex flex-col items-center justify-center p-6 text-center border border-border/50">
          <p className="font-display font-medium text-xl text-foreground/80 line-clamp-6 leading-relaxed">
            "{title || description}"
          </p>
        </div>
      ) : isAudio ? (
        // --- AUDIO CARD ---
        <div className="w-full aspect-[4/5] bg-secondary/30 flex flex-col items-center justify-center p-6 text-center gap-6 relative border border-border/50">
          <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center text-foreground/60 ring-1 ring-border shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
          </div>

          <div className="w-full max-w-[80%]" onClick={(e) => e.stopPropagation()}>
            <audio src={publicUrl} controls className="w-full shadow-sm rounded-full opacity-90 hover:opacity-100 transition-opacity" />
          </div>

          <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-2">Voice Note</span>
        </div>
      ) : (
        // --- PHOTO / VIDEO CARD ---
        <>
          {!displayUrl && isVideo ? (
            <video src={publicUrl} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105" muted playsInline />
          ) : (
            <img
              src={imageError ? "/placeholder.svg" : (displayUrl || publicUrl)}
              alt={title || "Travel photo"}
              className={`w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105 ${imageLoaded || imageError ? "opacity-100" : "opacity-0"
                } ${imageError ? "opacity-50 p-8 grayscale" : ""}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageLoaded(true);
                setImageError(true);
              }}
              loading="lazy"
            />
          )}

          {/* Location & Time Overlay Removed per user request */}
          {isVideo && (
            <div className="absolute top-3 left-3 flex flex-col items-start gap-0.5 z-20">
              <div className="bg-black/40 backdrop-blur-md rounded-full p-2 border border-white/10">
                <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[5px] border-y-transparent ml-0.5" />
              </div>
            </div>
          )}
        </>
      )}

      {/* Overlay - Portrait style: Soft gradient, airy feel */}
      <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-300 ease-out flex flex-col justify-end">
        {/* Animated Content Container */}
        <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-out">
          {/* Caption (if any) */}
          {/* Meta Info (Location · Date) - Editorial Style */}
          <div className="flex items-center text-xs font-normal text-white/90 mb-1 font-sans">
            {(destinationName || (latitude && longitude)) && (
              <span className="truncate max-w-[150px]">
                {destinationName || "Location"}
              </span>
            )}

            {takenAt && (destinationName || (latitude && longitude)) && (
              <span className="mx-1.5 opacity-60">·</span>
            )}

            {takenAt && (
              <span>
                {format(new Date(takenAt), "d MMM")}
              </span>
            )}
          </div>

          {/* Caption (if any) - Only show explicit Title or Description */}
          {(title || description) && (
            <p className="text-white font-medium text-sm leading-snug line-clamp-2 drop-shadow-md">
              {title || description}
            </p>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="absolute top-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30 ml-auto">
          {onStatusToggle && (
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 rounded-full bg-white/90 hover:bg-white shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onStatusToggle();
              }}
            >
              {status === "published" ? (
                <Eye className="w-3.5 h-3.5 text-foreground" strokeWidth={1.5} />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
              )}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 rounded-full shadow-sm bg-white/90 hover:bg-white text-muted-foreground hover:text-destructive transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this moment?")) {
                  onDelete();
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

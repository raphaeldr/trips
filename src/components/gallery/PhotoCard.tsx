import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Eye, EyeOff, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { VideoThumbnail } from "@/components/VideoThumbnail";
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

  const isVideo = mimeType?.startsWith("video/") || mimeType === "video";
  const publicUrl = resolveMediaUrl(storagePath) || "";
  const thumbnailUrl = thumbnailPath ? resolveMediaUrl(thumbnailPath) : null;

  // Use thumbnail if available, otherwise use publicUrl (for photos) or VideoThumbnail (for videos without thumb)
  const displayUrl = thumbnailUrl || (!isVideo ? publicUrl : null);

  const handleClick = (e: React.MouseEvent) => {
    // If clicking admin buttons, don't trigger lightbox
    // But admin buttons have e.stopPropagation() so this is fine.
    if (onClick) onClick();
  };

  return (
    <div
      className={`relative group cursor-pointer overflow-hidden bg-muted rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ease-out ${className || ""}`}
      onClick={handleClick}
    >
      {!displayUrl && isVideo ? (
        <VideoThumbnail src={publicUrl} className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110" />
      ) : (
        <img
          src={imageError ? "/placeholder.svg" : (displayUrl || publicUrl)}
          alt={title || "Travel photo"}
          className={`w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110 ${imageLoaded || imageError ? "opacity-100" : "opacity-0"
            } ${imageError ? "opacity-50 p-8 grayscale" : ""}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageLoaded(true);
            setImageError(true);
          }}
          loading="lazy"
        />
      )}

      {/* Video indicator - Minimalist Top Right */}
      {isVideo && (
        <div className="absolute top-3 right-3 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-black/20 backdrop-blur-md rounded-full p-2 border border-white/10">
            <div className="w-0 h-0 border-l-[8px] border-l-white border-y-[5px] border-y-transparent ml-0.5" />
          </div>
        </div>
      )}

      {/* Overlay - Portrait style: Clean, bottom-aligned, gradient only at very bottom */}
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end">
        {/* Caption (if any) */}
        {(destinationName || title || description) && (
          <p className="text-white text-xs font-medium line-clamp-2 mb-1 drop-shadow-md">
            {destinationName || title || description}
          </p>
        )}

        {/* Meta Info (Date/Loc) */}
        <div className="flex items-center gap-2 text-[10px] text-white/80 font-medium">
          {takenAt && (
            <span className="backdrop-blur-sm bg-black/20 px-1.5 py-0.5 rounded-full">
              {format(new Date(takenAt), "d MMM")}
            </span>
          )}
          {(latitude && longitude) && (
            <span className="flex items-center gap-0.5 backdrop-blur-sm bg-black/20 px-1.5 py-0.5 rounded-full max-w-[120px] truncate">
              <MapPin className="w-2.5 h-2.5" />
              <span className="truncate">Location</span>
            </span>
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
                <Eye className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-orange-500" />
              )}
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="icon"
              className="h-7 w-7 rounded-full shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm("Are you sure you want to delete this moment?")) {
                  onDelete();
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

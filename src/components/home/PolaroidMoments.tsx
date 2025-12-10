import { Link } from "react-router-dom";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import { supabase } from "@/integrations/supabase/client";
import { Play, ArrowRight } from "lucide-react";

interface Photo {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  mime_type: string | null;
  created_at: string;
  ai_caption: string | null;
}

interface PolaroidMomentsProps {
  photos: Photo[] | undefined;
  isLoading: boolean;
}

export const PolaroidMoments = ({ photos, isLoading }: PolaroidMomentsProps) => {
  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex-shrink-0 w-40 h-52 bg-card rounded-xl animate-pulse"
              style={{ transform: `rotate(${(i - 2) * 3}deg)` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!photos?.length) {
    return (
      <div className="px-4 py-6">
        <div className="bg-card rounded-2xl p-6 text-center border-2 border-dashed border-border">
          <p className="font-handwritten text-2xl text-muted-foreground">
            No moments yet... go capture some! 📸
          </p>
        </div>
      </div>
    );
  }

  const displayPhotos = photos.slice(0, 6);

  return (
    <section className="py-6">
      {/* Section header */}
      <div className="px-4 flex items-end justify-between mb-4">
        <div>
          <h2 className="font-handwritten text-3xl text-foreground">Recent moments</h2>
          <p className="text-sm text-muted-foreground mt-1">{photos.length} captured this week</p>
        </div>
        <Link
          to="/gallery"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          See all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Polaroid stack - horizontal scroll */}
      <div className="relative px-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-6 pt-2">
          {displayPhotos.map((photo, index) => {
            const isVideo = photo.mime_type?.startsWith("video/");
            const rotation = (index % 3 - 1) * 3; // -3, 0, 3 degrees
            const thumbnailUrl = photo.thumbnail_path
              ? supabase.storage.from("photos").getPublicUrl(photo.thumbnail_path).data.publicUrl
              : supabase.storage.from("photos").getPublicUrl(photo.storage_path).data.publicUrl;
            const mediaUrl = supabase.storage.from("photos").getPublicUrl(photo.storage_path).data.publicUrl;

            return (
              <Link
                key={photo.id}
                to="/gallery"
                className="flex-shrink-0 group"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <div className="w-36 bg-card rounded-lg overflow-hidden shadow-card transition-all duration-300 group-hover:shadow-elegant group-hover:scale-105 group-hover:rotate-0">
                  {/* Photo */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    {isVideo ? (
                      <>
                        <VideoThumbnail
                          src={mediaUrl}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-foreground/10">
                          <div className="w-10 h-10 rounded-full bg-card/90 flex items-center justify-center">
                            <Play className="w-4 h-4 text-foreground fill-foreground ml-0.5" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <img
                        src={thumbnailUrl}
                        alt={photo.ai_caption || "Moment"}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {/* Caption area */}
                  <div className="p-2 pb-3">
                    <p className="font-handwritten text-sm text-muted-foreground truncate">
                      {photo.ai_caption?.split(" ").slice(0, 3).join(" ") || "A moment"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

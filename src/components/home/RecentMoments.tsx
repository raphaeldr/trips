import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { VideoThumbnail } from "@/components/VideoThumbnail";
import { Skeleton } from "@/components/ui/skeleton";
import { Play } from "lucide-react";
import { Link } from "react-router-dom";

interface Photo {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  mime_type: string | null;
  created_at: string;
  ai_caption: string | null;
  destination_id: string | null;
}

interface RecentMomentsProps {
  photos: Photo[] | undefined;
  isLoading?: boolean;
}

export const RecentMoments = ({ photos, isLoading }: RecentMomentsProps) => {
  if (isLoading) {
    return (
      <div className="px-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Recent Moments
          </h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="w-32 h-44 rounded-2xl flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (!photos?.length) {
    return (
      <div className="px-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Recent Moments
          </h2>
        </div>
        <div className="bg-secondary/50 rounded-2xl p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No moments captured yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Recent Moments
        </h2>
        <Link
          to="/gallery"
          className="text-xs text-primary font-medium hover:underline"
        >
          See all
        </Link>
      </div>

      {/* Horizontal scroll container */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide snap-x snap-mandatory">
        {photos.map((photo) => {
          const isVideo = photo.mime_type?.startsWith("video/");
          const thumbnailUrl = photo.thumbnail_path
            ? supabase.storage.from("photos").getPublicUrl(photo.thumbnail_path)
                .data.publicUrl
            : null;
          const mediaUrl = supabase.storage
            .from("photos")
            .getPublicUrl(photo.storage_path).data.publicUrl;

          return (
            <div
              key={photo.id}
              className="relative w-32 h-44 flex-shrink-0 rounded-2xl overflow-hidden group cursor-pointer snap-start"
            >
              {/* Image/Video */}
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={photo.ai_caption || "Moment"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              ) : isVideo ? (
                <VideoThumbnail
                  src={mediaUrl}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <img
                  src={mediaUrl}
                  alt={photo.ai_caption || "Moment"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              )}

              {/* Video indicator */}
              {isVideo && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 bg-foreground/60 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Play className="w-3 h-3 text-card fill-current ml-0.5" />
                  </div>
                </div>
              )}

              {/* Bottom gradient & caption */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-3 pt-8">
                <p className="text-[10px] text-card/80 font-medium">
                  {format(new Date(photo.created_at), "d MMM")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

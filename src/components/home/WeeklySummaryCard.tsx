import { Sparkles, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Photo {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
}

interface WeeklySummaryCardProps {
  photos: Photo[] | undefined;
  weekNumber?: number;
  photosCount?: number;
  onPublish?: () => void;
}

export const WeeklySummaryCard = ({
  photos,
  weekNumber = 1,
  photosCount = 0,
  onPublish,
}: WeeklySummaryCardProps) => {
  const displayPhotos = photos?.slice(0, 5) || [];

  return (
    <div className="mx-5 bg-gradient-to-br from-primary/10 via-card to-secondary/10 border border-border rounded-2xl p-5 shadow-card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Week {weekNumber} Summary
            </h3>
            <p className="text-xs text-muted-foreground">
              {photosCount} new moments
            </p>
          </div>
        </div>
        <button
          onClick={onPublish}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Publish
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Photo preview stack */}
      {displayPhotos.length > 0 && (
        <div className="flex -space-x-3">
          {displayPhotos.map((photo, index) => {
            const url = photo.thumbnail_path
              ? supabase.storage.from("photos").getPublicUrl(photo.thumbnail_path)
                  .data.publicUrl
              : supabase.storage.from("photos").getPublicUrl(photo.storage_path)
                  .data.publicUrl;

            return (
              <div
                key={photo.id}
                className="w-12 h-12 rounded-xl overflow-hidden border-2 border-card shadow-sm"
                style={{ zIndex: displayPhotos.length - index }}
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            );
          })}
          {photosCount > 5 && (
            <div className="w-12 h-12 rounded-xl bg-secondary border-2 border-card flex items-center justify-center text-xs font-bold text-muted-foreground">
              +{photosCount - 5}
            </div>
          )}
        </div>
      )}

      {displayPhotos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Keep capturing moments to build your weekly summary!
        </p>
      )}
    </div>
  );
};

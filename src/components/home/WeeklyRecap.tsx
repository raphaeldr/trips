import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ChevronRight } from "lucide-react";

interface Photo {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
}

interface WeeklyRecapProps {
  photos: Photo[] | undefined;
  weekNumber: number;
  photosCount: number;
  onPublish?: () => void;
}

export const WeeklyRecap = ({ photos, weekNumber, photosCount, onPublish }: WeeklyRecapProps) => {
  const previewPhotos = photos?.slice(0, 4) || [];

  return (
    <section className="px-4 py-6">
      <div className="relative bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/20 rounded-3xl p-5 overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-primary/15 rounded-full blur-xl" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 text-primary mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Ready to share</span>
              </div>
              <h3 className="font-editorial text-xl font-semibold text-foreground">
                Week {weekNumber} Highlights
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {photosCount} moments captured
              </p>
            </div>
          </div>

          {/* Photo grid preview */}
          {previewPhotos.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 mb-4">
              {previewPhotos.map((photo, index) => {
                const url = photo.thumbnail_path
                  ? supabase.storage.from("photos").getPublicUrl(photo.thumbnail_path).data.publicUrl
                  : supabase.storage.from("photos").getPublicUrl(photo.storage_path).data.publicUrl;

                return (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-xl overflow-hidden"
                    style={{ transform: `rotate(${(index - 1.5) * 2}deg)` }}
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-20 flex items-center justify-center mb-4">
              <p className="font-handwritten text-lg text-muted-foreground">
                Keep capturing to build your recap!
              </p>
            </div>
          )}

          {/* Publish button */}
          <button
            onClick={onPublish}
            className="w-full flex items-center justify-center gap-2 bg-card hover:bg-card/80 text-foreground font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span>Create Weekly Story</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

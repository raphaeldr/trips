import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Camera, Image as ImageIcon, Play } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";

interface PhotoCardProps {
  id: string;
  storagePath: string;
  title?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  takenAt?: string;
  cameraMake?: string;
  cameraModel?: string;
  isHero?: boolean;
  onHeroToggle?: () => void;
  mimeType?: string;
  destinationName?: string;
  country?: string;
}

export const PhotoCard = ({
  id,
  storagePath,
  title,
  description,
  latitude,
  longitude,
  takenAt,
  cameraMake,
  cameraModel,
  isHero,
  onHeroToggle,
  mimeType,
  destinationName,
  country,
}: PhotoCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isTogglingHero, setIsTogglingHero] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAdminAuth();

  const isVideo = mimeType?.startsWith("video/");
  const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${storagePath}`;

  const handleSetAsHero = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTogglingHero(true);

    try {
      const { error } = await supabase.from("photos").update({ is_hero: !isHero }).eq("id", id);

      if (error) throw error;

      toast({
        title: isHero ? "Removed from hero" : "Set as hero image",
        description: isHero ? "This photo is no longer the hero image" : "This photo is now displayed on the homepage",
      });

      if (onHeroToggle) onHeroToggle();
    } catch (error) {
      console.error("Error setting hero image:", error);
      toast({
        title: "Error",
        description: "Failed to update hero image",
        variant: "destructive",
      });
    } finally {
      setIsTogglingHero(false);
    }
  };

  return (
    <>
      <div className="group cursor-pointer flex flex-col gap-2" onClick={() => setIsOpen(true)}>
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {isVideo ? (
            <div className="relative w-full h-full">
              <video
                src={`${publicUrl}#t=0.1`}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoadedData={() => setImageLoaded(true)}
                onLoadedMetadata={() => setImageLoaded(true)} // Added fallback trigger
                preload="auto" // Changed to auto for better frame loading
                muted
                playsInline
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                <div className="bg-white/30 backdrop-blur-md p-3 rounded-full border border-white/40 shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
              </div>
            </div>
          ) : (
            <img
              src={publicUrl}
              alt={title || "Travel photo"}
              className={`w-full h-full object-cover transition-opacity duration-700 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
          )}

          {/* Badges */}
          <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {isHero && !isVideo && (
              <Badge
                variant="default"
                className="bg-yellow-500/90 hover:bg-yellow-600 text-white border-none shadow-sm h-5 px-1.5 text-[10px]"
              >
                <ImageIcon className="w-3 h-3" />
              </Badge>
            )}
          </div>
        </div>

        {/* Text Underneath */}
        <div className="space-y-0.5 px-1">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground leading-tight truncate">
            {destinationName || title || "Untitled"}
          </h3>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-transparent border-none shadow-none p-0 flex flex-col items-center justify-center outline-none">
          <div className="relative w-full flex justify-center">
            {isVideo ? (
              <video
                src={publicUrl}
                controls
                autoPlay
                playsInline
                className="max-h-[80vh] w-auto rounded-xl shadow-2xl"
              />
            ) : (
              <img
                src={publicUrl}
                alt={title || "Travel photo"}
                className="max-h-[80vh] w-auto rounded-xl shadow-2xl object-contain"
              />
            )}

            {isAdmin && !isVideo && (
              <Button
                onClick={handleSetAsHero}
                disabled={isTogglingHero}
                variant={isHero ? "default" : "secondary"}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                {isHero ? "Hero Image" : "Set as Hero"}
              </Button>
            )}
          </div>

          {(title || description || takenAt) && (
            <div className="bg-white/90 dark:bg-black/90 backdrop-blur-xl p-6 rounded-2xl max-w-2xl w-full mt-4 shadow-xl border border-white/20">
              <div className="flex justify-between items-start mb-4">
                <div>
                  {title && <h3 className="text-xl font-bold mb-1">{title}</h3>}
                  <div className="flex gap-2 text-sm text-muted-foreground">
                    {destinationName && <span>{destinationName}</span>}
                    {country && <span>• {country}</span>}
                  </div>
                </div>
              </div>

              {description && <p className="text-muted-foreground mb-4">{description}</p>}

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-4 border-t border-border">
                {takenAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(takenAt), "MMMM d, yyyy")}
                  </div>
                )}
                {latitude && longitude && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </div>
                )}
                {(cameraMake || cameraModel) && (
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    {[cameraMake, cameraModel].filter(Boolean).join(" ")}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

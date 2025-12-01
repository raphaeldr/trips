import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Camera, Image as ImageIcon, Play, Video } from "lucide-react";
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
      <Card
        className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-500 hover:-translate-y-1 border-none shadow-card rounded-2xl bg-white dark:bg-black"
        onClick={() => setIsOpen(true)}
      >
        <CardContent className="p-0">
          <div className="relative overflow-hidden bg-muted">
            {isVideo ? (
              <div className="relative w-full aspect-[4/5] md:aspect-auto">
                <video
                  src={`${publicUrl}#t=0.1`}
                  className={`w-full h-full object-cover transition-all duration-700 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoadedData={() => setImageLoaded(true)}
                  preload="metadata"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                  <div className="bg-white/30 backdrop-blur-md p-4 rounded-full border border-white/40 shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 text-white fill-white ml-1" />
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={publicUrl}
                alt={title || "Travel photo"}
                className={`w-full h-full object-cover transition-all duration-700 ${
                  imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110"
                } group-hover:scale-105`}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
            )}

            {/* Gradient Overlay on Hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Info on Hover */}
            <div className="absolute bottom-0 left-0 p-4 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 w-full">
              {title && <p className="text-white font-bold truncate">{title}</p>}
              {description && <p className="text-white/80 text-xs line-clamp-1">{description}</p>}
              <div className="flex gap-2 mt-2">
                 {takenAt && (
                    <Badge variant="outline" className="text-[10px] text-white border-white/30 bg-black/20 backdrop-blur-sm">
                      {format(new Date(takenAt), "MMM d")}
                    </Badge>
                 )}
                 {latitude && (
                    <Badge variant="outline" className="text-[10px] text-white border-white/30 bg-black/20 backdrop-blur-sm">
                      <MapPin className="w-2 h-2 mr-1" /> Location
                    </Badge>
                 )}
              </div>
            </div>

            {/* Top Badges */}
            <div className="absolute top-3 right-3 flex gap-2">
              {isVideo && (
                 <Badge className="bg-black/50 backdrop-blur-md text-white border-none hover:bg-black/60">
                    <Video className="w-3 h-3 mr-1" /> Video
                 </Badge>
              )}
              {isHero && !isVideo && (
                <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-white border-none shadow-sm">
                  <ImageIcon className="w-3 h-3 mr-1" /> Hero
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto bg-transparent border-none shadow-none p-0 flex flex-col items-center justify-center outline-none">
          <div className="relative w-full flex justify-center">
            {isVideo ? (
              <video src={publicUrl} controls autoPlay playsInline className="max-h-[80vh] w-auto rounded-xl shadow-2xl" />
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
              {title && <h3 className="text-xl font-bold mb-2">{title}</h3>}
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

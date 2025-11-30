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
        className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 border-none shadow-none bg-transparent"
        onClick={() => setIsOpen(true)}
      >
        <CardContent className="p-0">
          <div className="relative aspect-square overflow-hidden bg-muted rounded-lg">
            {isVideo ? (
              <div className="relative w-full h-full">
                <video
                  src={`${publicUrl}#t=0.1`}
                  className={`w-full h-full object-cover transition-all duration-500 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoadedData={() => setImageLoaded(true)}
                  preload="metadata"
                  muted
                  playsInline
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                  <div className="bg-black/30 backdrop-blur-sm p-3 rounded-full border border-white/20">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                {/* Video type badge */}
                <div className="absolute top-2 right-2 opacity-100">
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border-none"
                  >
                    <Video className="w-3 h-3" />
                  </Badge>
                </div>
              </div>
            ) : (
              <img
                src={publicUrl}
                alt={title || "Travel photo"}
                className={`w-full h-full object-cover transition-all duration-500 ${
                  imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110"
                }`}
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
            )}

            {!imageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted-foreground/10" />
            )}

            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {isHero && !isVideo && (
                <Badge variant="default" className="gap-1 bg-primary/90 backdrop-blur-sm">
                  <ImageIcon className="w-3 h-3" />
                  Hero
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-transparent border-none shadow-none p-0">
          <div className="space-y-4">
            <div className="relative flex justify-center bg-black/50 rounded-lg overflow-hidden backdrop-blur-sm">
              {isVideo ? (
                <video src={publicUrl} controls autoPlay playsInline className="max-h-[85vh] w-full rounded-lg" />
              ) : (
                <img
                  src={publicUrl}
                  alt={title || "Travel photo"}
                  className="max-h-[85vh] w-auto rounded-lg object-contain"
                />
              )}

              {isAdmin && !isVideo && (
                <Button
                  onClick={handleSetAsHero}
                  disabled={isTogglingHero}
                  variant={isHero ? "default" : "outline"}
                  className="absolute top-4 right-4 bg-background/50 hover:bg-background/80 backdrop-blur-md"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {isHero ? "Hero Image" : "Set as Hero"}
                </Button>
              )}
            </div>

            {description && (
              <div className="bg-background/90 backdrop-blur-md p-4 rounded-lg max-w-2xl mx-auto">
                <h3 className="font-semibold text-sm">Caption</h3>
                <p className="text-muted-foreground text-sm">{description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-background/90 backdrop-blur-md rounded-lg max-w-2xl mx-auto">
              {takenAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(takenAt), "d MMMM yyyy")}
                </div>
              )}

              {latitude && longitude && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {latitude.toFixed(4)}, {longitude.toFixed(4)}
                </div>
              )}

              {(cameraMake || cameraModel) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-2">
                  <Camera className="w-4 h-4" />
                  {[cameraMake, cameraModel].filter(Boolean).join(" ")}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

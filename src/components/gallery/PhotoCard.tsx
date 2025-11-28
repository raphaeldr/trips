import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Camera, Image as ImageIcon } from "lucide-react";
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
}: PhotoCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isTogglingHero, setIsTogglingHero] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAdminAuth();

  const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/photos/${storagePath}`;

  const handleSetAsHero = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTogglingHero(true);
    
    try {
      const { error } = await supabase
        .from("photos")
        .update({ is_hero: !isHero })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: isHero ? "Removed from hero" : "Set as hero image",
        description: isHero 
          ? "This photo is no longer the hero image" 
          : "This photo is now displayed on the homepage",
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
        className="group cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105"
        onClick={() => setIsOpen(true)}
      >
        <CardContent className="p-0">
          <div className="relative aspect-square overflow-hidden bg-muted">
            <img
              src={publicUrl}
              alt={title || "Travel photo"}
              className={`w-full h-full object-cover transition-all duration-500 ${
                imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110"
              }`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
            {!imageLoaded && (
              <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted-foreground/10" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {isHero && (
                <Badge variant="default" className="gap-1 bg-primary/90 backdrop-blur-sm">
                  <ImageIcon className="w-3 h-3" />
                  Hero
                </Badge>
              )}
            </div>

            {description && (
              <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-sm font-medium line-clamp-2">
                  {description}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={publicUrl}
                  alt={title || "Travel photo"}
                  className="w-full rounded-lg"
                />
                {isAdmin && (
                  <Button
                    onClick={handleSetAsHero}
                    disabled={isTogglingHero}
                    variant={isHero ? "default" : "outline"}
                    className="absolute top-4 right-4"
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {isHero ? "Hero Image" : "Set as Hero"}
                  </Button>
                )}
              </div>
              
              {description && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Caption</h3>
                  <p className="text-muted-foreground">{description}</p>
                </div>
              )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
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
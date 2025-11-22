import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Camera, Sparkles, Image as ImageIcon } from "lucide-react";
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
  aiCaption?: string;
  aiTags?: string[];
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
  aiCaption,
  aiTags,
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
              {aiTags && aiTags.length > 0 && (
                <Badge variant="secondary" className="gap-1 bg-background/90 backdrop-blur-sm">
                  <Sparkles className="w-3 h-3" />
                  AI Tagged
                </Badge>
              )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              {aiCaption && (
                <p className="text-white text-sm font-medium mb-2 line-clamp-2">
                  {aiCaption}
                </p>
              )}
              <div className="flex flex-wrap gap-1">
                {aiTags?.slice(0, 3).map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-background/80 backdrop-blur-sm">
                    {tag}
                  </Badge>
                ))}
                {aiTags && aiTags.length > 3 && (
                  <Badge variant="outline" className="text-xs bg-background/80 backdrop-blur-sm">
                    +{aiTags.length - 3}
                  </Badge>
                )}
              </div>
            </div>
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
            
            {aiCaption && (
              <div className="space-y-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  AI Caption
                </h3>
                <p className="text-muted-foreground">{aiCaption}</p>
              </div>
            )}

            {aiTags && aiTags.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {aiTags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              {takenAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(takenAt), "PPP")}
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
import { Calendar, Globe, MapPin, Camera, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const TripProgressWidget = ({ days, km, destinations }: { days: number; km: number; destinations: any[] }) => {
  return (
    <Card className="h-full bg-white border-border flex flex-col relative overflow-hidden group shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Top Section: Key Stats Split */}
      <div className="grid grid-cols-2 divide-x divide-border border-b border-border bg-gray-50/50">
        <div className="p-6 flex flex-col justify-center items-center text-center gap-2 group/stat hover:bg-white transition-colors">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <Calendar className="w-3 h-3 text-primary" />
            Days
          </div>
          <span className="text-3xl sm:text-4xl font-display font-bold text-foreground tabular-nums tracking-tight group-hover/stat:text-primary transition-colors">
            {days}
          </span>
        </div>
        <div className="p-6 flex flex-col justify-center items-center text-center gap-2 group/stat hover:bg-white transition-colors">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <Globe className="w-3 h-3 text-primary" />
            Distance
          </div>
          <span className="text-3xl sm:text-4xl font-display font-bold text-foreground tabular-nums tracking-tight group-hover/stat:text-primary transition-colors">
            {(km / 1000).toFixed(1)}k
          </span>
        </div>
      </div>

      {/* Bottom Section: Timeline History */}
      <div className="flex-1 p-6 flex flex-col min-h-0 bg-white relative">
        <div className="flex items-center justify-between mb-6 z-10 shrink-0">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-3 h-3 text-primary" />
            Full History
          </div>
          <Badge variant="secondary" className="text-xs font-normal">
            {destinations?.length || 0} Stops
          </Badge>
        </div>

        {/* Top Fade for Scroll */}
        <div className="absolute top-[80px] left-0 w-full h-8 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />

        <ScrollArea className="flex-1 -mx-4 px-4 bento-scroll h-full">
          <div className="space-y-0 relative z-0 pb-2">
            {/* Vertical Line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

            {destinations?.map((dest, i) => (
              <div key={dest.id} className="relative pl-8 py-3 group/item cursor-default">
                <div
                  className={`absolute left-4 top-[18px] w-1.5 h-1.5 rounded-full ring-4 ring-white ${i === 0 ? "bg-primary scale-125" : "bg-gray-300 group-hover/item:bg-primary/50"} transition-all duration-300 z-10`}
                />
                <div className="flex flex-col">
                  <span
                    className={`text-sm font-medium leading-none ${i === 0 ? "text-foreground" : "text-muted-foreground group-hover/item:text-foreground"} transition-colors`}
                  >
                    {dest.name}
                  </span>
                  <span className="text-xs text-muted-foreground/60 font-medium mt-1">{dest.country}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Bottom Fade for Scroll */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
      </div>
    </Card>
  );
};

export const CameraRollWidget = ({ photos, isLoading }: { photos: any[]; isLoading?: boolean }) => {
  return (
    <Card className="h-full bg-white border-border rounded-xl p-6 flex flex-col justify-center relative overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
          <Camera className="w-3 h-3 text-primary" />
          Camera Roll
        </div>
        <Link
          to="/gallery"
          className="text-xs text-primary hover:underline font-medium flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity"
        >
          See All <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 relative z-10 h-full">
        {photos?.slice(0, 4).map((photo) => {
          const url = supabase.storage.from("photos").getPublicUrl(photo.thumbnail_path || photo.storage_path)
            .data.publicUrl;
          return (
            <div
              key={photo.id}
              className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
            </div>
          );
        })}
        {(!photos || photos.length < 4) &&
          Array(4 - (photos?.length || 0))
            .fill(0)
            .map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl bg-secondary/50" />)}
      </div>
    </Card>
  );
};

import { MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export const TripProgressWidget = ({ destinations }: { destinations: any[] }) => {
  const displayDestinations = destinations?.slice(0, 6) || [];
  const destIds = displayDestinations.map(d => d.id);

  // Fetch photos for all destinations in one query
  const { data: photos } = useQuery({
    queryKey: ["destinationPhotosWidget", destIds],
    queryFn: async () => {
      if (!destIds.length) return [];
      
      const { data, error } = await supabase
        .from("photos")
        .select("destination_id, storage_path, thumbnail_path, is_hero")
        .in("destination_id", destIds)
        .order("is_hero", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: destIds.length > 0,
  });

  // Build photo map - one per destination
  const photoMap: Record<string, string> = {};
  if (photos) {
    for (const photo of photos) {
      if (!photoMap[photo.destination_id]) {
        const path = photo.thumbnail_path || photo.storage_path;
        photoMap[photo.destination_id] = supabase.storage.from("photos").getPublicUrl(path).data.publicUrl;
      }
    }
  }

  return (
    <div className="h-full bg-card border border-border rounded-3xl flex flex-col relative overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="p-4 pb-0 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-3 h-3 text-primary" />
            Journey Timeline
          </div>
          <Link to="/map" className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
            Full Map <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Visual Journey Grid */}
      <div className="flex-1 p-4 pt-3 overflow-hidden">
        <div className="grid grid-cols-3 gap-1.5 h-full">
          {displayDestinations.slice(0, 6).map((dest, i) => (
            <div 
              key={dest.id} 
              className={`relative rounded-lg overflow-hidden group cursor-pointer ${
                i === 0 ? 'col-span-2 row-span-2' : ''
              }`}
            >
              {/* Background Image or Gradient */}
              <div className="absolute inset-0">
                {photoMap[dest.id] ? (
                  <img
                    src={photoMap[dest.id]}
                    alt={dest.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30" />
                )}
              </div>
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              {/* Current badge */}
              {i === 0 && (
                <div className="absolute top-1.5 left-1.5 bg-primary/90 text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                  Now
                </div>
              )}
              
              {/* Content */}
              <div className="absolute inset-0 p-2 flex flex-col justify-end">
                <h4 className={`font-bold text-white leading-tight drop-shadow-md truncate ${i === 0 ? 'text-sm' : 'text-[10px]'}`}>
                  {dest.name}
                </h4>
                {i === 0 && (
                  <p className="text-white/70 text-[10px] truncate">
                    {dest.country}
                  </p>
                )}
              </div>
            </div>
          ))}
          
          {/* Show remaining count if more than 6 */}
          {destinations?.length > 6 && (
            <Link 
              to="/map"
              className="relative rounded-lg overflow-hidden bg-secondary/50 flex items-center justify-center group hover:bg-secondary/70 transition-colors"
            >
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">+{destinations.length - 6}</div>
                <div className="text-[10px] text-muted-foreground">more</div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

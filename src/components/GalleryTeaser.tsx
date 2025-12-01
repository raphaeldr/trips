import { Link } from "react-router-dom";
import { Camera } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const GalleryTeaser = () => {
  // Fetch recent photos for the teaser
  const { data: recentPhotos } = useQuery({
    queryKey: ["recentPhotos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <Link 
      to="/gallery" 
      className="col-span-1 md:col-span-1 row-span-2 bg-zinc-100 dark:bg-zinc-900 rounded-3xl p-8 flex flex-col justify-between group hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors overflow-hidden relative"
    >
      <div className="space-y-4 relative z-10">
        <div className="w-12 h-12 bg-white dark:bg-black rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
          <Camera className="w-6 h-6 text-foreground" />
        </div>
        <h3 className="text-2xl font-bold leading-tight">
          Visual<br/>Diary
        </h3>
      </div>
      
      {/* Scattered photo snapshots */}
      <div className="relative h-32 mb-4">
        {recentPhotos?.slice(0, 3).map((photo, i) => {
          const positions = [
            { top: '0%', left: '5%', rotate: '-6deg', zIndex: 3 },
            { top: '20%', right: '10%', rotate: '8deg', zIndex: 2 },
            { bottom: '0%', left: '20%', rotate: '-3deg', zIndex: 1 },
          ];
          
          const photoUrl = supabase.storage
            .from("photos")
            .getPublicUrl(photo.thumbnail_path || photo.storage_path).data.publicUrl;

          return (
            <div
              key={photo.id}
              className="absolute w-20 h-20 rounded-lg shadow-lg overflow-hidden border-2 border-white dark:border-zinc-800 transition-transform group-hover:scale-105"
              style={{
                ...positions[i],
                transform: `rotate(${positions[i].rotate})`,
              }}
            >
              <img
                src={photoUrl}
                alt={photo.title || "Gallery photo"}
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
      </div>
      
      <p className="text-sm text-muted-foreground relative z-10">View all photos →</p>
    </Link>
  );
};

import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Video } from "lucide-react";

const Gallery = () => {
  const [filter, setFilter] = useState("all");

  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("arrival_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const {
    data: photos,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Filter photos based on tab
  const filteredPhotos = useMemo(() => {
    if (!photos) return [];
    if (filter === "all") return photos;
    if (filter === "videos") return photos.filter(p => p.mime_type?.startsWith("video/") || p.animated_path);
    return photos;
  }, [photos, filter]);

  // Use a simple masonry-like approach by splitting into columns
  // Note: For a real masonry layout, a library like react-masonry-css is better, but we can fake it with flex columns
  const columns = useMemo(() => {
    const cols: any[][] = [[], [], []];
    filteredPhotos.forEach((photo, i) => {
      cols[i % 3].push(photo);
    });
    return cols;
  }, [filteredPhotos]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <BottomNav />
      
      <div className="pt-24 container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-2">Memories</h1>
            <p className="text-muted-foreground">
              {photos?.length || 0} moments across {destinations?.length || 0} locations.
            </p>
          </div>

          <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setFilter}>
            <TabsList className="grid w-full grid-cols-2 md:w-[200px]">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="videos" className="flex gap-2">
                <Video className="w-3 h-3" /> Videos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <Skeleton key={i} className={`rounded-xl ${i % 2 === 0 ? 'aspect-square' : 'aspect-[3/4]'}`} />
            ))}
          </div>
        ) : filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Column 1 */}
            <div className="flex flex-col gap-6">
              {columns[0].map((photo) => (
                <div key={photo.id} className="break-inside-avoid">
                  <PhotoCard
                    id={photo.id}
                    storagePath={photo.storage_path}
                    title={photo.title}
                    description={photo.description}
                    latitude={photo.latitude}
                    longitude={photo.longitude}
                    takenAt={photo.taken_at}
                    cameraMake={photo.camera_make}
                    cameraModel={photo.camera_model}
                    isHero={photo.is_hero}
                    mimeType={photo.mime_type}
                    onHeroToggle={refetch}
                  />
                </div>
              ))}
            </div>
            
            {/* Column 2 */}
            <div className="flex flex-col gap-6">
              {columns[1].map((photo) => (
                <div key={photo.id} className="break-inside-avoid">
                  <PhotoCard
                    id={photo.id}
                    storagePath={photo.storage_path}
                    title={photo.title}
                    description={photo.description}
                    latitude={photo.latitude}
                    longitude={photo.longitude}
                    takenAt={photo.taken_at}
                    cameraMake={photo.camera_make}
                    cameraModel={photo.camera_model}
                    isHero={photo.is_hero}
                    mimeType={photo.mime_type}
                    onHeroToggle={refetch}
                  />
                </div>
              ))}
            </div>

            {/* Column 3 (Hidden on mobile/small screens if you want, but sticking to responsive grid above) */}
            <div className="flex flex-col gap-6 md:hidden lg:flex">
              {columns[2].map((photo) => (
                <div key={photo.id} className="break-inside-avoid">
                  <PhotoCard
                    id={photo.id}
                    storagePath={photo.storage_path}
                    title={photo.title}
                    description={photo.description}
                    latitude={photo.latitude}
                    longitude={photo.longitude}
                    takenAt={photo.taken_at}
                    cameraMake={photo.camera_make}
                    cameraModel={photo.camera_model}
                    isHero={photo.is_hero}
                    mimeType={photo.mime_type}
                    onHeroToggle={refetch}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
            <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No photos yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Upload photos in the Admin panel to fill your gallery with memories.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;

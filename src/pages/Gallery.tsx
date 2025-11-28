import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { Skeleton } from "@/components/ui/skeleton";
const Gallery = () => {
  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("arrival_date", { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const { data: photos, isLoading, refetch } = useQuery({
    queryKey: ["photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Group photos by destination
  const photosByDestination = destinations?.map(destination => ({
    destination,
    photos: photos?.filter(p => p.destination_id === destination.id) || []
  })).filter(group => group.photos.length > 0) || [];
  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />
      <BottomNav />
      <div className="pt-20 container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">
            Photo Gallery
          </h1>
          <p className="text-muted-foreground">
            {photos?.length || 0} photos across {photosByDestination.length} destinations
          </p>
        </div>

        <div className="space-y-12">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : photosByDestination.length > 0 ? (
            photosByDestination.map(({ destination, photos }) => (
              <div key={destination.id} className="space-y-4">
                <div className="border-b border-border pb-2">
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    {destination.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {destination.country} • {photos.length} photo{photos.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map(photo => (
                    <PhotoCard
                      key={photo.id}
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
                      onHeroToggle={refetch}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">
                No photos yet. Upload some photos from the admin panel!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Gallery;
import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { useMemo } from "react";
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
        .not("mime_type", "ilike", "video/%") // Filter out videos server-side
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Group photos by Country -> Destination
  const photosByCountry = useMemo(() => {
    if (!destinations || !photos) return [];

    // Create a map to group destinations by country
    const countryMap = new Map();

    destinations.forEach((destination) => {
      const destPhotos = photos.filter((p) => p.destination_id === destination.id);

      if (destPhotos.length > 0) {
        if (!countryMap.has(destination.country)) {
          countryMap.set(destination.country, []);
        }
        countryMap.get(destination.country).push({
          destination,
          photos: destPhotos,
        });
      }
    });

    // Convert map to array for rendering
    return Array.from(countryMap.entries()).map(([country, destinationGroups]) => ({
      country,
      destinationGroups,
    }));
  }, [destinations, photos]);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />
      <BottomNav />
      <div className="pt-24 container mx-auto px-6 py-12">
        <div className="mb-12 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">Photo Gallery</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            A visual collection of our journey across {photosByCountry.length} countries and {photos?.length || 0}{" "}
            moments captured in time.
          </p>
        </div>

        <div className="space-y-16">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          ) : photosByCountry.length > 0 ? (
            photosByCountry.map(({ country, destinationGroups }) => (
              <div key={country} className="animate-in fade-in-50 duration-500">
                {/* Country Heading */}
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-3xl font-display font-bold text-foreground">{country}</h2>
                  <div className="h-px bg-border flex-1" />
                </div>

                <div className="space-y-10">
                  {destinationGroups.map(({ destination, photos }) => (
                    <div key={destination.id}>
                      <div className="mb-4 ml-1">
                        <h3 className="text-lg font-medium text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                          {destination.name}
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {photos.map((photo) => (
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
                            mimeType={photo.mime_type}
                            onHeroToggle={refetch}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground text-lg">
                No photos uploaded yet.
                <br />
                <span className="text-sm">Visit the admin panel to start your gallery.</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Gallery;

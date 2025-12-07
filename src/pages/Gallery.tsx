import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Video } from "lucide-react";

interface Photo {
  id: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  taken_at: string | null;
  camera_make: string | null;
  camera_model: string | null;
  is_hero: boolean | null;
  mime_type: string | null;
  destination_id: string | null;
}

interface Destination {
  id: string;
  name: string;
  country: string;
  arrival_date: string;
  departure_date: string | null;
}

// Updated interface for flattened structure
interface CountryGroup {
  country: string;
  photos: (Photo & { destinationName?: string; country?: string })[];
}

const Gallery = () => {
  const [filter, setFilter] = useState("all");

  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("arrival_date", { ascending: false });
      if (error) throw error;
      return data as Destination[];
    },
  });

  const {
    data: photos,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["photos_public"],
    queryFn: async () => {
      // Use photos_public view for obfuscated GPS coordinates (city-level only)
      const { data, error } = await supabase
        .from("photos_public" as "photos")
        .select("*")
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Photo[];
    },
  });

  // Filter photos based on tab
  const filteredPhotos = useMemo(() => {
    if (!photos) return [];
    if (filter === "all") return photos;
    if (filter === "videos") return photos.filter((p) => p.mime_type?.startsWith("video/"));
    return photos;
  }, [photos, filter]);

  // Group photos by country only (Flattened)
  const groupedPhotos = useMemo(() => {
    if (!filteredPhotos.length || !destinations) return [];

    const destinationMap = new Map(destinations.map((d) => [d.id, d]));
    const countryGroups = new Map<string, (Photo & { destinationName?: string; country?: string })[]>();

    filteredPhotos.forEach((photo) => {
      let country = "Uncategorized";
      let destinationName = "";

      if (photo.destination_id) {
        const destination = destinationMap.get(photo.destination_id);
        if (destination) {
          country = destination.country;
          destinationName = destination.name;
        }
      }

      if (!countryGroups.has(country)) {
        countryGroups.set(country, []);
      }

      countryGroups.get(country)!.push({
        ...photo,
        destinationName,
        country, // Pass country for the card
      });
    });

    const result: CountryGroup[] = Array.from(countryGroups.entries()).map(([country, groupPhotos]) => ({
      country,
      photos: groupPhotos,
    }));

    // Sort countries by the date of the most recent photo
    result.sort((a, b) => {
      const dateA = new Date(a.photos[0]?.taken_at || 0).getTime();
      const dateB = new Date(b.photos[0]?.taken_at || 0).getTime();
      return dateB - dateA;
    });

    return result;
  }, [filteredPhotos, destinations]);

  // Dynamic Grid Class based on number of photos
  const getGridClass = (count: number) => {
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <BottomNav />

      <div className="pt-24 container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-2">Camera roll</h1>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square rounded-none" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : groupedPhotos.length > 0 ? (
          <div className="space-y-16">
            {groupedPhotos.map((group) => (
              <div key={group.country} className="space-y-6">
                {/* Country Header */}
                <div className="border-b border-border pb-4">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">{group.country}</h2>
                </div>

                {/* Dynamic Photos Grid */}
                <div className={`grid gap-x-1 gap-y-8 ${getGridClass(group.photos.length)}`}>
                  {group.photos.map((photo) => (
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
                      destinationName={photo.destinationName || "Unassigned"}
                      country={group.country !== "Uncategorized" ? group.country : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
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

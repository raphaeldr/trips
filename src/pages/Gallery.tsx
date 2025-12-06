import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Video, MapPin } from "lucide-react";
import { format } from "date-fns";

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

interface GroupedPhotos {
  country: string;
  destinations: {
    destination: Destination;
    photos: Photo[];
  }[];
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

  const { data: photos, isLoading, refetch } = useQuery({
    queryKey: ["photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return data as Photo[];
    },
  });

  // Filter photos based on tab
  const filteredPhotos = useMemo(() => {
    if (!photos) return [];
    if (filter === "all") return photos;
    if (filter === "videos")
      return photos.filter((p) => p.mime_type?.startsWith("video/"));
    return photos;
  }, [photos, filter]);

  // Group photos by country and destination
  const groupedPhotos = useMemo(() => {
    if (!filteredPhotos.length || !destinations) return [];

    const destinationMap = new Map(destinations.map((d) => [d.id, d]));
    const countryGroups = new Map<string, Map<string, Photo[]>>();

    // Group photos by destination
    filteredPhotos.forEach((photo) => {
      if (!photo.destination_id) return;
      const destination = destinationMap.get(photo.destination_id);
      if (!destination) return;

      if (!countryGroups.has(destination.country)) {
        countryGroups.set(destination.country, new Map());
      }
      const countryMap = countryGroups.get(destination.country)!;

      if (!countryMap.has(destination.id)) {
        countryMap.set(destination.id, []);
      }
      countryMap.get(destination.id)!.push(photo);
    });

    // Convert to array structure, sorted by most recent destination per country
    const result: GroupedPhotos[] = [];

    countryGroups.forEach((destinationsMap, country) => {
      const destinationsList: { destination: Destination; photos: Photo[] }[] = [];

      destinationsMap.forEach((photos, destId) => {
        const destination = destinationMap.get(destId);
        if (destination) {
          destinationsList.push({ destination, photos });
        }
      });

      // Sort destinations by arrival date (most recent first)
      destinationsList.sort(
        (a, b) =>
          new Date(b.destination.arrival_date).getTime() -
          new Date(a.destination.arrival_date).getTime()
      );

      result.push({ country, destinations: destinationsList });
    });

    // Sort countries by most recent destination arrival date
    result.sort((a, b) => {
      const aDate = new Date(a.destinations[0]?.destination.arrival_date || 0);
      const bDate = new Date(b.destinations[0]?.destination.arrival_date || 0);
      return bDate.getTime() - aDate.getTime();
    });

    return result;
  }, [filteredPhotos, destinations]);

  // Get photos without destination
  const unassignedPhotos = useMemo(() => {
    return filteredPhotos.filter((p) => !p.destination_id);
  }, [filteredPhotos]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <BottomNav />

      <div className="pt-24 container mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-2">
              Camera roll
            </h1>
            <p className="text-muted-foreground">
              {photos?.length || 0} moments across {destinations?.length || 0}{" "}
              locations.
            </p>
          </div>

          <Tabs
            defaultValue="all"
            className="w-full md:w-auto"
            onValueChange={setFilter}
          >
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
              <Skeleton
                key={i}
                className={`rounded-xl ${i % 2 === 0 ? "aspect-square" : "aspect-[3/4]"}`}
              />
            ))}
          </div>
        ) : filteredPhotos.length > 0 ? (
          <div className="space-y-12">
            {groupedPhotos.map((countryGroup) => (
              <div key={countryGroup.country} className="space-y-8">
                {/* Country Header */}
                <div className="border-b border-border pb-4">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                    {countryGroup.country}
                  </h2>
                </div>

                {/* Destinations within country */}
                {countryGroup.destinations.map(({ destination, photos }) => (
                  <div key={destination.id} className="space-y-4">
                    {/* Destination Header */}
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="text-xl md:text-2xl font-display font-semibold text-foreground">
                          {destination.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(destination.arrival_date), "d MMMM yyyy")}
                          {destination.departure_date &&
                            ` — ${format(new Date(destination.departure_date), "d MMMM yyyy")}`}
                        </p>
                      </div>
                    </div>

                    {/* Photos Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            ))}

            {/* Unassigned photos section */}
            {unassignedPhotos.length > 0 && (
              <div className="space-y-4">
                <div className="border-b border-border pb-4">
                  <h2 className="text-3xl md:text-4xl font-display font-bold text-muted-foreground">
                    Uncategorized
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Photos not assigned to a destination
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {unassignedPhotos.map((photo) => (
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
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-3xl bg-muted/20">
            <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No photos yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Upload photos in the Admin panel to fill your gallery with
              memories.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;

import { Navigation } from "@/components/Navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasonryGrid } from "@/components/ui/MasonryGrid";
import { Lightbox } from "@/components/gallery/Lightbox";

interface Moment {
  id: string;
  storage_path: string | null;
  thumbnail_path: string | null;
  title: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  taken_at: string | null;
  is_hero: boolean | null;
  mime_type: string | null;
  destination_id: string | null;
  media_type: string | null;
  caption: string | null;
  status: string | null;
  location_name: string | null;
  destinations: {
    name: string;
    country: string;
  } | null;
}

const resolveMediaUrl = (path: string | null) => {
  if (!path) return undefined;
  const { data } = supabase.storage.from("photos").getPublicUrl(path);
  return data.publicUrl;
};

const Gallery = () => {
  const {
    data: moments,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["moments_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moments")
        .select("*, destinations ( name, country )")
        .in("media_type", ["photo", "video", "audio", "text"])
        .order("taken_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Moment[];
    },
  });

  const { toast } = useToast();

  // Group moments by country
  const momentsByCountry = useMemo(() => {
    return moments?.reduce((acc, moment) => {
      const country = moment.destinations?.country || "Other Locations";
      if (!acc[country]) {
        acc[country] = [];
      }
      acc[country].push(moment);
      return acc;
    }, {} as Record<string, Moment[]>);
  }, [moments]);

  // Sort countries? Maybe put "Other Locations" last.
  const sortedCountries = useMemo(() => {
    return Object.keys(momentsByCountry || {}).sort((a, b) => {
      if (a === "Other Locations") return 1;
      if (b === "Other Locations") return -1;
      return a.localeCompare(b);
    });
  }, [momentsByCountry]);

  // ... (handlers remain the same) ...
  const handleToggleStatus = async (id: string, currentStatus: string | null) => {
    try {
      const newStatus = currentStatus === "published" ? "draft" : "published";
      const { error } = await supabase
        .from("moments")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      toast({
        title: newStatus === "published" ? "Published" : "Unpublished",
        description: "Moment status updated successfully.",
      });
      refetch();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
    }
  };

  const handleDelete = async (id: string, storagePath: string | null) => {
    try {
      const { error } = await supabase.from("moments").delete().eq("id", id);
      if (error) throw error;
      if (storagePath) {
        const { error: storageError } = await supabase.storage.from("photos").remove([storagePath]);
        if (storageError) console.error("Storage delete error:", storageError);
      }
      toast({ title: "Deleted", description: "Moment deleted successfully." });
      refetch();
    } catch (error) {
      console.error("Error deleting moment:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete moment." });
    }
  };

  // Lightbox State
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const isLightboxOpen = lightboxIndex >= 0;

  return (
    <div className="min-h-screen bg-[#f7f7f7] pb-20">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 md:pt-32">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[250px] gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="w-full h-full rounded-2xl" />
            ))}
          </div>
        ) : moments && moments.length > 0 ? (
          <div className="space-y-12">
            <MasonryGrid>
              {moments.map((moment, index) => (
                <div key={moment.id} className="masonry-item w-1/2 md:w-1/3 lg:w-1/4 p-2">
                  <PhotoCard
                    id={moment.id}
                    storagePath={moment.storage_path || ""}
                    thumbnailPath={moment.thumbnail_path}
                    title={moment.title || undefined}
                    description={moment.description || moment.caption || undefined}
                    latitude={moment.latitude || undefined}
                    longitude={moment.longitude || undefined}
                    takenAt={moment.taken_at || undefined}
                    mimeType={moment.mime_type || moment.media_type || undefined}
                    className="w-full"
                    destinationName={moment.destinations?.name || moment.location_name || undefined}
                    country={moment.destinations?.country}
                    status={moment.status}
                    onDelete={() => handleDelete(moment.id, moment.storage_path)}
                    onStatusToggle={() => handleToggleStatus(moment.id, moment.status)}
                    onClick={() => setLightboxIndex(index)}
                  />
                </div>
              ))}
            </MasonryGrid>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-white/50 mt-12 mx-4">
            <ImageIcon className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">No moments yet</h3>
            <p className="text-sm text-gray-400 mt-2">Upload some photos to see them here.</p>
          </div>
        )}
      </main>

      <Lightbox
        isOpen={isLightboxOpen}
        onClose={() => setLightboxIndex(-1)}
        moments={moments || []}
        initialIndex={lightboxIndex}
      />
    </div>
  );
};

export default Gallery;

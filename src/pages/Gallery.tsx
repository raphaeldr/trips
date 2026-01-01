
import { useMemo, useState, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PhotoCard } from "@/components/gallery/PhotoCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MasonryGrid } from "@/components/ui/MasonryGrid";
import { Lightbox } from "@/components/gallery/Lightbox";
import { ContextCard } from "@/components/gallery/ContextCard";
import { useInView } from "react-intersection-observer";

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

const Gallery = () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["moments_public"],
    queryFn: async ({ pageParam = 0 }) => {
      // 1. Fetch Group Manifest (3 locations per page)
      // Note: Casting to any to avoid type errors until types are regenerated
      const { data: rawGroups, error: rpcError } = await supabase.rpc('get_gallery_manifest', {
        limit_val: 3,
        offset_val: pageParam * 3
      } as any);

      if (rpcError) throw rpcError;

      const groups = rawGroups as any[] || [];

      if (!groups || groups.length === 0) {
        return { moments: [], noMoreGroups: true };
      }

      // 2. Build Filter for Moments
      const destinationIds = groups
        .map((g: any) => g.destination_id)
        .filter(Boolean);

      const locationNames = groups
        .filter((g: any) => !g.destination_id && g.location_name)
        .map((g: any) => g.location_name);

      let query = supabase
        .from("moments")
        .select(`
          id,
          storage_path,
          thumbnail_path,
          title,
          description,
          caption,
          latitude,
          longitude,
          taken_at,
          mime_type,
          media_type,
          status,
          location_name,
          country,
          destinations ( name, country, id )
        `)
        .in("media_type", ["photo", "video", "audio", "text"]);

      // Construct OR filter
      const conditions = [];
      if (destinationIds.length > 0) {
        conditions.push(`destination_id.in.(${destinationIds.join(',')})`);
      }
      if (locationNames.length > 0) {
        // Simple sanitization: just double quote
        const safeNames = locationNames.map((n: string) => `"${n.replace(/"/g, '')}"`).join(',');
        conditions.push(`location_name.in.(${safeNames})`);
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(','));
      } else {
        return { moments: [], noMoreGroups: true };
      }

      const { data: moments, error } = await query.order("taken_at", { ascending: false });

      if (error) throw error;

      // Return object structure to pass 'noMoreGroups' signal
      return {
        moments: moments as unknown as Moment[],
        noMoreGroups: groups.length < 3
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage: any, allPages) => {
      return lastPage.noMoreGroups ? undefined : allPages.length;
    },
  });

  const { toast } = useToast();
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // Flatten the pages into a single array of moments
  const moments = useMemo(() => {
    return data?.pages.flatMap((page: any) => page.moments) || [];
  }, [data]);

  // Transform moments into groups and a flat list for lightbox
  const { sortedGroups, allMoments } = useMemo(() => {
    if (moments.length === 0) return { sortedGroups: [], allMoments: [] };

    // 1. Group by unique location
    const groups: Record<string, {
      country: string;
      place: string;
      moments: Moment[];
      maxTakenAt: string;
    }> = {};

    moments.forEach((moment: any) => { // Type cast to any to access new country field safely if interface outdated
      // Priority: Organic Moment Location -> Destination Plan
      const country = moment.country || moment.destinations?.country || "Other Locations";
      const place = moment.location_name || moment.destinations?.name || "";
      const key = `${country}-${place}`;

      if (!groups[key]) {
        groups[key] = {
          country,
          place,
          moments: [],
          maxTakenAt: moment.taken_at || "",
        };
      }

      groups[key].moments.push(moment);

      // Update maxTakenAt if this moment is newer
      if (moment.taken_at && moment.taken_at > groups[key].maxTakenAt) {
        groups[key].maxTakenAt = moment.taken_at;
      }
    });

    // 2. Sort groups by their most recent moment (newest first)
    const sortedGroups = Object.values(groups).sort((a, b) => {
      return b.maxTakenAt.localeCompare(a.maxTakenAt);
    });

    // 3. Flatten all moments for lightbox navigation
    const allMoments = sortedGroups.flatMap(g => g.moments);

    return { sortedGroups, allMoments };
  }, [moments]);

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

  // Calculate global indices map for fast lookup
  const momentGlobalIndices = useMemo(() => {
    const indices: Record<string, number> = {};
    allMoments.forEach((m, i) => {
      indices[m.id] = i;
    });
    return indices;
  }, [allMoments]);

  return (
    <div className="min-h-screen bg-[#f7f7f7] pb-20">


      <main className="container mx-auto px-4 pt-24 md:pt-32">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 auto-rows-[250px] gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="w-full h-full rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-red-500 mb-4">Failed to load moments.</p>
            <p className="text-sm text-gray-400 mb-4">{(error as Error)?.message}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : sortedGroups.length > 0 ? (
          <div className="space-y-16">
            {sortedGroups.map((group) => (
              <div key={`${group.country}-${group.place}`}>
                <MasonryGrid>
                  {/* Context Card - Always first child */}
                  <div className="masonry-item w-1/2 md:w-1/3 lg:w-1/4 p-2">
                    <ContextCard country={group.country} place={group.place} />
                  </div>

                  {/* Group Moments */}
                  {group.moments.map((moment: any) => { // Type cast for new fields
                    const globalIndex = momentGlobalIndices[moment.id];
                    return (
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
                          destinationName={moment.location_name || moment.destinations?.name || undefined} // Prioritize organic
                          country={moment.country || moment.destinations?.country} // Prioritize organic
                          status={moment.status}
                          onDelete={() => handleDelete(moment.id, moment.storage_path)}
                          onStatusToggle={() => handleToggleStatus(moment.id, moment.status)}
                          onClick={() => setLightboxIndex(globalIndex)}
                        />
                      </div>
                    );
                  })}
                </MasonryGrid>
              </div>
            ))}

            {/* Infinite Scroll Sentinel */}
            <div ref={ref} className="w-full py-8 flex justify-center">
              {isFetchingNextPage && <ImageIcon className="animate-spin w-8 h-8 text-gray-400" />}
            </div>

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
        moments={allMoments}
        initialIndex={lightboxIndex}
      />
    </div>
  );
};

export default Gallery;

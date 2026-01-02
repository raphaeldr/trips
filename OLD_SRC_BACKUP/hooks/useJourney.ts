
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SegmentWithPlaces } from "@/types";

export const useJourney = () => {
    const { data: segments, isLoading } = useQuery({
        queryKey: ["journey_segments"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("segments")
                .select(`*, places (*, media (*))`)
                .order("start_date", { ascending: true });

            if (error) throw error;

            // Sort media by date
            const typedData = data as unknown as SegmentWithPlaces[];
            return typedData.map(seg => ({
                ...seg,
                places: seg.places.map(place => ({
                    ...place,
                    media: place.media.sort((a, b) => new Date(a.captured_at || a.created_at).getTime() - new Date(b.captured_at || b.created_at).getTime())
                }))
            }));
        },
    });

    const currentSegment = segments?.find(s => s.status === 'ACTIVE');
    return { segments, currentSegment, isLoading };
};
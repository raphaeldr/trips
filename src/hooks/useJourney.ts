import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Segment } from "@/types";

export const useJourney = () => {
    const { data: segments, isLoading, error } = useQuery({
        queryKey: ["journey_segments"],
        queryFn: async () => {
            // Fetching 'segments'
            // Nesting places and moments (media)
            const { data, error } = await supabase
                .from("segments" as any) // Type mismatch workaround until regen
                .select(`
                    *,
                    places (
                        *,
                        media (*)
                    )
                `)
                .order("arrival_date", { ascending: true });

            if (error) throw error;
            return data as Segment[];
        },
    });

    return {
        segments,
        loading: isLoading,
        error
    };
};

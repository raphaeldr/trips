import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { Destination } from "@/types";

export const useJourney = () => {
    // 1. Centralized Data Fetching
    const { data: destinations, isLoading } = useQuery({
        queryKey: ["destinations"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("destinations")
                .select("*")
                .order("arrival_date", { ascending: true });
            if (error) throw error;
            return data as Destination[];
        },
    });

    // 2. Centralized "Where are we?" Logic
    const now = new Date();

    // Find the destination that is marked 'is_current' OR falls within dates
    const currentDestination = destinations?.find((d) => d.is_current)
        || destinations?.find((d) => {
            const start = new Date(d.arrival_date);
            const end = d.departure_date ? new Date(d.departure_date) : new Date(3000, 0, 1);
            return now >= start && now <= end;
        })
        || destinations?.[0]; // Fallback to first if nothing active

    // 3. Centralized Stats
    const totalStops = destinations?.length || 0;

    const tripStartDate = destinations?.[0]?.arrival_date
        ? new Date(destinations[0].arrival_date)
        : new Date();

    const daysOnRoad = differenceInDays(now, tripStartDate) + 1; // +1 to count today

    return {
        destinations,
        currentDestination,
        isLoading,
        stats: {
            totalStops,
            daysOnRoad: daysOnRoad > 0 ? daysOnRoad : 0, // Avoid negative days
        }
    };
};

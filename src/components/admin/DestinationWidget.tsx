import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DestinationForm } from "./DestinationForm";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, ArrowRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "react-router-dom";

export const DestinationWidget = ({ onUpdate }: { onUpdate?: () => void }) => {
    const [isAdding, setIsAdding] = useState(false);

    const { data: destinations } = useQuery({
        queryKey: ["destinationsWidget"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("destinations")
                .select("*")
                .order("arrival_date", { ascending: true });
            if (error) throw error;
            return data;
        },
    });

    // Determine active destination logic (simple date check)
    const now = new Date();
    const activeDestId = destinations?.find(d => {
        const start = new Date(d.arrival_date);
        const end = d.departure_date ? new Date(d.departure_date) : new Date(8640000000000000);
        return now >= start && now <= end;
    })?.id;

    // If no active (between trips?), maybe show the next one as "Upcoming"?
    // Or just highlight the last one visited?
    // User said: "Active Item: Highlight 'Onomichi' with a green dot."

    // Let's scroll or list them. Ideally Limit to ~5 items centered around now?
    // For now, just list all or top few upcoming/recent.
    // "Show the current active trip path... mini version".
    // I'll show a slice of destinations: Previous, Current, Next, +2 Next.

    const renderList = () => {
        if (!destinations) return <div className="text-sm text-neutral-400 p-4">Loading locations...</div>;
        if (destinations.length === 0) return <div className="text-sm text-neutral-400 p-4">No locations yet.</div>;

        // Filter/Sort logic could go here. For now assume list is chronological.

        return (
            <div className="space-y-0 relative pl-4 border-l-2 border-neutral-100 ml-4 py-2">
                {destinations.map((dest) => {
                    const isActive = dest.id === activeDestId;
                    const isPast = new Date(dest.departure_date || dest.arrival_date) < now && !isActive;

                    return (
                        <div key={dest.id} className="relative pl-6 py-3 group">
                            {/* Dot Indicator */}
                            <div
                                className={`absolute left-[-5px] top-[18px] w-2.5 h-2.5 rounded-full border-2 
                  ${isActive
                                        ? "bg-green-500 border-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.2)]"
                                        : isPast
                                            ? "bg-neutral-200 border-neutral-200"
                                            : "bg-white border-neutral-300"
                                    } 
                  transition-all`}
                            />

                            <div className="flex flex-col">
                                <span className={`text-sm font-medium leading-none ${isActive ? "text-neutral-900" : "text-neutral-500"}`}>
                                    {dest.name}
                                </span>
                                <span className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wider font-medium">
                                    {dest.country} • {format(new Date(dest.arrival_date), "MMM d")}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <Card className="overflow-hidden bg-white/50 backdrop-blur-sm border-neutral-200/60">
            <CardHeader className="flex flex-row items-center justify-between py-4 px-5 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-neutral-500" />
                    <CardTitle className="text-sm font-semibold text-neutral-900">My Locations</CardTitle>
                </div>
                {!isAdding && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-neutral-100"
                        onClick={() => setIsAdding(true)}
                    >
                        <Plus className="w-4 h-4 text-neutral-600" />
                    </Button>
                )}
            </CardHeader>

            <CardContent className="p-0">
                {isAdding ? (
                    <div className="p-4 bg-muted/10 animate-in slide-in-from-right-4 duration-300">
                        <DestinationForm
                            onSuccess={() => {
                                setIsAdding(false);
                                if (onUpdate) onUpdate();
                            }}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 w-full text-neutral-500 hover:text-neutral-900"
                            onClick={() => setIsAdding(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                        {renderList()}
                    </div>
                )}
            </CardContent>

            {!isAdding && (
                <CardFooter className="py-3 px-5 bg-neutral-50/50 border-t border-neutral-100">
                    <Link to="/map" className="text-xs font-medium text-neutral-500 hover:text-neutral-900 flex items-center gap-1 transition-colors group">
                        Manage path <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </CardFooter>
            )}
        </Card>
    );
};

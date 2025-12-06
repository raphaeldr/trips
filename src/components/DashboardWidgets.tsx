import { MapPin, Globe, CalendarDays, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";

export const TripProgressWidget = ({ destinations }: { destinations: any[] }) => {
  // Calculate stats
  const uniqueCountries = new Set(destinations?.map((d) => d.country)).size;

  const startDate = destinations?.[destinations.length - 1]?.arrival_date
    ? new Date(destinations[destinations.length - 1].arrival_date)
    : new Date();

  const daysOnRoad = differenceInDays(new Date(), startDate);

  return (
    <Card className="h-full bg-card border-border flex flex-col relative overflow-hidden group shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Header Stats Section */}
      <div className="p-5 pb-2 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-3 h-3 text-primary" />
            Itinerary
          </div>
          <Badge variant="outline" className="text-[10px] font-medium bg-background">
            Live Updates
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-background/80 p-3 rounded-xl border border-border/50 flex flex-col items-center justify-center text-center">
            <Globe className="w-4 h-4 text-primary mb-1 opacity-70" />
            <span className="text-xl font-bold font-display leading-none">{uniqueCountries}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">Countries</span>
          </div>
          <div className="bg-background/80 p-3 rounded-xl border border-border/50 flex flex-col items-center justify-center text-center">
            <CalendarDays className="w-4 h-4 text-primary mb-1 opacity-70" />
            <span className="text-xl font-bold font-display leading-none">{daysOnRoad}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">Days</span>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="flex-1 p-0 flex flex-col min-h-0 relative">
        <ScrollArea className="flex-1 px-5 py-4 bento-scroll h-full">
          <div className="space-y-0 relative z-0 pb-2">
            {/* Dashed Connector Line */}
            <div className="absolute left-[19px] top-3 bottom-3 w-px border-l-2 border-dashed border-border/60" />

            {destinations?.map((dest, i) => (
              <div
                key={dest.id}
                className="relative pl-10 py-3 group/item transition-all hover:-translate-x-1 duration-300"
              >
                {/* Timeline Dot */}
                <div
                  className={`absolute left-[13.5px] top-[18px] w-3 h-3 rounded-full border-2 border-background z-10 transition-all duration-300 
                    ${
                      i === 0
                        ? "bg-green-500 scale-110 shadow-[0_0_0_4px_rgba(34,197,94,0.2)]"
                        : "bg-muted-foreground/30 group-hover/item:bg-primary"
                    }`}
                />

                {/* Content */}
                <div
                  className={`flex flex-col p-3 rounded-lg border transition-all ${i === 0 ? "bg-primary/5 border-primary/20" : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border/50"}`}
                >
                  <div className="flex justify-between items-start">
                    <span
                      className={`text-sm font-bold leading-none ${i === 0 ? "text-primary" : "text-foreground group-hover/item:text-foreground"} transition-colors`}
                    >
                      {dest.name}
                    </span>
                    {i === 0 && (
                      <Badge className="text-[9px] px-1.5 h-4 bg-green-500 hover:bg-green-600 border-none">NOW</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <Flag className="w-3 h-3" /> {dest.country}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">•</span>
                    <span className="text-[10px] text-muted-foreground/70">
                      {format(new Date(dest.arrival_date), "MMM d")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Bottom Fade */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-card to-transparent pointer-events-none z-10" />
      </div>
    </Card>
  );
};

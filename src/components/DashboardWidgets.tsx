import { Plane } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AirportBoard } from "@/components/ui/AirportText";
import { format } from "date-fns";

export const TripProgressWidget = ({ destinations }: { destinations: any[] }) => {
  // Sort destinations by date for the board (ascending) if not already
  const flightList = [...(destinations || [])].sort(
    (a, b) => new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime(),
  );

  return (
    <Card className="h-full bg-card border-border flex flex-col relative overflow-hidden group shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="p-5 flex items-center justify-between shrink-0 bg-card z-20">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
          <Plane className="w-3 h-3 text-primary" />
          Confirmed Flights
        </div>
        <Badge variant="secondary" className="text-xs font-normal">
          {flightList.length} flights
        </Badge>
      </div>

      <ScrollArea className="flex-1 -mx-0 px-0 bento-scroll h-full bg-[#111]">
        <div className="flex flex-col min-h-full py-2">
          {/* Header Row looking like a terminal screen header (optional, but adds realism) */}
          <div className="grid grid-cols-[60px_1fr] gap-4 px-5 py-2 border-b border-white/10 text-[10px] font-mono text-primary/70 uppercase tracking-widest bg-[#111]">
            <span>Date</span>
            <span>Destination</span>
          </div>

          {flightList.map((dest, i) => (
            <div
              key={dest.id}
              className="group/row grid grid-cols-[60px_1fr] gap-4 px-5 py-3 items-center border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              {/* Date Column */}
              <div className="text-xs font-mono text-yellow-500/90 font-medium tracking-tight">
                {format(new Date(dest.arrival_date), "dd/MM")}
              </div>

              {/* Destination Board */}
              <div className="flex flex-col min-w-0">
                <AirportBoard text={dest.name} className="font-bold tracking-widest text-[#f0f0f0]" />
                <span className="text-[10px] text-zinc-500 font-mono mt-1 uppercase tracking-wider truncate">
                  {dest.country}
                </span>
              </div>
            </div>
          ))}

          {/* Empty rows filler to look like a board */}
          {Array.from({ length: Math.max(0, 5 - flightList.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="grid grid-cols-[60px_1fr] gap-4 px-5 py-3 items-center border-b border-white/5 opacity-30"
            >
              <div className="h-4 w-8 bg-white/10 rounded animate-pulse" />
              <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
    </Card>
  );
};

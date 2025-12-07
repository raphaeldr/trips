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

  const ROWS_TO_DISPLAY = 8;
  const DESTINATION_CHARS = 20; // Increased to ensure it fills to the right

  // Generate rows including empty ones to fill the board to the bottom
  const displayRows = Array.from({ length: Math.max(flightList.length, ROWS_TO_DISPLAY) }).map((_, i) => {
    return flightList[i] || null;
  });

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
        <div className="flex flex-col min-h-full py-2 px-2">
          {/* Header Row - Aligned precisely with columns */}
          <div className="flex gap-3 px-2 py-2 border-b border-white/10 text-[10px] font-mono text-yellow-500/70 uppercase tracking-widest bg-[#111] mb-1">
            <span className="w-[calc(5*1.8ch+20px)] pl-1">Date</span>
            <span className="w-[1.8ch]"></span> {/* Spacer alignment */}
            <span className="pl-1">Destination</span>
          </div>

          {displayRows.map((dest, i) => (
            <div
              key={dest ? dest.id : `empty-${i}`}
              className="flex items-center gap-3 px-2 py-1.5 border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              {/* Date Column: dd/MM (5 chars) */}
              <AirportBoard
                text={dest ? format(new Date(dest.arrival_date), "dd/MM") : "     "}
                className="font-bold tracking-widest text-white"
              />

              {/* Empty Block Separator (Space instead of dash) */}
              <div className="opacity-50">
                <AirportBoard text=" " className="font-bold text-white" />
              </div>

              {/* Destination - Filled with empty blocks to the right */}
              <div className="flex-1 overflow-hidden flex">
                <AirportBoard
                  text={dest ? dest.name.toUpperCase() : ""}
                  padLength={DESTINATION_CHARS}
                  className="font-bold tracking-widest text-white"
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Bottom Fade */}
      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />
    </Card>
  );
};

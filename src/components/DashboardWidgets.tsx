import { MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export const TripProgressWidget = ({ destinations }: { destinations: any[] }) => {
  return (
    <Card className="h-full bg-card border-border flex flex-col relative overflow-hidden group shadow-sm hover:shadow-lg transition-all duration-300">

      {/* Bottom Section: Timeline History */}
      <div className="flex-1 p-5 md:p-6 flex flex-col min-h-0 bg-card relative">
        <div className="flex items-center justify-between mb-3 md:mb-4 z-10 shrink-0">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-3 h-3 text-primary" />
            Full History
          </div>
          <Badge variant="secondary" className="text-xs font-normal">
            {destinations?.length || 0} Stops
          </Badge>
        </div>


        <ScrollArea className="flex-1 -mx-4 px-4 bento-scroll h-full">
          <div className="space-y-0 relative z-0 pb-2">
            {/* Vertical Line */}
            <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

            {destinations?.map((dest, i) => (
              <div key={dest.id} className="relative pl-8 py-2.5 md:py-3 group/item cursor-default">
                <div
                  className={`absolute left-4 top-[14px] md:top-[18px] w-1.5 h-1.5 rounded-full ring-4 ring-card ${i === 0 ? "bg-primary scale-125" : "bg-muted-foreground/30 group-hover/item:bg-primary/50"} transition-all duration-300 z-10`}
                />
                <div className="flex flex-col">
                  <span
                    className={`text-sm font-medium leading-none ${i === 0 ? "text-foreground" : "text-muted-foreground group-hover/item:text-foreground"} transition-colors`}
                  >
                    {dest.name}
                  </span>
                  <span className="text-xs text-muted-foreground/60 font-medium mt-1">{dest.country}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Bottom Fade for Scroll */}
        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-card to-transparent pointer-events-none z-10" />
      </div>
    </Card>
  );
};

import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

interface Destination {
  id: string;
  name: string;
  country: string;
  is_current: boolean | null;
  arrival_date: string;
}

interface JourneyRibbonProps {
  destinations: Destination[] | undefined;
}

export const JourneyRibbon = ({ destinations }: JourneyRibbonProps) => {
  if (!destinations?.length) return null;

  const sortedDestinations = [...destinations].sort(
    (a, b) => new Date(a.arrival_date).getTime() - new Date(b.arrival_date).getTime()
  );

  return (
    <section className="py-6 overflow-hidden">
      <div className="px-4 mb-4">
        <h2 className="font-handwritten text-2xl text-foreground">Our journey so far</h2>
      </div>

      <Link to="/map" className="block">
        <div className="relative px-4">
          {/* The ribbon/path */}
          <div className="relative flex items-center gap-1 overflow-x-auto scrollbar-hide py-4">
            {sortedDestinations.map((dest, index) => {
              const isCurrent = dest.is_current;
              const isLast = index === sortedDestinations.length - 1;

              return (
                <div key={dest.id} className="flex items-center flex-shrink-0">
                  {/* Destination dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`
                        relative w-12 h-12 rounded-full flex items-center justify-center
                        transition-all duration-300
                        ${isCurrent
                          ? "bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20"
                          : "bg-secondary text-secondary-foreground"
                        }
                      `}
                    >
                      <MapPin className="w-5 h-5" />
                      {isCurrent && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full animate-pulse" />
                      )}
                    </div>
                    <span className={`
                      mt-2 text-xs font-medium text-center whitespace-nowrap
                      ${isCurrent ? "text-foreground" : "text-muted-foreground"}
                    `}>
                      {dest.name}
                    </span>
                  </div>

                  {/* Connecting line */}
                  {!isLast && (
                    <div className="w-8 h-0.5 bg-border mx-1 flex-shrink-0">
                      <div className="h-full bg-primary/40 origin-left animate-pulse" style={{ animationDelay: `${index * 0.2}s` }} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Future indicator */}
            <div className="flex items-center flex-shrink-0 ml-2">
              <div className="w-8 h-0.5 bg-border/50 border-dashed" />
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <span className="text-muted-foreground/50 text-xl">?</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
};

import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface Destination {
  id: string;
  name: string;
  country: string;
  is_current: boolean | null;
}

interface MiniTimelineProps {
  destinations: Destination[] | undefined;
}

export const MiniTimeline = ({ destinations }: MiniTimelineProps) => {
  const recentDestinations = destinations?.slice(0, 5) || [];
  const currentIndex = recentDestinations.findIndex((d) => d.is_current);

  if (!recentDestinations.length) {
    return null;
  }

  return (
    <div className="mx-5 bg-card border border-border rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Journey Timeline
        </h3>
        <Link
          to="/map"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Full map
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Timeline dots */}
      <div className="relative">
        {/* Connection line */}
        <div className="absolute top-3 left-3 right-3 h-0.5 bg-border" />
        <div
          className="absolute top-3 left-3 h-0.5 bg-primary transition-all"
          style={{
            width: `${
              currentIndex >= 0
                ? (currentIndex / (recentDestinations.length - 1)) * 100
                : 0
            }%`,
          }}
        />

        {/* Dots */}
        <div className="relative flex justify-between">
          {recentDestinations.map((dest, index) => {
            const isCurrent = dest.is_current;
            const isPast = currentIndex >= 0 && index < currentIndex;

            return (
              <div key={dest.id} className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isCurrent
                      ? "bg-primary border-primary scale-110"
                      : isPast
                      ? "bg-primary/20 border-primary"
                      : "bg-card border-border"
                  }`}
                >
                  {isCurrent && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-card opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-card"></span>
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-2 font-medium text-center max-w-[60px] truncate ${
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {dest.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

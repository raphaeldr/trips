import { format } from "date-fns";
import { Calendar, MapPin, Cloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VideoThumbnail } from "@/components/VideoThumbnail";

interface HeroLocationProps {
  destination: {
    id: string;
    name: string;
    country: string;
    continent: string;
    arrival_date: string;
    latitude: number;
    longitude: number;
  } | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  isVideo: boolean;
  dayNumber?: number;
  totalDays?: number;
}

export const HeroLocation = ({
  destination,
  mediaUrl,
  thumbnailUrl,
  isVideo,
  dayNumber = 1,
  totalDays = 180,
}: HeroLocationProps) => {
  return (
    <div className="relative w-full aspect-[4/5] md:aspect-[16/9] overflow-hidden rounded-none md:rounded-3xl">
      {/* Background Media */}
      <div className="absolute inset-0">
        {mediaUrl ? (
          isVideo ? (
            <>
              <img
                src={thumbnailUrl || mediaUrl}
                alt={destination?.name || "Current Location"}
                className="w-full h-full object-cover md:hidden"
                loading="eager"
              />
              <video
                src={mediaUrl}
                poster={thumbnailUrl || undefined}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover hidden md:block"
              />
            </>
          ) : (
            <img
              src={mediaUrl}
              alt={destination?.name || "Current Location"}
              className="w-full h-full object-cover"
              loading="eager"
            />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30" />
        )}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8">
        {/* Top badge */}
        <div className="absolute top-5 left-5 md:top-8 md:left-8">
          <div className="flex items-center gap-2 bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold text-foreground border border-border">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Where we are now
          </div>
        </div>

        {/* Day counter - top right */}
        <div className="absolute top-5 right-5 md:top-8 md:right-8">
          <div className="bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-foreground border border-border">
            Day {dayNumber}/{totalDays}
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-3">
          <h1 className="text-4xl md:text-6xl font-display font-bold text-card leading-none tracking-tight">
            {destination?.name || "Loading..."}
          </h1>
          <p className="text-lg md:text-xl text-card/80 font-medium">
            {destination?.country}
            {destination?.continent && `, ${destination.continent}`}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-4 text-sm text-card/70 pt-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                Since{" "}
                {destination?.arrival_date
                  ? format(new Date(destination.arrival_date), "d MMMM")
                  : "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cloud className="w-4 h-4" />
              <span>24°C Sunny</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

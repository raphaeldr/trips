import { MapPin, Sun, Calendar } from "lucide-react";
import { format } from "date-fns";
import { VideoThumbnail } from "@/components/VideoThumbnail";

interface ScrapbookHeroProps {
  destination: {
    name: string;
    country: string;
    continent: string;
    arrival_date: string;
  } | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  isVideo: boolean;
  dayNumber: number;
  totalDays: number;
}

export const ScrapbookHero = ({
  destination,
  mediaUrl,
  thumbnailUrl,
  isVideo,
  dayNumber,
  totalDays,
}: ScrapbookHeroProps) => {
  return (
    <div className="relative mx-4 mt-4">
      {/* Main polaroid card */}
      <div className="relative bg-card rounded-3xl overflow-hidden shadow-elegant">
        {/* The photo */}
        <div className="relative aspect-[4/5] overflow-hidden">
          {mediaUrl ? (
            isVideo ? (
              <VideoThumbnail
                src={mediaUrl}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={thumbnailUrl || mediaUrl}
                alt={destination?.name || "Current location"}
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <div className="w-full h-full bg-gradient-sunset" />
          )}

          {/* Warm gradient overlay */}
          <div className="absolute inset-0 gradient-warm" />

          {/* Day counter sticker - top right */}
          <div className="absolute top-4 right-4">
            <div className="sticker text-foreground font-handwritten text-lg">
              Day {dayNumber}
            </div>
          </div>

          {/* Content overlay - bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
            {/* Location badge */}
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="w-4 h-4" />
              <span className="font-handwritten text-xl">
                {destination?.continent || "Exploring"}
              </span>
            </div>

            {/* Main title */}
            <h1 className="text-3xl font-editorial font-bold text-foreground leading-tight">
              {destination?.name || "Your Adventure"}
              <span className="block text-xl font-normal text-muted-foreground">
                {destination?.country}
              </span>
            </h1>

            {/* Meta info row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-accent" />
                <span>24°C</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>
                  {destination?.arrival_date
                    ? format(new Date(destination.arrival_date), "d MMMM")
                    : "Today"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent/30 blob animate-float" style={{ animationDelay: "0s" }} />
      <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-primary/20 blob animate-float" style={{ animationDelay: "2s" }} />
    </div>
  );
};

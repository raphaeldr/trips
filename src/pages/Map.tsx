import { Navigation } from "@/components/Navigation";
import { MapView } from "@/components/MapView";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import { format } from "date-fns";

interface Destination {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  arrival_date: string;
  departure_date: string | null;
  description: string | null;
  is_current: boolean;
}

const Map = () => {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const animationRef = useRef<number | null>(null);

  // Fetch destinations for timeline
  useEffect(() => {
    const fetchDestinations = async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("arrival_date", { ascending: true });

      if (data && !error) {
        setDestinations(data);
        
        // Calculate total days from first to last destination
        if (data.length > 0) {
          const firstDate = new Date(data[0].arrival_date);
          const lastDate = new Date(data[data.length - 1].arrival_date);
          const days = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
          setTotalDays(days);
        }
      }
      setLoading(false);
    };

    fetchDestinations();
  }, []);

  // Timeline animation
  useEffect(() => {
    if (!isPlaying) return;

    animationRef.current = window.setInterval(() => {
      setCurrentDay((prev) => {
        if (prev >= totalDays) {
          setIsPlaying(false);
          return totalDays;
        }
        return prev + 1;
      });
    }, 100);

    return () => {
      if (animationRef.current) {
        clearInterval(animationRef.current);
      }
    };
  }, [isPlaying, totalDays]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentDay(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 container mx-auto px-6 py-12 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 container mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">
            Journey Map
          </h1>
          <p className="text-muted-foreground">
            {destinations.length} destinations across {totalDays} days of adventure
          </p>
        </div>

        <div className="relative rounded-2xl shadow-card overflow-hidden">
          <MapView className="h-[600px] w-full" />
          
          {/* Timeline Controls */}
          {totalDays > 0 && (
            <div className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm p-6 border-t border-border">
              <div className="flex items-center gap-4">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handlePlayPause}
                  className="shrink-0"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleReset}
                  className="shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>

                <div className="flex-1">
                  <Slider
                    value={[currentDay]}
                    onValueChange={(value) => setCurrentDay(value[0])}
                    max={totalDays}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="text-sm font-medium text-foreground shrink-0 min-w-[100px] text-right">
                  Day {currentDay} / {totalDays}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Destinations List */}
        {destinations.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-display font-bold text-foreground mb-6">
              All Destinations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {destinations.map((destination) => (
                <div
                  key={destination.id}
                  className="bg-card rounded-xl p-6 shadow-card hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-foreground">
                      {destination.name}
                    </h3>
                    {destination.is_current && (
                      <span className="px-2 py-1 bg-destructive text-white text-xs font-semibold rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {destination.country}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(destination.arrival_date), "MMM d, yyyy")}
                    {destination.departure_date && 
                      ` - ${format(new Date(destination.departure_date), "MMM d, yyyy")}`}
                  </p>
                  {destination.description && (
                    <p className="text-sm text-muted-foreground mt-3">
                      {destination.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {destinations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No destinations added yet. Add your first destination from the admin panel!
            </p>
            <Button onClick={() => window.location.href = "/admin"}>
              Go to Admin Panel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Map;

import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, MapPin, ArrowRight, Calendar } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns"; // Ensure addDays is imported

const MAPBOX_TOKEN = "pk.eyJ1IjoicmFwaGFlbGRyIiwiYSI6ImNtaWFjbTlocDByOGsya3M0dHl6MXFqbjAifQ.DFYSs0hNaDHZaRvX3rU4WA";

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
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const animationRef = useRef<number>();

  // Fetch destinations
  const { data: destinations, isLoading } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("*").order("arrival_date", {
        ascending: true,
      });
      if (error) throw error;
      return data as Destination[];
    },
  });

  // Calculate the Date string for the current slider position
  const currentDateDisplay = useMemo(() => {
    if (!destinations?.length) return "";
    const start = new Date(destinations[0].arrival_date);
    // Using native JS if date-fns addDays isn't available, otherwise use addDays(start, currentDay)
    const current = new Date(start);
    current.setDate(start.getDate() + currentDay);
    return format(current, "d MMM yyyy");
  }, [currentDay, destinations]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !destinations?.length) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard",
      zoom: 2, // Initial fallback
      center: [0, 20],
      pitch: 45,
    });
    mapRef.current = map;

    // UX IMPROVEMENT: Auto-fit map to the bounds of the trip
    const bounds = new mapboxgl.LngLatBounds();
    destinations.forEach((d) => bounds.extend([d.longitude, d.latitude]));

    map.on("load", () => {
      map.fitBounds(bounds, { padding: 100, duration: 2000 });
    });

    // Globe atmosphere
    map.on("style.load", () => {
      map.setFog({
        color: "rgb(255,255,255)",
        "high-color": "rgb(200,200,225)",
        "horizon-blend": 0.2,
      });

      // Add route line source
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: destinations.map((d) => [d.longitude, d.latitude]),
          },
        },
      });

      // Add route line layer (teal)
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#0f766e",
          "line-width": 3,
          "line-dasharray": [2, 2],
        },
      });

      // Animate the dash
      let dashArraySequence = [
        [0, 4, 3],
        [0.5, 4, 2.5],
        [1, 4, 2],
        [1.5, 4, 1.5],
        [2, 4, 1],
        [2.5, 4, 0.5],
        [3, 4, 0],
        [0, 0.5, 3, 3.5],
        [0, 1, 3, 3],
        [0, 1.5, 3, 2.5],
        [0, 2, 3, 2],
        [0, 2.5, 3, 1.5],
        [0, 3, 3, 1],
        [0, 3.5, 3, 0.5],
      ];
      let step = 0;
      function animateDashArray(timestamp: number) {
        const newStep = parseInt(((timestamp / 50) % dashArraySequence.length).toString());
        if (newStep !== step) {
          map.setPaintProperty("route-line", "line-dasharray", dashArraySequence[step]);
          step = newStep;
        }
        requestAnimationFrame(animateDashArray);
      }
      animateDashArray(0);
    });

    // Navigation controls
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    map.scrollZoom.disable();

    // Add markers
    destinations.forEach((dest) => {
      const el = document.createElement("div");
      el.className = "marker-pin";
      el.style.backgroundColor = dest.is_current ? "#ef4444" : "#0f766e";
      el.style.width = "24px";
      el.style.height = "24px";
      el.style.borderRadius = "50% 50% 50% 0";
      el.style.transform = "rotate(-45deg)";
      el.style.border = "2px solid white";
      el.style.cursor = "pointer";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      el.style.transition = "transform 0.2s";

      // UX IMPROVEMENT: Click marker to scroll to card? (Optional)

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px; color: #0f766e;">${dest.name}</h3>
            <p style="font-size: 12px; color: #666;">${dest.country}</p>
          </div>
        `);
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([dest.longitude, dest.latitude])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    });

    // Calculate total days
    if (destinations.length > 0) {
      const firstDate = new Date(destinations[0].arrival_date);
      const lastDest = destinations[destinations.length - 1];
      const lastDate = lastDest.departure_date ? new Date(lastDest.departure_date) : new Date();
      const days = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      setTotalDays(days);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      markersRef.current = [];
      map.remove();
    };
  }, [destinations]);

  // Timeline animation loop
  useEffect(() => {
    if (!isPlaying || !destinations?.length) return;
    const animate = () => {
      setCurrentDay((prev) => {
        if (prev >= totalDays) {
          setIsPlaying(false);
          return totalDays;
        }
        return prev + 1;
      });
      animationRef.current = requestAnimationFrame(() => {
        setTimeout(animate, 50);
      });
    };
    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, totalDays, destinations]);

  // Logic to fly to destination based on Timeline
  useEffect(() => {
    if (!mapRef.current || !destinations?.length) return;

    // Only auto-fly if playing or dragging slider (we don't want this to conflict with hover)
    // Simple calculation for target logic remains same
    const firstDate = new Date(destinations[0].arrival_date);
    const currentDate = new Date(firstDate.getTime() + currentDay * 24 * 60 * 60 * 1000);
    let targetDestination = destinations[0];
    for (const dest of destinations) {
      const arrivalDate = new Date(dest.arrival_date);
      if (currentDate >= arrivalDate) targetDestination = dest;
      else break;
    }

    mapRef.current.flyTo({
      center: [targetDestination.longitude, targetDestination.latitude],
      zoom: 6,
      pitch: 45,
      duration: 2000,
      essential: true,
    });
  }, [currentDay, destinations]); // Removed totalDays dependency to reduce re-renders

  // UX IMPROVEMENT: Hover handler for cards
  const handleCardHover = (latitude: number, longitude: number) => {
    if (mapRef.current && !isPlaying) {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 7,
        pitch: 50,
        duration: 1500,
        essential: true,
      });
    }
  };

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentDay(0);
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-background pt-20">
        <p className="text-center">Loading map...</p>
      </div>
    );
  if (!destinations?.length)
    return (
      <div className="min-h-screen bg-background pt-20">
        <p className="text-center">No destinations yet.</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 container mx-auto px-6 py-12">
        <header className="mb-6">
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">Journey map</h1>
          <p className="text-muted-foreground">
            {destinations.length} destination{destinations.length !== 1 ? "s" : ""} • {totalDays} days of adventure
          </p>
        </header>

        {/* Map Section */}
        <section className="rounded-2xl shadow-card overflow-hidden mb-8">
          <div ref={mapContainer} className="w-full h-[600px]" />
          <div className="bg-card p-6 border-t">
            <div className="flex items-center gap-4">
              <Button onClick={handlePlayPause} size="icon" variant="outline" className="shrink-0">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Slider
                value={[currentDay]}
                onValueChange={(value) => setCurrentDay(value[0])}
                max={totalDays}
                step={1}
                className="flex-1"
              />
              <Button onClick={handleReset} size="icon" variant="ghost" className="shrink-0">
                <RotateCcw className="w-4 h-4" />
              </Button>
              {/* UX IMPROVEMENT: Added Actual Date Context */}
              <div className="text-sm font-medium text-muted-foreground shrink-0 min-w-[140px] text-right flex flex-col">
                <span>
                  Day {currentDay} / {totalDays}
                </span>
                <span className="text-xs text-foreground font-bold">{currentDateDisplay}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Destination Cards */}
        <section>
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">All destinations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinations.map((dest) => {
              // UX IMPROVEMENT: Clean Date Logic
              const startStr = format(new Date(dest.arrival_date), "d MMM yyyy");
              const endStr = dest.departure_date ? format(new Date(dest.departure_date), "d MMM yyyy") : "Present";
              const dateDisplay = startStr === endStr ? startStr : `${startStr} – ${endStr}`;

              return (
                <div
                  key={dest.id}
                  onMouseEnter={() => handleCardHover(dest.latitude, dest.longitude)}
                  className="bg-card rounded-xl shadow-card overflow-hidden hover:shadow-elegant transition-all hover-scale cursor-pointer flex flex-col h-full"
                >
                  {/* UX IMPROVEMENT: Added Placeholder Thumbnail */}
                  <div className="h-32 w-full bg-muted relative">
                    {/* This uses a generic image service based on country name for visuals */}
                    <img
                      src={`https://source.unsplash.com/800x600/?${dest.country},travel`}
                      alt={dest.name}
                      className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                    {dest.is_current && (
                      <Badge variant="destructive" className="absolute top-2 right-2 shadow-sm">
                        Current Location
                      </Badge>
                    )}
                  </div>

                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-foreground">{dest.name}</h3>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-3 h-3" /> {dest.country}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-3 bg-muted/50 p-2 rounded-md w-fit">
                      <Calendar className="w-3 h-3" /> {dateDisplay}
                    </div>

                    {dest.description && (
                      <p className="text-sm text-foreground/80 line-clamp-3 mb-4 flex-grow">{dest.description}</p>
                    )}

                    {/* UX IMPROVEMENT: Call to action */}
                    <div className="mt-auto pt-2 border-t border-border/40">
                      <Button variant="link" className="px-0 h-auto text-teal-600 hover:text-teal-700">
                        Read Story <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Map;

import { Navigation } from "@/components/Navigation";
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const animationRef = useRef<number | null>(null);

  // Fetch destinations
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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      projection: "globe" as any,
      zoom: 1.5,
      center: [30, 15],
      pitch: 45,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      "top-right"
    );

    // Disable scroll zoom
    map.current.scrollZoom.disable();

    // Add atmosphere and fog
    map.current.on("style.load", () => {
      map.current?.setFog({
        color: "rgb(255, 255, 255)",
        "high-color": "rgb(200, 200, 225)",
        "horizon-blend": 0.2,
      });
    });

    // Globe rotation
    const secondsPerRevolution = 240;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    let userInteracting = false;
    let spinEnabled = true;

    function spinGlobe() {
      if (!map.current) return;
      
      const zoom = map.current.getZoom();
      if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
          const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
          distancePerSecond *= zoomDif;
        }
        const center = map.current.getCenter();
        center.lng -= distancePerSecond;
        map.current.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    }

    map.current.on("mousedown", () => { userInteracting = true; });
    map.current.on("dragstart", () => { userInteracting = true; });
    map.current.on("mouseup", () => { userInteracting = false; spinGlobe(); });
    map.current.on("touchend", () => { userInteracting = false; spinGlobe(); });
    map.current.on("moveend", () => { spinGlobe(); });

    spinGlobe();

    return () => {
      map.current?.remove();
    };
  }, []);

  // Add markers and routes when destinations load
  useEffect(() => {
    if (!map.current || destinations.length === 0) return;

    map.current.on("load", () => {
      // Add route line
      const coordinates = destinations.map(d => [Number(d.longitude), Number(d.latitude)]);
      
      map.current?.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coordinates,
          },
        },
      });

      map.current?.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#14b8a6",
          "line-width": 3,
          "line-opacity": 0.8,
        },
      });

      // Add animated line
      map.current?.addLayer({
        id: "route-arrow",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 4,
          "line-opacity": 0.6,
          "line-dasharray": [0, 4, 3],
        },
      });

      // Animate the route
      let animationPhase = 0;
      const animate = () => {
        animationPhase = (animationPhase + 0.01) % 1;
        
        if (map.current) {
          map.current.setPaintProperty("route-arrow", "line-dasharray", [
            0,
            animationPhase * 7,
            7 - animationPhase * 7,
          ]);
        }
        
        requestAnimationFrame(animate);
      };
      animate();

      // Add markers
      destinations.forEach((destination) => {
        const el = document.createElement("div");
        el.className = "destination-marker";
        el.style.width = "32px";
        el.style.height = "32px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = destination.is_current ? "#ef4444" : "#14b8a6";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        el.style.cursor = "pointer";
        el.style.transition = "all 0.2s";
        
        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.2)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px; color: #0f172a;">${destination.name}</h3>
            <p style="font-size: 14px; color: #64748b; margin-bottom: 4px;">${destination.country}</p>
            <p style="font-size: 12px; color: #94a3b8;">
              ${format(new Date(destination.arrival_date), "MMM d, yyyy")}
              ${destination.departure_date ? ` - ${format(new Date(destination.departure_date), "MMM d, yyyy")}` : " - Present"}
            </p>
            ${destination.description ? `<p style="font-size: 13px; margin-top: 8px; color: #475569;">${destination.description}</p>` : ""}
            ${destination.is_current ? '<span style="display: inline-block; margin-top: 4px; padding: 2px 8px; background: #ef4444; color: white; border-radius: 12px; font-size: 11px; font-weight: 600;">CURRENT LOCATION</span>' : ""}
          </div>
        `);

        new mapboxgl.Marker(el)
          .setLngLat([Number(destination.longitude), Number(destination.latitude)])
          .setPopup(popup)
          .addTo(map.current!);
      });

      // Fit map to show all destinations
      if (coordinates.length > 0) {
        const bounds = coordinates.reduce(
          (bounds, coord) => bounds.extend(coord as [number, number]),
          new mapboxgl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number])
        );
        map.current?.fitBounds(bounds, { padding: 100, maxZoom: 8 });
      }
    });
  }, [destinations]);

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
          <div ref={mapContainer} className="h-[600px] w-full" />
          
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

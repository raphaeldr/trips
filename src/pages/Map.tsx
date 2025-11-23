import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, MapPin } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !destinations?.length) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard",
      zoom: 2,
      center: [0, 20],
      pitch: 45,
    });
    mapRef.current = map;

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
    map.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      "top-right",
    );
    map.scrollZoom.disable();

    // Auto-rotation
    const secondsPerRevolution = 240;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    let userInteracting = false;
    function spinGlobe() {
      if (!mapRef.current) return;
      const zoom = mapRef.current.getZoom();
      if (!userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
          const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
          distancePerSecond *= zoomDif;
        }
        const center = mapRef.current.getCenter();
        center.lng -= distancePerSecond;
        mapRef.current.easeTo({
          center,
          duration: 1000,
          easing: (n) => n,
        });
      }
    }
    map.on("mousedown", () => {
      userInteracting = true;
    });
    map.on("dragstart", () => {
      userInteracting = true;
    });
    map.on("mouseup", () => {
      userInteracting = false;
      spinGlobe();
    });
    map.on("touchend", () => {
      userInteracting = false;
      spinGlobe();
    });
    map.on("moveend", () => {
      spinGlobe();
    });
    spinGlobe();

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
      el.addEventListener("mouseenter", () => {
        el.style.transform = "rotate(-45deg) scale(1.2)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "rotate(-45deg) scale(1)";
      });
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
      }).setHTML(`
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px; color: #0f766e;">${dest.name}</h3>
            <p style="margin-bottom: 4px; font-size: 14px; color: #666;">${dest.country}</p>
            <p style="font-size: 12px; color: #888; margin-bottom: 4px;">
              ${format(new Date(dest.arrival_date), "d MMMM yyyy")}
              ${dest.departure_date ? ` - ${format(new Date(dest.departure_date), "d MMMM yyyy")}` : " - Present"}
            </p>
            ${dest.description ? `<p style="font-size: 13px; margin-top: 8px; color: #333;">${dest.description}</p>` : ""}
            ${dest.is_current ? '<span style="display: inline-block; background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-top: 4px;">Current Location</span>' : ""}
          </div>
        `);
      const marker = new mapboxgl.Marker({
        element: el,
      })
        .setLngLat([dest.longitude, dest.latitude])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    });

    // Fly to first destination on load
    if (destinations.length > 0) {
      setTimeout(() => {
        map.flyTo({
          center: [destinations[0].longitude, destinations[0].latitude],
          zoom: 6,
          pitch: 45,
          duration: 2000,
          essential: true,
        });
      }, 500);
    }

    // Calculate total days
    if (destinations.length > 0) {
      const firstDate = new Date(destinations[0].arrival_date);
      const lastDest = destinations[destinations.length - 1];
      const lastDate = lastDest.departure_date ? new Date(lastDest.departure_date) : new Date();
      const days = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      setTotalDays(days);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      markersRef.current = [];
      map.remove();
    };
  }, [destinations]);

  // Timeline animation
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
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, totalDays, destinations]);

  // Fly to destination based on timeline
  useEffect(() => {
    if (!mapRef.current || !destinations?.length) return;

    // If at the end of timeline, show last destination
    if (currentDay >= totalDays) {
      const lastDestination = destinations[destinations.length - 1];
      mapRef.current.flyTo({
        center: [lastDestination.longitude, lastDestination.latitude],
        zoom: 6,
        pitch: 45,
        duration: 2000,
        essential: true,
      });
      return;
    }

    // Calculate which destination corresponds to current day
    const firstDate = new Date(destinations[0].arrival_date);
    const currentDate = new Date(firstDate.getTime() + currentDay * 24 * 60 * 60 * 1000);

    let targetDestination = destinations[0];
    for (const dest of destinations) {
      const arrivalDate = new Date(dest.arrival_date);
      if (currentDate >= arrivalDate) {
        targetDestination = dest;
      } else {
        break;
      }
    }

    // Fly to the destination
    mapRef.current.flyTo({
      center: [targetDestination.longitude, targetDestination.latitude],
      zoom: 6,
      pitch: 45,
      duration: 2000,
      essential: true,
    });
  }, [currentDay, destinations, totalDays]);
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentDay(0);
  };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-20 container mx-auto px-6 py-12">
          <div className="flex items-center justify-center h-[600px]">
            <p className="text-muted-foreground">Loading map...</p>
          </div>
        </main>
      </div>
    );
  }
  if (!destinations || destinations.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-20 container mx-auto px-6 py-12">
          <header className="mb-6">
            <h1 className="text-4xl font-display font-bold text-foreground mb-2">Journey Map</h1>
            <p className="text-muted-foreground">Track your adventures across the globe.</p>
          </header>
          <div className="rounded-2xl shadow-card overflow-hidden bg-muted p-12 text-center">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">No destinations yet</h2>
            <p className="text-muted-foreground mb-6">Add your first destination to see it on the map!</p>
            <Button>Go to Admin Panel</Button>
          </div>
        </main>
      </div>
    );
  }
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

          {/* Timeline Controls */}
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

              <div className="text-sm font-medium text-muted-foreground shrink-0 min-w-[100px] text-right">
                Day {currentDay} / {totalDays}
              </div>
            </div>
          </div>
        </section>

        {/* Destination Cards */}
        <section>
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">All destinations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinations.map((dest) => (
              <div
                key={dest.id}
                className="bg-card rounded-xl shadow-card p-6 hover:shadow-elegant transition-all hover-scale cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: dest.is_current ? "#ef4444" : "#0f766e",
                      }}
                    />
                    <h3 className="font-bold text-lg text-foreground">{dest.name}</h3>
                  </div>
                  {dest.is_current && (
                    <Badge variant="destructive" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>

                <p className="text-muted-foreground text-sm mb-3">{dest.country}</p>

                <div className="text-sm text-muted-foreground mb-3">
                  {format(new Date(dest.arrival_date), "d MMMM yyyy")}
                  {dest.departure_date && ` - ${format(new Date(dest.departure_date), "d MMMM yyyy")}`}
                  {!dest.departure_date && " - Present"}
                </div>

                {dest.description && <p className="text-sm text-foreground/80 line-clamp-3">{dest.description}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};
export default Map;

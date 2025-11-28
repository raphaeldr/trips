import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import type { Destination } from "@/types";

const Map = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const animationRef = useRef<number>();

  // Fetch destinations
  const { data: destinations, isLoading } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("arrival_date", { ascending: true });
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
      style: "mapbox://styles/mapbox/streets-v12",
      zoom: 2,
      center: [0, 20],
      pitch: 0,
      cooperativeGestures: true,
      projection: "globe" as any,
    });
    mapRef.current = map;

    // CRITICAL FIX: Force resize to prevent blank map on mobile
    const resizeObserver = new ResizeObserver(() => {
      if (map) map.resize();
    });
    resizeObserver.observe(mapContainer.current);

    setTimeout(() => map.resize(), 100);

    map.on("load", () => {
      map.resize();

      // CHANGE: Zoom in on the first destination immediately
      if (destinations.length > 0) {
        const firstDest = destinations[0];
        map.flyTo({
          center: [firstDest.longitude, firstDest.latitude],
          zoom: 4, // Start with a nice overview zoom of the first location
          speed: 1.5,
          curve: 1,
        });
      }

      // Globe atmosphere
      map.setFog({
        color: "rgb(255,255,255)",
        "high-color": "rgb(200,200,225)",
        "horizon-blend": 0.2,
      });
    });

    // Add Layers
    map.on("style.load", () => {
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

      // Add route line layer
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
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
          if (map.getLayer("route-line")) {
            map.setPaintProperty("route-line", "line-dasharray", dashArraySequence[step]);
          }
          step = newStep;
        }
        requestAnimationFrame(animateDashArray);
      }
      animateDashArray(0);

      // Add destination markers
      map.addSource("destinations", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: destinations.map((dest) => ({
            type: "Feature",
            properties: {
              id: dest.id,
              name: dest.name,
              country: dest.country,
              arrivalDate: dest.arrival_date,
              departureDate: dest.departure_date,
              description: dest.description,
              isCurrent: dest.is_current,
            },
            geometry: {
              type: "Point",
              coordinates: [dest.longitude, dest.latitude],
            },
          })),
        },
      });

      // Past destinations
      map.addLayer({
        id: "destinations-past",
        type: "circle",
        source: "destinations",
        filter: ["!", ["get", "isCurrent"]],
        paint: {
          "circle-radius": 10,
          "circle-color": "#0f766e",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Current destination
      map.addLayer({
        id: "destinations-current",
        type: "circle",
        source: "destinations",
        filter: ["get", "isCurrent"],
        paint: {
          "circle-radius": 12,
          "circle-color": "#ef4444",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
        },
      });
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    map.scrollZoom.disable();

    // REMOVED: setupGlobeRotation(map) call to stop spinning

    const cursorPointer = () => (map.getCanvas().style.cursor = "pointer");
    const cursorDefault = () => (map.getCanvas().style.cursor = "");

    map.on("mouseenter", "destinations-past", cursorPointer);
    map.on("mouseleave", "destinations-past", cursorDefault);
    map.on("mouseenter", "destinations-current", cursorPointer);
    map.on("mouseleave", "destinations-current", cursorDefault);

    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: true, maxWidth: "300px" });

    const showPopup = (e: mapboxgl.MapMouseEvent) => {
      if (!e.features?.length) return;
      const feature = e.features[0];
      const coordinates = (feature.geometry as any).coordinates.slice();
      const props = feature.properties as any;

      const html = `
        <div style="padding: 8px;">
          <h3 style="font-weight: bold; margin-bottom: 4px; color: #0f766e;">${props.name}</h3>
          <p style="margin-bottom: 4px; font-size: 14px; color: #666;">${props.country}</p>
          <p style="font-size: 12px; color: #888; margin-bottom: 4px;">
            ${format(new Date(props.arrivalDate), "d MMM yyyy")}
          </p>
        </div>
      `;
      popup.setLngLat(coordinates).setHTML(html).addTo(map);
    };

    map.on("click", "destinations-past", showPopup);
    map.on("click", "destinations-current", showPopup);

    // Initial calculations
    if (destinations.length > 0) {
      const firstDate = new Date(destinations[0].arrival_date);
      const lastDest = destinations[destinations.length - 1];
      const lastDate = lastDest.departure_date ? new Date(lastDest.departure_date) : new Date();
      const days = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      setTotalDays(days);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
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
        return prev + 0.5; // Smaller step for smoother animation
      });
      animationRef.current = requestAnimationFrame(() => {
        setTimeout(animate, 20); // Slightly faster refresh for smoothness
      });
    };
    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, totalDays, destinations]);

  // Fly to destination based on timeline (Interpolation Logic)
  useEffect(() => {
    if (!mapRef.current || !destinations?.length) return;

    const firstDate = new Date(destinations[0].arrival_date);
    const currentDateTimestamp = firstDate.getTime() + currentDay * 24 * 60 * 60 * 1000;

    let targetLng = destinations[0].longitude;
    let targetLat = destinations[0].latitude;

    // Calculate position along the route
    for (let i = 0; i < destinations.length - 1; i++) {
      const curr = destinations[i];
      const next = destinations[i + 1];

      const currArrival = new Date(curr.arrival_date).getTime();
      const nextArrival = new Date(next.arrival_date).getTime();

      // If current timeline date is between this destination and the next
      if (currentDateTimestamp >= currArrival && currentDateTimestamp < nextArrival) {
        // Check if we are "staying" (before departure) or "moving" (after departure)
        const currDeparture = curr.departure_date ? new Date(curr.departure_date).getTime() : currArrival; // If no departure date, assume we leave immediately (or change logic to +1 day)

        if (currentDateTimestamp <= currDeparture) {
          // We are staying at the current location
          targetLng = curr.longitude;
          targetLat = curr.latitude;
        } else {
          // We are travelling between curr and next
          const travelTime = nextArrival - currDeparture;
          const timeTraveled = currentDateTimestamp - currDeparture;

          // Avoid division by zero
          if (travelTime > 0) {
            const progress = timeTraveled / travelTime;
            // Linear Interpolation (Lerp)
            targetLng = curr.longitude + (next.longitude - curr.longitude) * progress;
            targetLat = curr.latitude + (next.latitude - curr.latitude) * progress;
          }
        }
        break;
      }
    }

    // If we are past the last destination, lock to the last one
    const lastDest = destinations[destinations.length - 1];
    const lastArrival = new Date(lastDest.arrival_date).getTime();
    if (currentDateTimestamp >= lastArrival) {
      targetLng = lastDest.longitude;
      targetLat = lastDest.latitude;
    }

    // Smoothly pan to the calculated position
    mapRef.current.easeTo({
      center: [targetLng, targetLat],
      zoom: 4,
      duration: 100, // Fast duration for smooth continuous movement
      easing: (t) => t, // Linear easing
    });
  }, [currentDay, destinations, totalDays]);

  const handlePlayPause = () => {
    // Auto-rewind if at the end
    if (!isPlaying && currentDay >= totalDays) {
      setCurrentDay(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentDay(0);
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-background">
        <p className="p-20 text-center">Loading map...</p>
      </div>
    );

  if (!destinations?.length)
    return (
      <div className="min-h-screen bg-background pt-20 container text-center">
        <h1 className="text-2xl font-bold">No destinations found</h1>
      </div>
    );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="pt-20 container mx-auto px-4 md:px-6 py-4 md:py-12">
        <header className="mb-6">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">Journey map</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {destinations.length} destinations • {totalDays} days of adventure
          </p>
        </header>

        {/* Map Section */}
        <section className="rounded-xl md:rounded-2xl shadow-card overflow-hidden mb-8 border border-border">
          <div className="relative w-full h-[50vh] md:h-[600px] bg-muted">
            <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
          </div>

          {/* Timeline Controls */}
          <div className="bg-card p-4 md:p-6 border-t">
            <div className="flex items-center gap-4">
              <Button
                onClick={handlePlayPause}
                size="icon"
                variant="outline"
                className="shrink-0 h-8 w-8 md:h-10 md:w-10"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>

              <Slider
                value={[currentDay]}
                onValueChange={(value) => setCurrentDay(value[0])}
                max={totalDays}
                step={1}
                className="flex-1"
              />

              <div className="text-xs md:text-sm font-medium text-muted-foreground shrink-0 min-w-[80px] text-right">
                Day {Math.floor(currentDay)} / {totalDays}
              </div>
            </div>
          </div>
        </section>

        {/* Destination Cards */}
        <section>
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">All destinations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinations.map((dest) => (
              <div key={dest.id} className="bg-card rounded-xl shadow-card p-6 border border-border/50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: dest.is_current ? "#ef4444" : "#0f766e" }}
                    />
                    <h3 className="font-bold text-lg text-foreground">{dest.name}</h3>
                  </div>
                  {dest.is_current && (
                    <Badge variant="destructive" className="text-[10px]">
                      Current
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm mb-2">{dest.country}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {format(new Date(dest.arrival_date), "d MMM yyyy")}
                </p>
                {dest.description && <p className="text-sm text-foreground/80 line-clamp-3">{dest.description}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Map;

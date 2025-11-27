import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, MapPin } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MAPBOX_TOKEN, MAP_CONFIG, setupGlobeRotation } from "@/lib/mapbox";
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
    setupGlobeRotation(map);

    // Add destination markers as circle layers
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

    // Past destinations layer
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

    // Current destination layer
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

    // Add hover effect
    map.on("mouseenter", "destinations-past", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "destinations-past", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("mouseenter", "destinations-current", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "destinations-current", () => {
      map.getCanvas().style.cursor = "";
    });

    // Add popup on click
    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: true,
    });

    const showPopup = (e: mapboxgl.MapMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      
      const feature = e.features[0];
      const coordinates = (feature.geometry as any).coordinates.slice();
      const props = feature.properties as any;

      const html = `
        <div style="padding: 8px;">
          <h3 style="font-weight: bold; margin-bottom: 4px; color: #0f766e;">${props.name}</h3>
          <p style="margin-bottom: 4px; font-size: 14px; color: #666;">${props.country}</p>
          <p style="font-size: 12px; color: #888; margin-bottom: 4px;">
            ${format(new Date(props.arrivalDate), "d MMMM yyyy")}
            ${props.departureDate ? ` - ${format(new Date(props.departureDate), "d MMMM yyyy")}` : " - Present"}
          </p>
          ${props.description ? `<p style="font-size: 13px; margin-top: 8px; color: #333;">${props.description}</p>` : ""}
          ${props.isCurrent ? '<span style="display: inline-block; background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-top: 4px;">Current Location</span>' : ""}
        </div>
      `;

      popup.setLngLat(coordinates).setHTML(html).addTo(map);
    };

    map.on("click", "destinations-past", showPopup);
    map.on("click", "destinations-current", showPopup);

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
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Navigation />
        <BottomNav />
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
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />
      <BottomNav />
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

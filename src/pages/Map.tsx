import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Navigation } from "@/components/Navigation";

import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import type { Destination } from "@/types";

// Helper to adjust coordinates for routes that should cross the antimeridian (Pacific)
const getAdjustedRouteCoordinates = (coords: [number, number][]): [number, number][] => {
  if (coords.length < 2) return coords;

  const result: [number, number][] = [coords[0]];

  for (let i = 1; i < coords.length; i++) {
    const prev = result[i - 1];
    const curr = coords[i];

    // Calculate the longitude difference
    const directDiff = Math.abs(curr[0] - prev[0]);

    // If difference > 180, it's shorter to go the other way (across antimeridian)
    if (directDiff > 180) {
      // Adjust current longitude to continue in the same direction
      if (curr[0] > prev[0]) {
        // Current is east, but we should go west - subtract 360
        result.push([curr[0] - 360, curr[1]]);
      } else {
        // Current is west, but we should go east - add 360
        result.push([curr[0] + 360, curr[1]]);
      }
    } else {
      result.push(curr);
    }
  }

  return result;
};

// Helper for safe date formatting
const safeFormat = (dateStr: string | null | undefined, fmt: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  try {
    return format(d, fmt);
  } catch (e) {
    console.error("Date format error", e);
    return "";
  }
};

const Map = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  // Visited Place selection
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Fetch destinations
  const {
    data: destinations,
    isLoading
  } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("destinations").select("*").order("arrival_date", {
        ascending: true
      });
      if (error) throw error;
      return data as Destination[];
    }
  });

  // Fetch Visited Places
  const { data: visitedPlaces } = useQuery({
    queryKey: ["visited_places_map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visited_places")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  // No longer needed: destinationStats (removed "new places" badge)

  // Calculate total days
  const totalDays = destinations && destinations.length > 0 ? (() => {
    const start = new Date(destinations[0].arrival_date);
    const end = destinations[destinations.length - 1].departure_date ? new Date(destinations[destinations.length - 1].departure_date!) : new Date(); // If no departure date, assume current date
    return differenceInDays(end, start) + 1; // +1 to include the start day
  })() : 0;

  const addMapLayers = (map: mapboxgl.Map) => {
    if (!destinations || !map) return;

    // Route line - handle antimeridian crossing for Pacific routes
    const adjustedCoordinates = getAdjustedRouteCoordinates(
      destinations.map(d => [d.longitude, d.latitude])
    );

    if (!map.getSource("route")) {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: adjustedCoordinates
          }
        }
      });
    }

    if (!map.getLayer("route-line")) {
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#0f766e",
          "line-width": 3,
          "line-dasharray": [2, 2],
          "line-opacity": 0.8
        }
      });
    }

    // 1. PLANNED ANCHORS (Destinations)
    if (!map.getSource("destinations")) {
      map.addSource("destinations", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: destinations.map(dest => ({
            type: "Feature",
            properties: {
              id: dest.id,
              name: dest.name,
              country: dest.country,
              arrivalDate: dest.arrival_date,
              isCurrent: dest.is_current
            },
            geometry: {
              type: "Point",
              coordinates: [dest.longitude, dest.latitude]
            }
          }))
        }
      });
    }

    if (!map.getLayer("destinations-points")) {
      map.addLayer({
        id: "destinations-points",
        type: "circle",
        source: "destinations",
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 12, 10],
          "circle-color": ["case", ["get", "isCurrent"], "#22c55e", "#0f766e"],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.9
        }
      });
    }

    // 2. EMERGENT PLACES (Visited Places)
    if (visitedPlaces && visitedPlaces.length > 0) {
      if (!map.getSource("emergent-places")) {
        map.addSource("emergent-places", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: visitedPlaces.map(place => ({
              type: "Feature",
              properties: { id: place.id, name: place.name },
              geometry: { type: "Point", coordinates: [place.longitude, place.latitude] }
            }))
          }
        });
      }

      if (!map.getLayer("emergent-dots")) {
        map.addLayer({
          id: "emergent-dots",
          type: "circle",
          source: "emergent-places",
          paint: {
            "circle-radius": 4,
            "circle-color": "#fb923c",
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff"
          }
        });
      }
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !destinations?.length) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      zoom: 1.5,
      center: [20, 30],
      pitch: 0,
      projection: "globe" as any
    });
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      if (map) map.resize();
    });
    resizeObserver.observe(mapContainer.current);
    setTimeout(() => map.resize(), 100);

    map.on("load", () => {
      map.resize();

      // Setup Fog for outdoors
      map.setFog({
        color: "rgb(255, 255, 255)",
        "high-color": "rgb(200, 200, 225)",
        "horizon-blend": 0.2,
        "space-color": "rgb(150, 150, 170)",
        "star-intensity": 0
      });

      addMapLayers(map);

      // Initial fly to the first destination or fit bounds
      if (destinations.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        destinations.forEach(d => bounds.extend([d.longitude, d.latitude]));
        map.fitBounds(bounds, {
          padding: 100,
          maxZoom: 4
        });
      }
    });

    map.on("style.load", () => {
      addMapLayers(map);
    });

    map.addControl(new mapboxgl.NavigationControl({
      visualizePitch: true
    }), "top-right");

    // Interactivity
    map.on("click", "destinations-points", e => {
      if (!e.features?.length) return;
      const id = e.features[0].properties?.id;
      handleSelectDestination(id);
    });
    map.on("mouseenter", "destinations-points", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "destinations-points", () => {
      map.getCanvas().style.cursor = "";
    });
    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [destinations, visitedPlaces]);

  // Handle sidebar selection -> map interaction
  // Handle sidebar selection -> map interaction
  const handleSelectDestination = (id: string) => {
    setSelectedDestId(id);
    setSelectedPlaceId(null);
    const dest = destinations?.find(d => d.id === id);
    if (dest && mapRef.current) {
      mapRef.current.flyTo({
        center: [dest.longitude, dest.latitude],
        zoom: 6,
        essential: true
      });
    }
  };

  const handleSelectPlace = (id: string) => {
    setSelectedPlaceId(id);
    // don't deselect destination entirely, maybe just highlight place
    const place = visitedPlaces?.find(p => p.id === id);
    if (place && mapRef.current) {
      mapRef.current.flyTo({
        center: [place.longitude, place.latitude],
        zoom: 10,
        essential: true
      });
    }
  };

  // MERGE & SORT TIMELINE
  const timelineItems = [
    ...(destinations?.map(d => ({ type: 'destination' as const, date: new Date(d.arrival_date), data: d })) || []),
    ...(visitedPlaces?.map(p => ({ type: 'visited' as const, date: p.first_visited_at ? new Date(p.first_visited_at) : new Date(0), data: p })) || [])
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center">
    <p>Loading map...</p>
  </div>;

  return <div className="flex flex-col h-screen bg-background overflow-hidden">
    <Navigation />

    {/* Main Content Area - constrained to viewport height minus nav */}
    <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden pt-16 h-full">
      {/* Sidebar: Fixed width, constrained height with internal scroll */}
      <div className="w-full md:w-96 bg-background/95 backdrop-blur shadow-xl z-20 flex flex-col border-r border-border h-[40vh] md:h-full order-2 md:order-1 flex-shrink-0">
        <div className="p-6 border-b border-border">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">Our journey</h1>
          <p className="text-muted-foreground text-sm">
            {destinations?.length} destinations • {totalDays} days of adventure
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <div className="space-y-4">
            <div className="space-y-0">
              {timelineItems.map((item, index) => {
                if (item.type === 'destination') {
                  const dest = item.data;
                  return (
                    <div key={dest.id} className="relative pl-8 pb-8">
                      {/* Connector Line */}
                      <div className="absolute left-[15px] top-4 bottom-0 w-px bg-border/50" />

                      {/* Dot */}
                      <div className={`absolute left-1.5 top-2 w-7 h-7 rounded-full border-4 border-background ${dest.is_current ? "bg-green-500" : selectedDestId === dest.id ? "bg-primary" : "bg-muted-foreground/30"} z-10 transition-colors duration-300`} />

                      <Card
                        className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${selectedDestId === dest.id ? "border-l-primary ring-1 ring-primary/20" : "border-l-transparent hover:border-l-muted-foreground/30"}`}
                        onClick={() => handleSelectDestination(dest.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-foreground flex items-center gap-2">
                              {dest.name}
                              {dest.is_current && <Badge className="bg-green-500 hover:bg-green-600 text-white text-[10px] h-5 px-1.5 border-0">Current</Badge>}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground/70">{dest.country}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {safeFormat(dest.arrival_date, "d MMM")}
                            </span>
                          </div>
                          {dest.description && <p className="text-sm text-foreground/80 mt-2 line-clamp-2 leading-relaxed">{dest.description}</p>}
                        </CardContent>
                      </Card>
                    </div>
                  );
                } else {
                  const place = item.data;
                  return (
                    <div key={place.id} className="relative pl-8 pb-6">
                      {/* Connector Line */}
                      <div className="absolute left-[15px] top-0 bottom-0 w-px bg-border/50" />

                      {/* Small Dot */}
                      <div
                        className={`absolute left-[11px] top-1.5 w-2.5 h-2.5 rounded-full border border-background z-10 cursor-pointer transition-all duration-300 ${selectedPlaceId === place.id ? "bg-orange-500 scale-125" : "bg-orange-300 hover:bg-orange-400"}`}
                        onClick={() => handleSelectPlace(place.id)}
                      />

                      <div
                        className={`text-sm cursor-pointer transition-colors flex items-center gap-2 ${selectedPlaceId === place.id ? "text-orange-600 font-medium translate-x-1" : "text-muted-foreground hover:text-foreground"}`}
                        onClick={() => handleSelectPlace(place.id)}
                      >
                        <span className="truncate">{place.name}</span>
                        {/* Optional date for context if needed, maybe too cluttered
                       <span className="text-[10px] opacity-50">{safeFormat(place.first_visited_at, "MMM d")}</span>
                       */}
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Map Container: Takes remaining space */}
      <div className="flex-1 relative h-[60vh] md:h-full order-1 md:order-2 min-h-0">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full bg-muted" />

        {/* Overlay info for mobile map view */}
        <div className="absolute bottom-4 left-4 md:hidden z-10">
          <Badge variant="secondary" className="backdrop-blur-md bg-background/80">
            Tap list below to navigate
          </Badge>
        </div>
      </div>
    </div>
  </div>;
};
export default Map;
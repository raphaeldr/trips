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

  // Calculate stats per destination (Dual Model Logic)
  // For each destination, find which visited places occurred during that time window
  const destinationStats = destinations?.reduce((acc, dest) => {
    const start = new Date(dest.arrival_date);
    const end = dest.departure_date ? new Date(dest.departure_date) : new Date(3000, 0, 1);

    // Count places visited during this destination's window
    const placeCount = visitedPlaces?.filter(p => {
      if (!p.first_visited_at) return false;
      const visitDate = new Date(p.first_visited_at);
      return visitDate >= start && visitDate <= end;
    }).length || 0;

    acc[dest.id] = placeCount;
    return acc;
  }, {} as Record<string, number>);

  // Calculate total days
  const totalDays = destinations && destinations.length > 0 ? (() => {
    const start = new Date(destinations[0].arrival_date);
    const end = destinations[destinations.length - 1].departure_date ? new Date(destinations[destinations.length - 1].departure_date!) : new Date(); // If no departure date, assume current date
    return differenceInDays(end, start) + 1; // +1 to include the start day
  })() : 0;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !destinations?.length) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11", // Lighter style to make dots pop
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

      // Initial fly to the first destination or fit bounds
      if (destinations.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        destinations.forEach(d => bounds.extend([d.longitude, d.latitude]));
        map.fitBounds(bounds, {
          padding: 100,
          maxZoom: 4
        });
      }
      map.setFog({
        color: "rgb(255,255,255)",
        "high-color": "rgb(200,200,225)",
        "horizon-blend": 0.2
      });
    });

    map.on("style.load", () => {
      // Route line - handle antimeridian crossing for Pacific routes
      const adjustedCoordinates = getAdjustedRouteCoordinates(
        destinations.map(d => [d.longitude, d.latitude])
      );

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
          "line-opacity": 0.6
        }
      });

      // 1. PLANNED ANCHORS (Destinations)
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

      map.addLayer({
        id: "destinations-points",
        alias: "anchor-points", // Mapbox alias doesn't work this way, but strictly ID matters
        type: "circle",
        source: "destinations",
        paint: {
          "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 12, 10], // Slightly larger base
          "circle-color": ["case", ["get", "isCurrent"], "#ef4444", "#0f766e"],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.8
        }
      });

      // 2. EMERGENT PLACES (Visited Places)
      // These bloom around the anchors
      if (visitedPlaces && visitedPlaces.length > 0) {
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

        map.addLayer({
          id: "emergent-dots",
          type: "circle",
          source: "emergent-places",
          paint: {
            "circle-radius": 5,
            "circle-color": "#fb923c", // Orange for discovery
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff"
          }
        });

        // Add text labels for emergent places on high zoom
        map.addLayer({
          id: "emergent-labels",
          type: "symbol",
          source: "emergent-places",
          minzoom: 8,
          layout: {
            "text-field": ["get", "name"],
            // Use safe system fonts stack
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "text-size": 12,
            "text-offset": [0, 1.2],
            "text-anchor": "top"
          },
          paint: {
            "text-color": "#fb923c",
            "text-halo-color": "#ffffff",
            "text-halo-width": 2
          }
        });
      }
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
  const handleSelectDestination = (id: string) => {
    setSelectedDestId(id);
    const dest = destinations?.find(d => d.id === id);
    if (dest && mapRef.current) {
      mapRef.current.flyTo({
        center: [dest.longitude, dest.latitude],
        zoom: 6,
        essential: true
      });
    }
  };

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center">
    <p>Loading map...</p>
  </div>;

  return <div className="flex flex-col h-screen bg-background overflow-hidden">
    <Navigation />

    <div className="flex-1 relative flex flex-col md:flex-row pt-16">
      {/* Sidebar / Overlay List */}
      <div className="w-full md:w-96 bg-background/95 backdrop-blur shadow-xl z-20 flex flex-col border-r border-border h-[40vh] md:h-full order-2 md:order-1">
        <div className="p-6 border-b border-border">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">Our journey</h1>
          <p className="text-muted-foreground text-sm">
            {destinations?.length} destinations • {totalDays} days of adventure
          </p>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {destinations?.map((dest, index) => <div key={dest.id} className="relative pl-6 pb-6 last:pb-0">
              {/* Connector Line */}
              {index !== destinations.length - 1 && <div className="absolute left-[11px] top-8 bottom-0 w-px bg-border" />}

              {/* Dot */}
              <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-background ${dest.is_current ? "bg-red-500" : selectedDestId === dest.id ? "bg-primary" : "bg-muted-foreground/30"}`} />

              <Card className={`cursor-pointer transition-all hover:shadow-md ${selectedDestId === dest.id ? "border-primary ring-1 ring-primary" : ""}`} onClick={() => handleSelectDestination(dest.id)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-foreground flex items-center gap-2">
                        {dest.name}
                        {dest.is_current && <Badge variant="destructive" className="text-[10px] h-5">
                          Current
                        </Badge>}
                      </h3>
                      <p className="text-sm text-muted-foreground">{dest.country}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Calendar className="w-3 h-3" />
                    {safeFormat(dest.arrival_date, "MMM d, yyyy")}

                    {/* Dual Model Stats */}
                    {destinationStats && destinationStats[dest.id] > 0 && (
                      <Badge variant="outline" className="ml-auto text-[10px] border-orange-200 text-orange-600 bg-orange-50">
                        {destinationStats[dest.id]} new places
                      </Badge>
                    )}
                  </div>

                  {dest.description && <p className="text-sm text-foreground/80 line-clamp-2">{dest.description}</p>}
                </CardContent>
              </Card>
            </div>)}
          </div>
        </ScrollArea>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative h-[60vh] md:h-full order-1 md:order-2">
        <div ref={mapContainer} className="absolute inset-0 w-full h-full bg-muted" />

        {/* Overlay info for mobile map view */}
        <div className="absolute top-4 left-4 md:hidden z-10">
          <Badge variant="secondary" className="backdrop-blur-md bg-background/80">
            Tap list below to navigate
          </Badge>
        </div>
      </div>
    </div>
  </div>;
};
export default Map;
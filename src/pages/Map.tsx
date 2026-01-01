import { useEffect, useRef, useState, useMemo } from "react";
import { formatLocation, getLocationParts } from "@/utils/location";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";


import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { useJourney } from "@/hooks/useJourney";

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

  // Fetch destinations via Hook
  const { destinations, isLoading } = useJourney();

  // Fetch Visited Places (Dynamic from Moments)
  const { data: visitedPlaces, isLoading: isPlacesLoading } = useQuery({
    queryKey: ["visited_places_map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_visited_places_from_moments" as any);

      if (error) throw error;
      return data as { id: string; name: string; country: string; latitude: number; longitude: number; first_visited_at: string }[];
    },
  });

  // Fetch Latest Moment for "Currently In" fallback
  const { data: recentMoments, isLoading: isMomentsLoading } = useQuery({
    queryKey: ["recentMomentsMap"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moments")
        .select("*")
        .in("media_type", ["photo", "video"])
        .order("taken_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data;
    },
  });

  // No longer needed: destinationStats (removed "new places" badge)

  // --- Logic for "Currently In" ---
  const currentContext = useMemo(() => {
    if (!destinations) return { currentDestId: null, currentPlaceId: null };

    const now = new Date();

    // 1. Identify the "Best Destination" (Active or most recent past)
    // This serves as our guaranteed fallback if no granular place logic applies.
    const activeDest = destinations.find((d) => {
      const start = new Date(d.arrival_date);
      const end = d.departure_date ? new Date(d.departure_date) : new Date(3000, 0, 1);
      return now >= start && now <= end;
    });

    const lastDest = destinations
      .filter((d) => new Date(d.arrival_date) <= now)
      .sort((a, b) => new Date(b.arrival_date).getTime() - new Date(a.arrival_date).getTime())[0];

    const fallbackDest = activeDest || lastDest;
    let cDestId: string | null = fallbackDest?.id || null;
    let cPlaceId: string | null = null;


    // 2. Check for "Moment Override" (Granular Location)
    // Only override the destination if we have a moment that is significantly newer 
    // or relevant, AND it maps to a valid Visited Place.
    const latestMoment = recentMoments?.[0];

    if (latestMoment) {
      const momentDate = new Date(latestMoment.taken_at || latestMoment.created_at).getTime();
      const destDate = fallbackDest
        ? new Date(fallbackDest.departure_date || fallbackDest.arrival_date).getTime()
        : 0;

      // If moment is newer (or we have no dest), try to match a place
      if (momentDate > destDate || !fallbackDest) {
        if (visitedPlaces && latestMoment.location_name) {
          const match = visitedPlaces.find(p => p.name === latestMoment.location_name);
          if (match) {
            cPlaceId = match.id;
            cDestId = null; // Clear dest because we have a more specific place
          }
        }
      }
    }

    return { currentDestId: cDestId, currentPlaceId: cPlaceId };
  }, [destinations, recentMoments, visitedPlaces]);

  const { currentDestId, currentPlaceId } = currentContext;

  // Calculate total days
  // (existing code)


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
              isCurrent: dest.id === currentDestId
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

      // Initial View Logic
      // Priority: Current Location -> Fit Bounds
      if (currentDestId) {
        const dest = destinations.find(d => d.id === currentDestId);
        if (dest) {
          map.flyTo({ center: [dest.longitude, dest.latitude], zoom: 6 });
        }
      } else if (currentPlaceId && visitedPlaces) {
        const place = visitedPlaces.find(p => p.id === currentPlaceId);
        if (place) {
          map.flyTo({ center: [place.longitude, place.latitude], zoom: 10 });
        }
      } else {
        // Fallback: Fit bounds
        if (destinations.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          destinations.forEach(d => bounds.extend([d.longitude, d.latitude]));
          map.fitBounds(bounds, {
            padding: 100,
            maxZoom: 4
          });
        }
      }
    });

    map.on("style.load", () => {
      addMapLayers(map);
    });

    map.addControl(new mapboxgl.NavigationControl({
      visualizePitch: true
    }), "top-right");

    // Interactivity
    // Interactivity - Destinations
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

    // Interactivity - Visited Places
    map.on("click", "emergent-dots", e => {
      if (!e.features?.length) return;
      const id = e.features[0].properties?.id;
      handleSelectPlace(id);
    });
    map.on("mouseenter", "emergent-dots", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "emergent-dots", () => {
      map.getCanvas().style.cursor = "";
    });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [destinations, visitedPlaces, currentDestId, currentPlaceId]);

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
      // On mobile, maybe scroll to item?
    }
  };

  const handleSelectPlace = (id: string) => {
    setSelectedPlaceId(id);
    // don't deselect destination entirely, maybe just highlight place
    const place = visitedPlaces?.find(p => p.id === id);
    if (place && mapRef.current) {
      mapRef.current.flyTo({
        center: [place.longitude, place.latitude],
        zoom: 11, // Zoomed in closer for visited places
        essential: true
      });
    }
  };

  // MERGE & SORT TIMELINE
  const rawTimelineItems = [
    ...(destinations?.map(d => ({
      type: 'destination' as const,
      date: new Date(d.arrival_date),
      data: { ...d, is_current: d.id === currentDestId }
    })) || []),
    ...(visitedPlaces?.map(p => ({
      type: 'visited' as const,
      date: p.first_visited_at ? new Date(p.first_visited_at) : new Date(0),
      data: { ...p, is_current: p.id === currentPlaceId }
    })) || [])
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Add context country to items
  let lastCountry: string | null = null;
  const timelineItems = rawTimelineItems.map(item => {
    if (item.type === 'destination') {
      lastCountry = item.data.country;
      return { ...item, contextCountry: null }; // Destination doesn't need context country for itself (it sets it)
    } else {
      return { ...item, contextCountry: lastCountry };
    }
  });

  if (isLoading || isPlacesLoading || isMomentsLoading) return <div className="min-h-screen bg-background flex items-center justify-center">
    <p>Loading map...</p>
  </div>;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">


      {/* Main Container: Split Screen below header */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* Sidebar: Fixed width, right border */}
        <div className="w-full md:w-[400px] md:min-w-[350px] h-full overflow-y-auto bg-background border-r border-neutral-200 z-10 relative">

          <div className="pb-20">
            {/* Currently In Section */}
            {(currentDestId || currentPlaceId) && (() => {
              let currentObj = null;
              let isDest = false;
              if (currentDestId) {
                currentObj = destinations?.find(d => d.id === currentDestId);
                isDest = !!currentObj;
              } else if (currentPlaceId) {
                currentObj = visitedPlaces?.find(p => p.id === currentPlaceId);
              }
              if (!currentObj) return null;
              const name = currentObj.name;
              // @ts-ignore
              const country = isDest ? currentObj.country : "Japan";

              return (
                <div className="px-6 pt-6 pb-0">
                  {/* Card */}
                  <div
                    className="bg-[#F0FDF4] rounded-xl p-5 border border-green-100 shadow-sm cursor-pointer hover:bg-[#DCFCE7] transition-colors group/current relative z-20 mb-8"
                    onClick={() => isDest ? handleSelectDestination(currentObj!.id) : handleSelectPlace(currentObj!.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {/* Pulsing Dot Inside Card */}
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                          </span>
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-green-700">Currently in</span>
                        </div>

                        <h2 className="font-display text-xl font-bold text-green-950 leading-tight">
                          {(() => {
                            const parts = getLocationParts(name, country);
                            return (
                              <span>
                                <span>{parts.name}</span>
                                {parts.country && <span className="font-normal text-green-800/80 ml-1.5 text-lg">, {parts.country}</span>}
                              </span>
                            );
                          })()}
                        </h2>
                      </div>

                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-200/50 rounded-full shrink-0">
                        <MapPin className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Timeline Items */}
            <div className="relative">
              {/* Continuous Vertical Line */}
              <div className="absolute left-[16px] top-0 bottom-0 w-[2px] bg-[#E5E7EB]" />

              {timelineItems.map((item, index) => {
                if (item.type === 'destination') {
                  const dest = item.data;
                  return (
                    <div
                      key={dest.id}
                      className="group cursor-pointer relative pl-[32px] pb-8"
                      onClick={() => handleSelectDestination(dest.id)}
                    >
                      {/* Node: Hollow Circle 10px */}
                      <div className={`absolute left-[16px] top-[6px] -translate-x-1/2 w-[10px] h-[10px] rounded-full bg-white border-[2px] border-neutral-900 z-10 box-border transition-colors ${selectedDestId === dest.id ? "border-primary scale-125" : "group-hover:border-primary/70"}`} />

                      {/* Content */}
                      <div className="flex flex-col items-start transition-opacity hover:opacity-80">
                        <span className="font-sans text-[11px] uppercase tracking-[1px] text-neutral-400 font-medium mb-0.5">
                          {safeFormat(dest.arrival_date, "MMM yyyy")}
                        </span>
                        <h3 className="font-display text-[16px] leading-tight text-neutral-900 font-semibold">
                          {(() => {
                            const parts = getLocationParts(dest.name, dest.country, null);
                            return (
                              <span className={selectedDestId === dest.id ? "text-primary" : "text-neutral-900"}>
                                <span>{parts.name}</span>
                                {parts.country && <span className="font-normal text-neutral-500 ml-1">, {parts.country}</span>}
                              </span>
                            );
                          })()}
                        </h3>
                      </div>
                    </div>
                  );
                } else {
                  const place = item.data;
                  return (
                    <div key={place.id} className="relative pl-[32px] py-1 pb-3 group/place">
                      {/* Node: Filled Dot 4px */}
                      <div className={`absolute left-[16px] top-[10px] -translate-x-1/2 w-[4px] h-[4px] rounded-full z-10 transition-colors ${selectedPlaceId === place.id ? "bg-primary scale-150" : "bg-neutral-400 group-hover/place:bg-neutral-500"}`} />

                      <div
                        className={`text-sm cursor-pointer transition-colors flex items-center justify-between ${selectedPlaceId === place.id ? "text-primary font-medium" : "text-neutral-600 hover:text-neutral-900"}`}
                        onClick={() => handleSelectPlace(place.id)}
                      >
                        <span className="truncate font-sans font-normal text-[14px] leading-snug">
                          {(() => {
                            const parts = getLocationParts(place.name, place.country, item.contextCountry);
                            return parts.name;
                          })()}
                        </span>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>

        {/* Right Panel (Map): Flex Grow, Full Height */}
        <div className="flex-1 h-[40vh] md:h-full relative order-first md:order-last">
          <div ref={mapContainer} className="absolute inset-0 w-full h-full bg-muted" />

          {/* Mobile Overlay */}
          <div className="absolute bottom-4 left-4 md:hidden z-10">
            <Badge variant="secondary" className="backdrop-blur-md bg-background/80">
              Scroll down for list
            </Badge>
          </div>
        </div>

      </div>
    </div>
  );
};
export default Map;
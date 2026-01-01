import { useEffect, useRef, useState, useMemo } from "react";
import { formatLocation, getLocationParts } from "@/utils/location";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useJourney } from "@/hooks/useJourney";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";
import { format } from "date-fns";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Place, Media } from "@/types";
import { resolveMediaUrl } from "@/lib/utils";
import { PhotoCard } from "@/components/gallery/PhotoCard";

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

  const { segments, loading } = useJourney();

  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Derived: Flatten all places for easy access & map markers
  const allPlaces = useMemo(() => {
    if (!segments) return [];
    return segments.flatMap(segment =>
      (segment.places || []).map(place => ({
        ...place,
        segmentId: segment.id,
        segmentName: segment.name,
        country: segment.country // Inherit country from segment if needed, though place has it too
      }))
    );
  }, [segments]);

  const selectedPlace = useMemo(() =>
    allPlaces.find(p => p.id === selectedPlaceId),
    [allPlaces, selectedPlaceId]);

  // Handle Opening Sheet
  const handleOpenPlace = (placeId: string) => {
    setSelectedPlaceId(placeId);
    setIsSheetOpen(true);

    // Fly to location
    const place = allPlaces.find(p => p.id === placeId);
    if (place && mapRef.current) {
      mapRef.current.flyTo({
        center: [place.longitude, place.latitude],
        zoom: 12,
        essential: true
      });
    }
  };


  const addMapLayers = (map: mapboxgl.Map) => {
    if (!segments || !map) return;

    // 1. ROUTES (Polyline connecting places within a segment)
    // We create a MultiLineString where each LineString is a Segment's path
    const routeFeatures = segments.map(segment => {
      // Sort places by visited time to draw line correctly
      const sortedPlaces = (segment.places || []).slice().sort((a, b) =>
        new Date(a.first_visited_at).getTime() - new Date(b.first_visited_at).getTime()
      );

      if (sortedPlaces.length < 2) return null;

      return {
        type: "Feature",
        properties: { segmentId: segment.id, country: segment.country },
        geometry: {
          type: "LineString",
          coordinates: sortedPlaces.map(p => [p.longitude, p.latitude])
        }
      };
    }).filter(Boolean);

    if (!map.getSource("routes")) {
      map.addSource("routes", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: routeFeatures as any
        }
      });
    }

    if (!map.getLayer("route-lines")) {
      map.addLayer({
        id: "route-lines",
        type: "line",
        source: "routes",
        layout: {
          "line-join": "round",
          "line-cap": "round"
        },
        paint: {
          "line-color": "#0f766e", // Teal
          "line-width": 2,
          "line-opacity": 0.6,
          "line-dasharray": [2, 2]
        }
      });
    }

    // 2. PLACES (Markers)
    if (!map.getSource("places")) {
      map.addSource("places", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: allPlaces.map(place => ({
            type: "Feature",
            properties: {
              id: place.id,
              name: place.name,
              momentCount: place.moments?.length || 0
            },
            geometry: {
              type: "Point",
              coordinates: [place.longitude, place.latitude]
            }
          }))
        }
      });
    } else {
      // Update data if it changed
      (map.getSource("places") as mapboxgl.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: allPlaces.map(place => ({
          type: "Feature",
          properties: {
            id: place.id,
            name: place.name,
            momentCount: place.moments?.length || 0
          },
          geometry: {
            type: "Point",
            coordinates: [place.longitude, place.latitude]
          }
        }))
      });
    }

    if (!map.getLayer("places-dots")) {
      map.addLayer({
        id: "places-dots",
        type: "circle",
        source: "places",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5, 4,
            10, 8
          ],
          "circle-color": [
            "case",
            ["==", ["get", "id"], selectedPlaceId || ""],
            "#f97316", // Orange if selected
            "#0f766e"  // Teal default
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9
        }
      });
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current || !segments) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      zoom: 1.5,
      center: [20, 20],
      projection: "globe" as any
    });

    mapRef.current = map;

    map.on("load", () => {
      map.setFog({
        color: "rgb(255, 255, 255)",
        "high-color": "rgb(200, 200, 225)",
        "space-color": "rgb(150, 150, 170)"
      });

      addMapLayers(map);

      // Intitial Bounds
      if (allPlaces.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        allPlaces.forEach(p => bounds.extend([p.longitude, p.latitude]));
        map.fitBounds(bounds, { padding: 80, maxZoom: 4 });
      }
    });

    map.on("style.load", () => {
      addMapLayers(map);
    });

    // Interactions
    map.on("click", "places-dots", (e) => {
      if (!e.features?.length) return;
      const id = e.features[0].properties?.id;
      handleOpenPlace(id);
    });

    map.on("mouseenter", "places-dots", () => map.getCanvas().style.cursor = "pointer");
    map.on("mouseleave", "places-dots", () => map.getCanvas().style.cursor = "");

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [segments]); // Re-init if segments load (simplified)

  // Update selected state paint property without re-init
  useEffect(() => {
    if (!mapRef.current || !mapRef.current.getLayer("places-dots")) return;
    mapRef.current.setPaintProperty("places-dots", "circle-color", [
      "case",
      ["==", ["get", "id"], selectedPlaceId || ""],
      "#f97316",
      "#0f766e"
    ]);
  }, [selectedPlaceId]);


  if (loading) return <div className="h-screen flex items-center justify-center">Loading Journey...</div>;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* SIDEBAR */}
        <div className="w-full md:w-[400px] h-full overflow-y-auto bg-background border-r border-neutral-200 z-10 relative pb-24">
          <div className="p-6">
            <h1 className="font-display text-2xl font-bold mb-6">Journey</h1>

            <div className="relative border-l-2 border-neutral-100 ml-3 space-y-8">
              {segments?.map(segment => (
                <div key={segment.id} className="relative pl-6">
                  {/* Segment Node */}
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-white bg-neutral-300" />

                  <div className="mb-2">
                    <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                      {safeFormat(segment.arrival_date, "MMM yyyy")}
                    </span>
                    <h3 className="font-display text-lg font-bold text-neutral-800 leading-none mt-1">
                      {segment.name}
                    </h3>
                    {segment.country && <p className="text-sm text-neutral-500">{segment.country}</p>}
                  </div>

                  {/* Nested Places */}
                  <div className="space-y-3 mt-4">
                    {segment.places?.map(place => (
                      <div
                        key={place.id}
                        onClick={() => handleOpenPlace(place.id)}
                        className={`
                                                group flex items-center gap-3 p-2 -ml-2 rounded-lg cursor-pointer transition-colors
                                                ${selectedPlaceId === place.id ? "bg-orange-50" : "hover:bg-neutral-50"}
                                            `}
                      >
                        <div className={`
                                                w-2 h-2 rounded-full ring-2 ring-white
                                                ${selectedPlaceId === place.id ? "bg-orange-500" : "bg-neutral-300 group-hover:bg-orange-300"}
                                            `} />
                        <div>
                          <p className={`text-sm font-medium ${selectedPlaceId === place.id ? "text-orange-700" : "text-neutral-600"}`}>
                            {place.name}
                          </p>
                          {place.moments && place.moments.length > 0 && (
                            <p className="text-[10px] text-neutral-400">
                              {place.moments.length} moments
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MAP */}
        <div className="flex-1 h-[40vh] md:h-full relative order-first md:order-last">
          <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

          {/* Mobile Overlay */}
          <div className="absolute bottom-4 left-4 md:hidden z-10 pointer-events-none">
            <Badge variant="secondary" className="backdrop-blur-md bg-white/80 shadow-sm">
              Select a place to view details
            </Badge>
          </div>
        </div>

      </div>

      {/* DETAILS SHEET */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <div className="flex items-center gap-2 text-neutral-400 mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-mono uppercase tracking-wider">{selectedPlace?.country}</span>
            </div>
            <SheetTitle className="text-3xl font-display font-bold">{selectedPlace?.name}</SheetTitle>
            <SheetDescription>
              Visited {safeFormat(selectedPlace?.first_visited_at, "MMMM d, yyyy")}
            </SheetDescription>
          </SheetHeader>

          {selectedPlace?.moments && selectedPlace.moments.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {selectedPlace.moments.map(media => (
                <div key={media.id} className="relative aspect-square">
                  {/* Reusing PhotoCard but simplified or just an image for now */}
                  {media.storage_path && (
                    <img
                      src={resolveMediaUrl(media.storage_path)}
                      alt={media.caption || "Travel moment"}
                      className="w-full h-full object-cover rounded-lg shadow-sm"
                      loading="lazy"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-neutral-400 border-2 border-dashed border-neutral-100 rounded-xl">
              No moments captured here yet.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Map;
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MAPBOX_TOKEN, MAP_CONFIG, setupGlobeRotation } from "@/lib/mapbox";
import type { Destination } from "@/types";

interface MapEmbedProps {
  className?: string;
}

export const MapEmbed = ({ className = "" }: MapEmbedProps) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Fetch destinations
  const { data: destinations } = useQuery({
    queryKey: ["destinations-embed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("id, name, country, latitude, longitude, is_current")
        .order("arrival_date", { ascending: true });

      if (error) throw error;
      return data as Destination[];
    },
  });

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Gracefully skip map setup on browsers that don't fully support Mapbox GL
    if (!mapboxgl.supported({ failIfMajorPerformanceCaveat: true })) {
      console.warn("Mapbox GL not supported; skipping embedded map initialization.");
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        // Using streets-v12 for better stability (same as main map)
        style: "mapbox://styles/mapbox/streets-v12",
        projection: "globe" as any,
        zoom: 1.2,
        center: [20, 20],
        pitch: 0,
        // Critical for mobile embeds: prevents page scroll from getting stuck in map
        cooperativeGestures: true,
      });
      mapRef.current = map;

      // 1. CRITICAL FIX: Watch for container resizing (fixes blank screen on mobile/load)
      const resizeObserver = new ResizeObserver(() => {
        if (map) map.resize();
      });
      resizeObserver.observe(mapContainer.current);

      // Force a resize check shortly after mount
      setTimeout(() => {
        map.resize();
      }, 100);

      map.on("load", () => {
        map.resize();
        
        // Setup fog/atmosphere
        const spaceFog = MAP_CONFIG.spaceFog;
        map.setFog({
          color: spaceFog.color,
          "high-color": spaceFog.highColor,
          "horizon-blend": spaceFog.horizonBlend,
          "space-color": spaceFog.spaceColor,
          "star-intensity": spaceFog.starIntensity,
        });
        setMapLoaded(true);
      });

      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
      map.scrollZoom.disable();

      // Auto-rotation
      if (typeof setupGlobeRotation === 'function') {
        setupGlobeRotation(map);
      }

    } catch (error) {
      console.error("Failed to initialize embedded Mapbox map", error);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Add destinations when data loads
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || !destinations || destinations.length === 0) return;

    const map = mapRef.current;

    // Wait for style to be fully ready before adding layers
    const addLayers = () => {
        if (map.isStyleLoaded()) {
            addDestinationsToMap(map, destinations);
        } else {
            map.once("idle", () => addDestinationsToMap(map, destinations));
        }
    };

    // Small delay ensures resize calculations are done first
    const timer = setTimeout(addLayers, 100);

    return () => clearTimeout(timer);
  }, [destinations, mapLoaded]);

  const addDestinationsToMap = (map: mapboxgl.Map, destinations: Destination[]) => {
    // Cleanup existing layers
    try {
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getSource("route")) map.removeSource("route");
      if (map.getLayer("destinations-embed-past")) map.removeLayer("destinations-embed-past");
      if (map.getLayer("destinations-embed-current")) map.removeLayer("destinations-embed-current");
      if (map.getSource("destinations-embed")) map.removeSource("destinations-embed");
    } catch (error) {
      console.log("Layer cleanup skipped or failed", error);
    }

    // Add route line
    if (destinations.length > 1) {
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
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });

      // Animate dash
      const dashArraySequence = [
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

    let resizeObserver: ResizeObserver | null = null;

    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        // Using streets-v12 for better stability and consistency
        style: "mapbox://styles/mapbox/streets-v12",
        projection: "globe" as any,
        zoom: 1.8,
        center: [20, 20],
        pitch: 0,
        // Critical for mobile embeds: prevents page scroll from getting stuck in map
        cooperativeGestures: true,
      });
      mapRef.current = map;

      // Safe resize helper - guards against canvas being undefined
      const safeResize = () => {
        try {
          if (map && map.getCanvas() && mapContainer.current) {
            map.resize();
          }
        } catch (e) {
          // Ignore resize errors - map may be in an invalid state
        }
      };

      // 1. CRITICAL FIX: Watch for container resizing (fixes blank screen on mobile/load)
      resizeObserver = new ResizeObserver(() => {
        safeResize();
      });
      resizeObserver.observe(mapContainer.current);

      // Force a resize check shortly after mount
      setTimeout(safeResize, 100);

      map.on("load", () => {
        safeResize();

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
      if (typeof setupGlobeRotation === "function") {
        setupGlobeRotation(map);
      }
    } catch (error) {
      console.error("Failed to initialize embedded Mapbox map", error);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
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
      const animateDashArray = (timestamp: number) => {
        if (!map || !map.getStyle() || !map.getLayer("route-line")) return;
        const newStep = parseInt(((timestamp / 50) % dashArraySequence.length).toString());
        if (newStep !== step) {
          map.setPaintProperty("route-line", "line-dasharray", dashArraySequence[step]);
          step = newStep;
        }
        requestAnimationFrame(animateDashArray);
      };
      animateDashArray(0);
    }

    // Add destination markers
    map.addSource("destinations-embed", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: destinations.map((dest) => ({
          type: "Feature",
          properties: {
            id: dest.id,
            name: dest.name,
            country: dest.country,
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
      id: "destinations-embed-past",
      type: "circle",
      source: "destinations-embed",
      filter: ["!", ["get", "isCurrent"]],
      paint: {
        "circle-radius": 8,
        "circle-color": "#0f766e",
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    // Current destination
    map.addLayer({
      id: "destinations-embed-current",
      type: "circle",
      source: "destinations-embed",
      filter: ["get", "isCurrent"],
      paint: {
        "circle-radius": 10,
        "circle-color": "#22c55e", // Changed from #ef4444 to Green (#22c55e)
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
      },
    });

    // Cursors
    const setPointer = () => (map.getCanvas().style.cursor = "pointer");
    const setDef = () => (map.getCanvas().style.cursor = "");

    map.on("mouseenter", "destinations-embed-past", setPointer);
    map.on("mouseleave", "destinations-embed-past", setDef);
    map.on("mouseenter", "destinations-embed-current", setPointer);
    map.on("mouseleave", "destinations-embed-current", setDef);

    // Popups
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: true, maxWidth: "300px" });
    const showPopup = (e: mapboxgl.MapMouseEvent) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties as any;
      const coords = (e.features[0].geometry as any).coordinates.slice();

      const html = `
            <div style="padding: 8px;">
              <h3 style="font-weight: bold; margin-bottom: 4px; color: #0f766e;">${props.name}</h3>
              <p style="margin-bottom: 4px; font-size: 14px; color: #666;">${props.country}</p>
              ${props.isCurrent ? '<span style="display: inline-block; background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-top: 4px;">Current Location</span>' : ""}
            </div>
        `;
      popup.setLngLat(coords).setHTML(html).addTo(map);
    };

    map.on("click", "destinations-embed-past", showPopup);
    map.on("click", "destinations-embed-current", showPopup);

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    destinations.forEach((dest) => {
      bounds.extend([dest.longitude, dest.latitude]);
    });
    // Use padding but limit max zoom so single points don't zoom in too close
    map.fitBounds(bounds, { padding: 80, maxZoom: 4, duration: 1000 });
  };

  return <div ref={mapContainer} className={className} />;
};

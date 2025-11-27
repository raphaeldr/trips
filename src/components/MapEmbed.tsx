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

    // Gracefully skip map setup on browsers that don't fully support Mapbox GL (older iOS, etc.)
    if (!mapboxgl.supported({ failIfMajorPerformanceCaveat: true })) {
      console.warn("Mapbox GL not supported in this browser; skipping embedded map initialization.");
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    try {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        projection: "globe" as any,
        zoom: 1.2,
        center: [20, 20],
        pitch: 0,
      });
      mapRef.current = map;

      map.on("style.load", () => {
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
      setupGlobeRotation(map);
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

    // Small delay to ensure map is fully ready
    const timer = setTimeout(() => {
      if (map.isStyleLoaded()) {
        addDestinationsToMap(map, destinations);
      } else {
        map.once("idle", () => {
          addDestinationsToMap(map, destinations);
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [destinations, mapLoaded]);

  const addDestinationsToMap = (map: mapboxgl.Map, destinations: Destination[]) => {
    // Remove existing route layer safely
    try {
      if (map.getLayer("route-line")) {
        map.removeLayer("route-line");
      }
      if (map.getSource("route")) {
        map.removeSource("route");
      }
    } catch (error) {
      console.log("Layer cleanup skipped - style not ready");
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
        if (!map.getLayer("route-line")) return;
        const newStep = parseInt(((timestamp / 50) % dashArraySequence.length).toString());
        if (newStep !== step) {
          map.setPaintProperty("route-line", "line-dasharray", dashArraySequence[step]);
          step = newStep;
        }
        requestAnimationFrame(animateDashArray);
      }
      animateDashArray(0);
    }

    // Add destination markers as circle layers
    try {
      if (map.getSource("destinations-embed")) {
        map.removeSource("destinations-embed");
      }
    } catch (error) {
      console.log("Source cleanup skipped");
    }

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

    // Past destinations layer
    if (!map.getLayer("destinations-embed-past")) {
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
    }

    // Current destination layer
    if (!map.getLayer("destinations-embed-current")) {
      map.addLayer({
        id: "destinations-embed-current",
        type: "circle",
        source: "destinations-embed",
        filter: ["get", "isCurrent"],
        paint: {
          "circle-radius": 10,
          "circle-color": "#ef4444",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });
    }

    // Add hover cursor
    map.on("mouseenter", "destinations-embed-past", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "destinations-embed-past", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("mouseenter", "destinations-embed-current", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "destinations-embed-current", () => {
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
          ${props.isCurrent ? '<span style="display: inline-block; background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-top: 4px;">Current Location</span>' : ""}
        </div>
      `;

      popup.setLngLat(coordinates).setHTML(html).addTo(map);
    };

    map.on("click", "destinations-embed-past", showPopup);
    map.on("click", "destinations-embed-current", showPopup);

    // Fit bounds to show all destinations
    const bounds = new mapboxgl.LngLatBounds();
    destinations.forEach((dest) => {
      bounds.extend([dest.longitude, dest.latitude]);
    });
    map.fitBounds(bounds, { padding: 80, maxZoom: 4 });
  };

  return <div ref={mapContainer} className={className} />;
};

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const MAPBOX_TOKEN = "pk.eyJ1IjoicmFwaGFlbGRyIiwiYSI6ImNtaWFjbTlocDByOGsya3M0dHl6MXFqbjAifQ.DFYSs0hNaDHZaRvX3rU4WA";

interface MapEmbedProps {
  className?: string;
}

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

export const MapEmbed = ({ className = "" }: MapEmbedProps) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const destinationsRef = useRef<Destination[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Fetch destinations
  const { data: destinations } = useQuery({
    queryKey: ["destinations-embed"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("id, name, country, latitude, longitude, arrival_date, departure_date, description, is_current")
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
        style: "mapbox://styles/mapbox/standard",
        projection: "globe" as any,
        zoom: 1.2,
        center: [20, 20],
        pitch: 0,
      });
      mapRef.current = map;

      map.on("style.load", () => {
        // "Space" Atmosphere configuration
        map.setFog({
          color: "rgb(255,255,255)",
          "high-color": "rgb(200,200,225)",
          "horizon-blend": 0.2,
        });
        setMapLoaded(true);
        if (destinationsRef.current.length > 0) {
          addDestinationsToMap(map, destinationsRef.current);
        }
      });

      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
      map.scrollZoom.disable();

      // Auto-rotation Logic (Kept exactly as you had it)
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
          mapRef.current.easeTo({ center, duration: 1000, easing: (n) => n });
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
    } catch (error) {
      console.error("Failed to initialize embedded Mapbox map", error);
    }

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Add destinations when data loads
  useEffect(() => {
    destinationsRef.current = destinations || [];
    if (!mapRef.current || !mapLoaded || !destinations || destinations.length === 0) return;

    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

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
      if (map.getLayer("destinations-circles")) {
        map.removeLayer("destinations-circles");
      }
      if (map.getSource("destinations")) {
        map.removeSource("destinations");
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

    // Add destinations as a circle layer (WebGL-rendered markers)
    const features = destinations.map((d) => ({
      type: "Feature" as const,
      properties: {
        id: d.id,
        name: d.name,
        country: d.country,
        arrival_date: d.arrival_date,
        departure_date: d.departure_date,
        description: d.description,
        is_current: d.is_current,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [d.longitude, d.latitude],
      },
    }));

    map.addSource("destinations", {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });

    map.addLayer({
      id: "destinations-circles",
      type: "circle",
      source: "destinations",
      paint: {
        "circle-color": [
          "case",
          ["boolean", ["get", "is_current"], false],
          "#ef4444",
          "#0f766e",
        ],
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          2,
          4,
          6,
          8,
          10,
          12,
        ],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.9,
      },
    });

    map.on("mouseenter", "destinations-circles", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "destinations-circles", () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("click", "destinations-circles", (e) => {
      const f = e.features && e.features[0];
      if (!f) return;
      const p = f.properties as any;
      const arrival = p.arrival_date ? format(new Date(p.arrival_date), "d MMMM yyyy") : "";
      const departure = p.departure_date ? format(new Date(p.departure_date), "d MMMM yyyy") : "Present";
      const html = `
        <div style="padding: 8px;">
          <h3 style="font-weight: bold; margin-bottom: 4px; color: #0f766e;">${p.name}</h3>
          <p style="margin-bottom: 4px; font-size: 14px; color: #666;">${p.country}</p>
          <p style="font-size: 12px; color: #888; margin-bottom: 4px;">${arrival} - ${departure}</p>
          ${p.description ? `<p style=\"font-size: 13px; margin-top: 8px; color: #333;\">${p.description}</p>` : ""}
          ${p.is_current ? '<span style="display: inline-block; background: #ef4444; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; margin-top: 4px;">Current Location</span>' : ""}
        </div>
      `;
      new mapboxgl.Popup({ closeButton: false }).setLngLat(e.lngLat).setHTML(html).addTo(map);
    });

    // Fit bounds to show all destinations
    const bounds = new mapboxgl.LngLatBounds();
    destinations.forEach((dest) => {
      bounds.extend([dest.longitude, dest.latitude]);
    });
    map.fitBounds(bounds, { padding: 80, maxZoom: 4 });
  };

  return <div ref={mapContainer} className={className} />;
};

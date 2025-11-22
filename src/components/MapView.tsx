import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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

interface MapViewProps {
  className?: string;
}

export const MapView = ({ className = "" }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch destinations
  useEffect(() => {
    const fetchDestinations = async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("arrival_date", { ascending: true });

      if (data && !error) {
        setDestinations(data);
      }
      setLoading(false);
    };

    fetchDestinations();
  }, []);

  // Initialize map once the container is mounted
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      projection: "globe" as any,
      zoom: 1.5,
      center: [30, 15],
      pitch: 45,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      "top-right"
    );

    // Disable scroll zoom
    map.current.scrollZoom.disable();

    // Add atmosphere and fog
    map.current.on("style.load", () => {
      map.current?.setFog({
        color: "rgb(255, 255, 255)",
        "high-color": "rgb(200, 200, 225)",
        "horizon-blend": 0.2,
      });
    });

    // Globe rotation
    const secondsPerRevolution = 240;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    let userInteracting = false;
    let spinEnabled = true;

    function spinGlobe() {
      if (!map.current) return;
      
      const zoom = map.current.getZoom();
      if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
        let distancePerSecond = 360 / secondsPerRevolution;
        if (zoom > slowSpinZoom) {
          const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
          distancePerSecond *= zoomDif;
        }
        const center = map.current.getCenter();
        center.lng -= distancePerSecond;
        map.current.easeTo({ center, duration: 1000, easing: (n) => n });
      }
    }

    map.current.on("mousedown", () => { userInteracting = true; });
    map.current.on("dragstart", () => { userInteracting = true; });
    map.current.on("mouseup", () => { userInteracting = false; spinGlobe(); });
    map.current.on("touchend", () => { userInteracting = false; spinGlobe(); });
    map.current.on("moveend", () => { spinGlobe(); });

    spinGlobe();

    return () => {
      map.current?.remove();
    };
  }, [loading]);

  // Add markers and routes when destinations load
  useEffect(() => {
    if (!map.current || destinations.length === 0) return;

    const addMarkersAndRoutes = () => {
      if (!map.current) return;

      // Remove existing sources and layers if they exist
      if (map.current.getLayer("route-arrow")) map.current.removeLayer("route-arrow");
      if (map.current.getLayer("route")) map.current.removeLayer("route");
      if (map.current.getSource("route")) map.current.removeSource("route");

      // Add route line
      const coordinates = destinations.map(d => [Number(d.longitude), Number(d.latitude)]);
      
      map.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coordinates,
          },
        },
      });

      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#14b8a6",
          "line-width": 3,
          "line-opacity": 0.8,
        },
      });

      // Add animated line
      map.current.addLayer({
        id: "route-arrow",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 4,
          "line-opacity": 0.6,
          "line-dasharray": [0, 4, 3],
        },
      });

      // Animate the route
      let animationPhase = 0;
      const animate = () => {
        animationPhase = (animationPhase + 0.01) % 1;
        
        if (map.current && map.current.getLayer("route-arrow")) {
          map.current.setPaintProperty("route-arrow", "line-dasharray", [
            0,
            animationPhase * 7,
            7 - animationPhase * 7,
          ]);
        }
        
        requestAnimationFrame(animate);
      };
      animate();

      // Add markers
      destinations.forEach((destination) => {
        const el = document.createElement("div");
        el.className = "destination-marker";
        el.style.width = "32px";
        el.style.height = "32px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = destination.is_current ? "#ef4444" : "#14b8a6";
        el.style.border = "3px solid white";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        el.style.cursor = "pointer";
        el.style.transition = "all 0.2s";
        
        el.addEventListener("mouseenter", () => {
          el.style.transform = "scale(1.2)";
        });
        el.addEventListener("mouseleave", () => {
          el.style.transform = "scale(1)";
        });

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px; color: #0f172a;">${destination.name}</h3>
            <p style="font-size: 14px; color: #64748b; margin-bottom: 4px;">${destination.country}</p>
            <p style="font-size: 12px; color: #94a3b8;">
              ${format(new Date(destination.arrival_date), "MMM d, yyyy")}
              ${destination.departure_date ? ` - ${format(new Date(destination.departure_date), "MMM d, yyyy")}` : " - Present"}
            </p>
            ${destination.description ? `<p style="font-size: 13px; margin-top: 8px; color: #475569;">${destination.description}</p>` : ""}
            ${destination.is_current ? '<span style="display: inline-block; margin-top: 4px; padding: 2px 8px; background: #ef4444; color: white; border-radius: 12px; font-size: 11px; font-weight: 600;">CURRENT LOCATION</span>' : ""}
          </div>
        `);

        new mapboxgl.Marker(el)
          .setLngLat([Number(destination.longitude), Number(destination.latitude)])
          .setPopup(popup)
          .addTo(map.current!);
      });

      // Fit map to show all destinations
      if (coordinates.length > 0) {
        const bounds = coordinates.reduce(
          (bounds, coord) => bounds.extend(coord as [number, number]),
          new mapboxgl.LngLatBounds(coordinates[0] as [number, number], coordinates[0] as [number, number])
        );
        map.current.fitBounds(bounds, { padding: 100, maxZoom: 8 });
      }
    };

    // Check if map is already loaded
    if (map.current.loaded()) {
      addMarkersAndRoutes();
    } else {
      map.current.on("load", addMarkersAndRoutes);
    }

    return () => {
      if (map.current) {
        map.current.off("load", addMarkersAndRoutes);
      }
    };
  }, [destinations]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (destinations.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <p className="text-muted-foreground">No destinations added yet</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
};

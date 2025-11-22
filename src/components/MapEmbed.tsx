import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1IjoicmFwaGFlbGRyIiwiYSI6ImNtaWFjbTlocDByOGsya3M0dHl6MXFqbjAifQ.DFYSs0hNaDHZaRvX3rU4WA";

interface MapEmbedProps {
  className?: string;
}

export const MapEmbed = ({ className = "" }: MapEmbedProps) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      projection: "globe" as any,
      zoom: 3,
      center: [6.1296, 49.8153], // Luxembourg
      pitch: 45,
    });
    mapRef.current = map;

    map.on("style.load", () => {
      map.setFog({
        color: "rgb(255,255,255)",
        "high-color": "rgb(200,200,225)",
        "horizon-blend": 0.2,
      });
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    new mapboxgl.Marker({ color: "#0f766e" })
      .setLngLat([6.1296, 49.8153])
      .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(`<strong>Luxembourg</strong><br/>This is where we live`))
      .addTo(map);

    return () => {
      map.remove();
    };
  }, []);

  return <div ref={mapContainer} className={className} />;
};

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Navigation } from "@/components/Navigation";

const MAPBOX_TOKEN = "pk.eyJ1IjoicmFwaGFlbGRyIiwiYSI6ImNtaWFjbTlocDByOGsya3M0dHl6MXFqbjAifQ.DFYSs0hNaDHZaRvX3rU4WA"; // paste your pk. token

const Map = () => {
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

    // basic globe atmosphere
    map.on("style.load", () => {
      map.setFog({
        color: "rgb(255,255,255)",
        "high-color": "rgb(200,200,225)",
        "horizon-blend": 0.2,
      });
    });

    // simple nav controls
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");

    // one marker for Luxembourg
    new mapboxgl.Marker({ color: "#0f766e" })
      .setLngLat([6.1296, 49.8153])
      .setPopup(new mapboxgl.Popup({ offset: 12 }).setHTML(`<strong>Luxembourg</strong><br/>This is where we live`))
      .addTo(map);

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="pt-20 container mx-auto px-6 py-12">
        <header className="mb-6">
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">Journey Map</h1>
          <p className="text-muted-foreground">A simple globe view with our home base in Luxembourg.</p>
        </header>
        <section className="rounded-2xl shadow-card overflow-hidden">
          <div ref={mapContainer} className="w-full h-[600px]" />
        </section>
      </main>
    </div>
  );
};

export default Map;

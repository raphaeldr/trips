
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { useJourney } from "@/hooks/useJourney";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const Map = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { segments, currentSegment, isLoading } = useJourney();
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [0, 20], zoom: 1.5, projection: "globe" as any
    });
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !segments) return;

    map.on('load', () => {
      // Draw Lines
      const allCoords: [number, number][] = [];
      segments.forEach(seg => seg.places.forEach(p => {
        if (p.centroid_lng && p.centroid_lat) allCoords.push([p.centroid_lng, p.centroid_lat]);
      }));

      if (!map.getSource("route")) {
        map.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: allCoords } } });
        map.addLayer({ id: "route", type: "line", source: "route", paint: { "line-color": "#0f766e", "line-width": 3, "line-dasharray": [2, 2] } });
      }

      // Draw Dots
      const features = segments.flatMap(s => s.places.map(p => ({
        type: "Feature", properties: { id: p.id, title: p.name }, geometry: { type: "Point", coordinates: [p.centroid_lng, p.centroid_lat] }
      })));

      if (!map.getSource("places")) {
        map.addSource("places", { type: "geojson", data: { type: "FeatureCollection", features: features as any } });
        map.addLayer({ id: "places", type: "circle", source: "places", paint: { "circle-radius": 6, "circle-color": "#fb923c", "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });

        map.on("click", "places", (e) => {
          const id = e.features?.[0]?.properties?.id;
          setSelectedPlaceId(id);
          const coords = (e.features![0].geometry as any).coordinates;
          map.flyTo({ center: coords, zoom: 9 });
        });
        map.on("mouseenter", "places", () => map.getCanvas().style.cursor = "pointer");
        map.on("mouseleave", "places", () => map.getCanvas().style.cursor = "");
      }
    });
  }, [segments]);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex h-screen">
      <div className="w-80 bg-white border-r p-6 overflow-y-auto z-10">
        <h1 className="text-2xl font-bold mb-4">My Journey</h1>
        {currentSegment && <Badge className="mb-6 bg-green-100 text-green-800">In {currentSegment.country}</Badge>}
        <div className="space-y-6 border-l-2 border-gray-100 ml-3 pl-6">
          {segments?.map(seg => (
            <div key={seg.id} className="relative">
              <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-gray-900" />
              <h3 className="font-bold">{seg.name}</h3>
              <div className="text-sm text-gray-500 mb-2">{seg.start_date ? format(new Date(seg.start_date), 'MMM yyyy') : 'Planned'}</div>
              <div className="space-y-2">
                {seg.places.map(p => (
                  <div key={p.id} onClick={() => {
                    setSelectedPlaceId(p.id);
                    mapRef.current?.flyTo({ center: [p.centroid_lng!, p.centroid_lat!], zoom: 9 });
                  }} className={`p-2 text-sm rounded cursor-pointer ${selectedPlaceId === p.id ? 'bg-orange-50 text-orange-700' : 'hover:bg-gray-50'}`}>
                    {p.name} <span className="text-gray-400 text-xs">({p.media.length})</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 relative"><div ref={mapContainer} className="absolute inset-0" /></div>
    </div>
  );
};
export default Map;
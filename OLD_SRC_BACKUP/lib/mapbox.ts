export const MAPBOX_TOKEN = "pk.eyJ1IjoicmFwaGFlbGRyIiwiYSI6ImNtaWFjbTlocDByOGsya3M0dHl6MXFqbjAifQ.DFYSs0hNaDHZaRvX3rU4WA";

export const MAP_CONFIG = {
  globe: {
    secondsPerRevolution: 240,
    maxSpinZoom: 5,
    slowSpinZoom: 3,
  },
  fog: {
    color: "rgb(255, 255, 255)",
    highColor: "rgb(200, 200, 225)",
    horizonBlend: 0.2,
  },
  spaceFog: {
    color: "rgb(186, 210, 235)",
    highColor: "rgb(36, 92, 223)",
    horizonBlend: 0.02,
    spaceColor: "rgb(11, 11, 25)",
    starIntensity: 0.6,
  },
  route: {
    color: "#0f766e",
    width: 3,
    dashArray: [2, 2],
  },
  markers: {
    current: "#ef4444",
    past: "#0f766e",
    size: 24,
    borderColor: "white",
    borderWidth: 2,
  },
};

export function setupGlobeRotation(
  map: mapboxgl.Map,
  config = MAP_CONFIG.globe
) {
  let userInteracting = false;
  
  function spinGlobe() {
    if (!map) return;
    const zoom = map.getZoom();
    if (!userInteracting && zoom < config.maxSpinZoom) {
      let distancePerSecond = 360 / config.secondsPerRevolution;
      if (zoom > config.slowSpinZoom) {
        const zoomDif = (config.maxSpinZoom - zoom) / (config.maxSpinZoom - config.slowSpinZoom);
        distancePerSecond *= zoomDif;
      }
      const center = map.getCenter();
      center.lng -= distancePerSecond;
      map.easeTo({ center, duration: 1000, easing: (n) => n });
    }
  }

  map.on("mousedown", () => { userInteracting = true; });
  map.on("dragstart", () => { userInteracting = true; });
  map.on("mouseup", () => { userInteracting = false; spinGlobe(); });
  map.on("touchend", () => { userInteracting = false; spinGlobe(); });
  map.on("moveend", () => { spinGlobe(); });

  spinGlobe();
}

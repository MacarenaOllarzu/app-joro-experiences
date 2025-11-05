import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface ObjectiveMapProps {
  items: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    completed: boolean;
  }>;
}

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const ObjectiveMap = ({ items }: ObjectiveMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || items.length === 0) return;

    // Initialize map
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapContainer.current).setView([0, 0], 2);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapInstance.current);
    }

    // Clear existing markers
    mapInstance.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        layer.remove();
      }
    });

    // Add markers for each item
    const bounds: L.LatLngBoundsExpression = [];
    items.forEach((item) => {
      if (item.latitude && item.longitude) {
        const marker = L.marker([item.latitude, item.longitude])
          .addTo(mapInstance.current!)
          .bindPopup(item.name);
        
        bounds.push([item.latitude, item.longitude]);
      }
    });

    // Fit map to show all markers
    if (bounds.length > 0) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [items]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-[400px] rounded-lg border border-border"
    />
  );
};

export default ObjectiveMap;

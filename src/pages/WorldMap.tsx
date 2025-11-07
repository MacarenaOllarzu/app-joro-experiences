
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface VisitedPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  objective_title: string;
}

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const WorldMap = () => {
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadVisitedPlaces();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (visitedPlaces.length > 0 && mapContainer.current && !mapInstance.current) {
      initializeMap();
    }
  }, [visitedPlaces]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadVisitedPlaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: progressData } = await supabase
        .from("user_progress")
        .select("objective_item_id")
        .eq("user_id", user.id);

      if (!progressData || progressData.length === 0) {
        setLoading(false);
        return;
      }

      const itemIds = progressData.map((p) => p.objective_item_id);

      const { data: itemsData } = await supabase
        .from("objective_items")
        .select(`
          id,
          name,
          latitude,
          longitude,
          objective:objectives (
            title
          )
        `)
        .in("id", itemIds);

      if (itemsData) {
        const places = itemsData.map((item: any) => ({
          id: item.id,
          name: item.name,
          latitude: item.latitude,
          longitude: item.longitude,
          objective_title: item.objective?.title || "Sin objetivo",
        }));
        setVisitedPlaces(places);
      }
    } catch (error) {
      console.error("Error loading visited places:", error);
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!mapContainer.current) return;

    mapInstance.current = L.map(mapContainer.current).setView([0, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    // Custom icon for visited places
    const visitedIcon = L.icon({
      iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const bounds: L.LatLngBoundsExpression = [];

    visitedPlaces.forEach((place) => {
      if (place.latitude && place.longitude) {
        const marker = L.marker([place.latitude, place.longitude], {
          icon: visitedIcon,
        })
          .addTo(mapInstance.current!)
          .bindPopup(`
            <div style="text-align: center;">
              <strong>${place.name}</strong>
              <br/>
              <span style="font-size: 0.85em; color: #666;">${place.objective_title}</span>
            </div>
          `);

        bounds.push([place.latitude, place.longitude]);
      }
    });

    if (bounds.length > 0) {
      mapInstance.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <AppHeader title="Mapa Mundial" />
        <main className="max-w-6xl mx-auto p-4">
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Cargando mapa...</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Mapa Mundial" />

      <main className="max-w-6xl mx-auto p-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Tus lugares visitados</h2>
          <p className="text-sm text-muted-foreground">
            {visitedPlaces.length === 0
              ? "Aún no has visitado ningún lugar"
              : `Has visitado ${visitedPlaces.length} ${
                  visitedPlaces.length === 1 ? "lugar" : "lugares"
                }`}
          </p>
        </div>

        {visitedPlaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-lg">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold mb-2">Sin lugares visitados</h3>
            <p className="text-muted-foreground mb-6">
              Comienza a explorar objetivos y marca lugares como visitados
            </p>
          </div>
        ) : (
          <div
            ref={mapContainer}
            className="w-full h-[calc(100vh-280px)] min-h-[400px] rounded-lg border border-border shadow-lg"
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default WorldMap;

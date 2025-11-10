import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  category_name: string;
}

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const WorldMap = () => {
  const { id } = useParams(); // puede ser "me" o un userId real
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);


  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  const navigate = useNavigate();

  // ✅ Determinar CUÁL usuario mostrar (tú o alguien más)
  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id || null;

      if (!uid) return;

      if (id === "me") {
        setCurrentUserId(uid); // tu mapa
      } else {
        setCurrentUserId(id || uid); // mapa de otra persona
      }
    }

    loadUser();
  }, [id]);

  // ✅ Forzar login obligatorio
  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  // ✅ Cargar lugares visitados del usuario correcto
  const loadVisitedPlaces = async () => {
    try {
      if (!currentUserId) return;

      const { data: progressData } = await supabase
        .from("user_progress")
        .select("objective_item_id")
        .eq("user_id", currentUserId);

      if (!progressData || progressData.length === 0) {
        setVisitedPlaces([]);
        return;
      }

      const itemIds = progressData.map((p) => p.objective_item_id);

      const { data: itemsData, error } = await supabase
        .from("objective_items")
        .select(`
          id,
          name,
          latitude,
          longitude,
          objective:objectives (
            title,
            category:categories (
              name
            )
          )
        `)
        .in("id", itemIds);

      if (error) {
        console.error("Error fetching items:", error);
        return;
      }

      if (itemsData) {
        const places = itemsData.map((item: any) => ({
          id: item.id,
          name: item.name,
          latitude: item.latitude,
          longitude: item.longitude,
          objective_title: item.objective?.title || "Sin objetivo",
          category_name: item.objective?.category?.name || "Desconocido",
        }));

        setVisitedPlaces(places);
      }
    } catch (error) {
      console.error("Error loading visited places:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Cargar mapa cuando ya sabemos el usuario
  useEffect(() => {
    checkAuth();

    if (currentUserId) {
      loadVisitedPlaces();
    }

    // limpiar el mapa al salir
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [currentUserId]);

  // ✅ Revisar si el mapa del usuario es público
  useEffect(() => {
    async function checkMapPrivacy() {
      if (!currentUserId) return;

      // Cargar el perfil del usuario que estamos viendo
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_map_public")
        .eq("id", currentUserId)
        .single();

      // Si el mapa es privado y NO es mi propio mapa → bloquear
      if (!profileData?.is_map_public && id !== "me") {
        setIsPrivate(true);
        setLoading(false);
        setVisitedPlaces([]);
      }
    }

    checkMapPrivacy();
  }, [currentUserId, id]);


  // ✅ Inicializar mapa cuando ya tenemos lugares
  useEffect(() => {
    if (visitedPlaces.length > 0 && mapContainer.current && !mapInstance.current) {
      initializeMap();
    }
  }, [visitedPlaces]);

  const initializeMap = () => {
    if (!mapContainer.current) return;

    mapInstance.current = L.map(mapContainer.current).setView([0, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    // Íconos por categoría
    const iconsByCategory: Record<string, L.Icon> = {
      pais: L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
      region: L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
      parque: L.icon({
        iconUrl:
          "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    };

    const bounds: L.LatLngBoundsExpression = [];

    visitedPlaces.forEach((place) => {
      if (place.latitude && place.longitude) {
        const normalizedCategory = place.category_name
          ?.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        const category = normalizedCategory?.replace(/es$|s$/, "") || "parque";
        const icon = iconsByCategory[category] || iconsByCategory.parque;

        const displayCategory =
          category === "pais"
            ? "País"
            : category === "region"
            ? "Región"
            : "Parque";

        L.marker([place.latitude, place.longitude], { icon })
          .addTo(mapInstance.current!)
          .bindPopup(`
            <strong>${place.name}</strong><br/>
            <span style="font-size: 0.85em; color: #666;">
              ${place.objective_title} (${displayCategory})
            </span>
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
        <AppHeader title="Mapa Mundial" showBack />
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
      <AppHeader title="Mapa Mundial" showBack />

      <main className="max-w-6xl mx-auto p-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold mb-2">Lugares visitados</h2>
          <p className="text-sm text-muted-foreground">
            {visitedPlaces.length === 0
              ? "Aún no hay lugares visitados"
              : `Este usuario ha visitado ${visitedPlaces.length} ${
                  visitedPlaces.length === 1 ? "lugar" : "lugares"
                }`}
          </p>
        </div>

      {isPrivate ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-lg">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold mb-2">Mapa privado</h3>
          <p className="text-muted-foreground mb-6">
            Este usuario mantiene su mapa como privado.
          </p>
        </div>
      ) : visitedPlaces.length === 0 ? (

          <div className="flex flex-col items-center justify-center py-20 text-center bg-card border border-border rounded-lg">
            <div className="text-6xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold mb-2">Sin lugares registrados</h3>
            <p className="text-muted-foreground mb-6">
              Este usuario aún no ha marcado ningún lugar como visitado.
            </p>
          </div>
        ) : (
          <>
            {/* Leyenda */}
            <div className="flex justify-center gap-6 mb-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png" className="w-4 h-4" />
                <span>Países</span>
              </div>
              <div className="flex items-center gap-2">
                <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png" className="w-4 h-4" />
                <span>Regiones</span>
              </div>
              <div className="flex items-center gap-2">
                <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png" className="w-4 h-4" />
                <span>Parques</span>
              </div>
            </div>
            {/*Mapa*/}
            <div
              ref={mapContainer}
              className="w-full h-[calc(100vh-320px)] min-h-[400px] rounded-lg border border-border shadow-lg"
            /> 
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default WorldMap;

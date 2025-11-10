import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserObjective {
  id: string;
  added_at: string;
  objective: {
    id: string;
    title: string;
    total_items: number;
    image_url: string;
    category_id: string;
  };
  completedCount: number;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

type SortOption = "name" | "progress" | "recent";

const Dashboard = () => {
  const [userObjectives, setUserObjectives] = useState<UserObjective[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // ✅ Normalizar texto para búsqueda sin tildes
  const normalizeText = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  useEffect(() => {
    checkAuth();
    loadCategories();
    loadUserObjectives();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const loadCategories = async () => {
    try {
      const { data } = await supabase.from("categories").select("*").order("name");
      if (data) setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const loadUserObjectives = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: objectives } = await supabase
        .from("user_objectives")
        .select(`
          id,
          added_at,
          objective:objectives (
            id,
            title,
            total_items,
            image_url,
            category_id
          )
        `)
        .eq("user_id", user.id);

      if (objectives) {
        const objectivesWithProgress = await Promise.all(
          objectives.map(async (obj: any) => {
            const { count } = await supabase
              .from("user_progress")
              .select("*", { count: "exact", head: true })
              .eq("user_id", user.id)
              .in(
                "objective_item_id",
                (
                  await supabase
                    .from("objective_items")
                    .select("id")
                    .eq("objective_id", obj.objective.id)
                ).data?.map((item) => item.id) || []
              );

            return { ...obj, completedCount: count || 0 };
          })
        );

        setUserObjectives(objectivesWithProgress);
      }
    } catch (error) {
      console.error("Error loading objectives:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Filtrado sin tildes
  const nq = normalizeText(searchQuery);

  const filteredObjectives = userObjectives.filter((obj) => {
    const title = normalizeText(obj.objective.title);
    return title.includes(nq);
  });

  const getSortedObjectives = () => {
    const sorted = [...filteredObjectives];
    switch (sortBy) {
      case "name":
        return sorted.sort((a, b) => a.objective.title.localeCompare(b.objective.title));
      case "progress":
        return sorted.sort((a, b) => {
          const pa = (a.completedCount / a.objective.total_items) * 100;
          const pb = (b.completedCount / b.objective.total_items) * 100;
          return pb - pa;
        });
      case "recent":
      default:
        return sorted.sort(
          (a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime()
        );
    }
  };

  const getObjectivesByCategory = () => {
    const sorted = getSortedObjectives();
    const grouped = new Map<string, UserObjective[]>();

    sorted.forEach((obj) => {
      const categoryId = obj.objective.category_id;
      if (!grouped.has(categoryId)) grouped.set(categoryId, []);
      grouped.get(categoryId)!.push(obj);
    });

    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Cargando...
      </div>
    );
  }

  const groupedObjectives = getObjectivesByCategory();

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader />

      <main className="max-w-lg mx-auto px-4 py-6">

        {/* ✅ Fila 1: Título + Ordenamiento */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Mis objetivos</h2>

          {userObjectives.length > 0 && (
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Ordenar..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recientes</SelectItem>
                <SelectItem value="name">Nombre</SelectItem>
                <SelectItem value="progress">Progreso</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* ✅ Fila 2: Barra de búsqueda con ícono */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar objetivos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {filteredObjectives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">😢</div>
            <p className="text-xl font-semibold mb-6">No se encontraron objetivos</p>
            <Button onClick={() => navigate("/explore")} className="bg-primary">
              Explorar
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(groupedObjectives.entries()).map(([categoryId, objectives]) => {
              const category = categories.find((c) => c.id === categoryId);

              return (
                <div key={categoryId}>
                  <div className="flex items-center gap-2 mb-4">
                    {category?.icon && <span className="text-2xl">{category.icon}</span>}
                    <h3 className="text-lg font-semibold">{category?.name || "Sin categoría"}</h3>
                    <span className="text-sm text-muted-foreground">
                      ({objectives.length})
                    </span>
                  </div>

                  <div className="space-y-3">
                    {objectives.map((userObj) => {
                      const progress =
                        (userObj.completedCount / userObj.objective.total_items) * 100;

                      return (
                        <button
                          key={userObj.id}
                          onClick={() => navigate(`/objective/${userObj.objective.id}`)}
                          className="w-full bg-card border border-border rounded-2xl p-4 hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-4">
                            <img
                              src={userObj.objective.image_url}
                              alt={userObj.objective.title}
                              className="w-16 h-16 rounded-xl object-cover"
                            />

                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold mb-2">{userObj.objective.title}</h3>

                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <Progress value={progress} className="h-2 flex-1" />
                                  <span className="text-sm font-semibold text-primary min-w-[3rem] text-right">
                                    {Math.round(progress)}%
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {userObj.completedCount} de {userObj.objective.total_items} lugares
                                </p>
                              </div>
                            </div>

                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;


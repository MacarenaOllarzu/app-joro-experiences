import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronRight } from "lucide-react";

interface UserObjective {
  id: string;
  objective: {
    id: string;
    title: string;
    total_items: number;
    image_url: string;
  };
  completedCount: number;
}

const Dashboard = () => {
  const [userObjectives, setUserObjectives] = useState<UserObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    loadUserObjectives();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
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
          objective:objectives (
            id,
            title,
            total_items,
            image_url
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

            return {
              ...obj,
              completedCount: count || 0,
            };
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader />
      
      <main className="max-w-lg mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-6">Objetivos</h2>

        {userObjectives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">😢</div>
            <p className="text-xl font-semibold mb-6">No tienes objetivos</p>
            <Button
              onClick={() => navigate("/explore")}
              className="bg-primary text-primary-foreground"
            >
              Explorar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {userObjectives.map((userObj) => {
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
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">
                        {userObj.objective.title}
                      </h3>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2 mb-1">
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
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;

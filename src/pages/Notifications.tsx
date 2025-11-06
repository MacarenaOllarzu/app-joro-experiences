import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { CheckCircle2, MapPin } from "lucide-react";

interface Activity {
  id: string;
  activity_type: string;
  objective_id: string;
  objective_title: string;
  item_name: string | null;
  created_at: string;
}

const Notifications = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadActivities();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("activity_feed")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      if (data) setActivities(data);
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityMessage = (activity: Activity) => {
    if (activity.activity_type === "completed_objective") {
      return `Has completado el objetivo de ${activity.objective_title}`;
    } else if (activity.activity_type === "visited_place") {
      return `Has visitado ${activity.item_name} de ${activity.objective_title}`;
    }
    return "";
  };

  const getActivityIcon = (activity: Activity) => {
    if (activity.activity_type === "completed_objective") {
      return <CheckCircle2 className="w-5 h-5 text-primary" />;
    }
    return <MapPin className="w-5 h-5 text-primary" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Hace un momento";
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "Hace 1 día";
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <AppHeader title="Actividad" />
        <main className="max-w-lg mx-auto p-4">
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Actividad" />
      
      <main className="max-w-lg mx-auto p-4">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold mb-2">Sin actividad</h2>
            <p className="text-muted-foreground">
              Aquí aparecerán tus logros y lugares visitados
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                onClick={() => navigate(`/objective/${activity.objective_id}`)}
                className="flex gap-3 p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <div className="shrink-0 mt-0.5">
                  {getActivityIcon(activity)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-relaxed">
                    {getActivityMessage(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(activity.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Notifications;

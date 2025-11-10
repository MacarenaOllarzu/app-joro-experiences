import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { CheckCircle2, MapPin, Award, UserPlus } from "lucide-react";

type Activity = {
  id: string;
  user_id: string;
  activity_type: "visited_place" | "completed_objective" | "new_follower";
  objective_id: string | null;
  objective_title: string | null;
  objective_item_id: string | null; // lo usamos para guardar follower_id en new_follower
  item_name: string | null; // nombre del lugar o del seguidor (new_follower)
  created_at: string;
};

function formatRel(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffH = Math.floor((now.getTime() - date.getTime()) / 36e5);
  if (diffH < 1) return "Hace un momento";
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Hace 1 día";
  if (diffD < 7) return `Hace ${diffD} días`;
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

const Notifications = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("activity_feed")
        .select("*")
        .eq("user_id", sess.session.user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!error && data) setActivities(data as Activity[]);
      setLoading(false);
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of activities) {
      const k = dayKey(a.created_at);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(a);
    }
    // orden por día descendente ya viene por created_at desc
    return Array.from(map.entries());
  }, [activities]);

  const headerFor = (key: string) => {
    const day = new Date(key);
    const today = new Date();
    const yday = new Date();
    yday.setDate(today.getDate() - 1);

    const isSame = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    if (isSame(day, today)) return "Hoy";
    if (isSame(day, yday)) return "Ayer";
    return day.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const iconFor = (a: Activity) => {
    if (a.activity_type === "completed_objective")
      return <Award className="w-5 h-5 text-primary" />;
    if (a.activity_type === "new_follower")
      return <UserPlus className="w-5 h-5 text-primary" />;
    return <MapPin className="w-5 h-5 text-primary" />;
  };

  const textFor = (a: Activity) => {
    switch (a.activity_type) {
      case "completed_objective":
        return `Has completado el objetivo de ${a.objective_title}`;
      case "visited_place":
        // igual que antes
        return `Has visitado ${a.item_name} de ${a.objective_title}`;
      case "new_follower":
        // usamos item_name para el nombre del seguidor
        return `${a.item_name ?? "Alguien"} te empezó a seguir`;
      default:
        return "";
    }
  };

  const onClickRow = (a: Activity) => {
    if (a.activity_type === "new_follower") return; // no hay destino
    if (a.objective_id) navigate(`/objective/${a.objective_id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <AppHeader title="Actividad" />
        <main className="max-w-lg mx-auto p-4">
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            Cargando…
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
            <p className="text-muted-foreground">Aquí aparecerán tus notificaciones</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([k, items]) => (
              <section key={k} className="space-y-2">
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground px-1">
                  {headerFor(k)}
                </h3>
                {items.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => onClickRow(a)}
                    className="flex gap-3 p-4 bg-card border border-border rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  >
                    <div className="shrink-0 mt-0.5">{iconFor(a)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-relaxed">{textFor(a)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRel(a.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default Notifications;

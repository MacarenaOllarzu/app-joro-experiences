import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlaceDetailDialog } from "@/components/PlaceDetailDialog";
import ObjectiveMap from "@/components/ObjectiveMap";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ObjectiveItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  order_index: number;
  completed: boolean;
}

interface Objective {
  id: string;
  title: string;
  description: string;
  image_url: string;
  total_items: number;
}

const ObjectiveDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [objective, setObjective] = useState<Objective | null>(null);
  const [items, setItems] = useState<ObjectiveItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ObjectiveItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasObjective, setHasObjective] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPlace, setSelectedPlace] = useState<ObjectiveItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    loadObjective();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const loadObjective = async () => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: objData } = await supabase
        .from("objectives")
        .select("*")
        .eq("id", id)
        .single();

      if (objData) {
        setObjective(objData);

        const { data: userObj } = await supabase
          .from("user_objectives")
          .select("id")
          .eq("user_id", user.id)
          .eq("objective_id", id)
          .maybeSingle();

        setHasObjective(!!userObj);

        const { data: itemsData } = await supabase
          .from("objective_items")
          .select("*")
          .eq("objective_id", id)
          .order("name");

        if (itemsData) {
          const { data: progressData } = await supabase
            .from("user_progress")
            .select("objective_item_id")
            .eq("user_id", user.id)
            .in("objective_item_id", itemsData.map(i => i.id));

          const completedIds = new Set(progressData?.map(p => p.objective_item_id) || []);

          const mappedItems = itemsData.map(item => ({
            ...item,
            completed: completedIds.has(item.id)
          }));

          setItems(mappedItems);
          setFilteredItems(mappedItems);
        }
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredItems(items);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredItems(items.filter(i => i.name.toLowerCase().includes(q)));
    }
  }, [searchQuery, items]);


  // ✅ CORRECCIÓN PRINCIPAL 1:
  // AL ELIMINAR UN OBJETIVO → BORRAR TODAS SUS NOTIFICACIONES
  const handleAddObjective = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;

      if (hasObjective) {
        // Delete objective
        await supabase
          .from("user_objectives")
          .delete()
          .eq("user_id", user.id)
          .eq("objective_id", id);

        // Delete progress
        const itemIds = items.map(i => i.id);

        await supabase
          .from("user_progress")
          .delete()
          .eq("user_id", user.id)
          .in("objective_item_id", itemIds);

        // ✅ BORRAR visited_place
        await supabase
          .from("activity_feed")
          .delete()
          .match({
            user_id: user.id,
            activity_type: "visited_place",
            objective_id: id
          });

        // ✅ BORRAR completed_objective
        await supabase
          .from("activity_feed")
          .delete()
          .match({
            user_id: user.id,
            activity_type: "completed_objective",
            objective_id: id
          });

        toast({
          title: "Objetivo eliminado",
          description: "Tu progreso y notificaciones fueron eliminados"
        });

        setHasObjective(false);
        setItems(prev => prev.map(i => ({ ...i, completed: false })));

      } else {
        await supabase.from("user_objectives").insert({
          user_id: user.id,
          objective_id: id
        });

        toast({
          title: "¡Objetivo agregado!",
          description: "Ahora puedes marcar los lugares que visites"
        });

        setHasObjective(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };


  // ✅ CORRECCIÓN PRINCIPAL 2:
  // Delete de completed_objective simplificado
  const handleToggleItem = async (itemId: string, completed: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!hasObjective) {
        toast({
          title: "Agrega el objetivo primero",
          description: "Debes agregar el objetivo antes de marcar lugares",
          variant: "destructive"
        });
        return;
      }

      if (completed) {
        // UNDO visited_place
        await supabase
          .from("user_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("objective_item_id", itemId);

        await supabase
          .from("activity_feed")
          .delete()
          .match({
            user_id: user.id,
            objective_item_id: itemId,
            activity_type: "visited_place"
          });

      } else {
        // ADD visited_place
        await supabase.from("user_progress").insert({
          user_id: user.id,
          objective_item_id: itemId
        });

        const item = items.find(i => i.id === itemId);
        if (item && objective) {
          await supabase.from("activity_feed").insert({
            user_id: user.id,
            activity_type: "visited_place",
            objective_id: objective.id,
            objective_item_id: itemId,
            objective_title: objective.title,
            item_name: item.name
          });
        }
      }

      // update local state
      const updatedItems = items.map(i =>
        i.id === itemId ? { ...i, completed: !completed } : i
      );
      setItems(updatedItems);

      const completedCount = updatedItems.filter(i => i.completed).length;

      // Objective completed
      if (!completed && objective && completedCount === objective.total_items) {
        await supabase.from("activity_feed").insert({
          user_id: user.id,
          activity_type: "completed_objective",
          objective_id: objective.id,
          objective_item_id: objective.id,
          objective_title: objective.title,
          item_name: null
        });

        toast({
          title: "¡Objetivo completado! 🎉",
          description: `Has completado ${objective.title}`
        });
      }

      // ✅ CORRECCIÓN: delete simple y seguro
      if (completed && objective && completedCount < objective.total_items) {
        await supabase
          .from("activity_feed")
          .delete()
          .match({
            user_id: user.id,
            objective_id: objective.id,
            activity_type: "completed_objective"
          });
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Cargando...
      </div>
    );
  }

  if (!objective) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Objetivo no encontrado
      </div>
    );
  }

  const completedCount = items.filter(i => i.completed).length;
  const allCompleted = items.length > 0 && items.every(i => i.completed);
  const progress = (completedCount / objective.total_items) * 100;

  const handleMarkAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !objective) return;

      if (!hasObjective) {
        toast({
          title: "Primero agrega el objetivo",
          description: "Debes agregar este objetivo antes de marcar lugares",
          variant: "destructive",
        });
        return;
      }

      // ✅ Caso 1: DESMARCAR TODO
      if (allCompleted) {

        const itemIds = items.map(i => i.id);

        // Borrar progresos
        await supabase
          .from("user_progress")
          .delete()
          .eq("user_id", user.id)
          .in("objective_item_id", itemIds);

        // Borrar visited_place
        await supabase
          .from("activity_feed")
          .delete()
          .match({
            user_id: user.id,
            activity_type: "visited_place",
            objective_id: objective.id
          });

        // Borrar completed_objective
        await supabase
          .from("activity_feed")
          .delete()
          .match({
            user_id: user.id,
            activity_type: "completed_objective",
            objective_id: objective.id
          });

        // Actualizar estado local
        const newItems = items.map(i => ({ ...i, completed: false }));
        setItems(newItems);
        setFilteredItems(newItems);

        toast({
          title: "Todo desmarcado",
          description: "Se desmarcaron todos los lugares",
        });

        return;
      }

      // ✅ Caso 2: MARCAR TODO
      const pending = items.filter(i => !i.completed);

      if (pending.length === 0) return;

      // user_progress
      const inserts = pending.map(i => ({
        user_id: user.id,
        objective_item_id: i.id
      }));
      await supabase.from("user_progress").insert(inserts);

      // activity_feed
      const feed = pending.map(i => ({
        user_id: user.id,
        activity_type: "visited_place",
        objective_id: objective.id,
        objective_item_id: i.id,
        objective_title: objective.title,
        item_name: i.name
      }));
      await supabase.from("activity_feed").insert(feed);

      // actualizar estado local
      const updated = items.map(i => ({ ...i, completed: true }));
      setItems(updated);
      setFilteredItems(updated);

      // completed_objective si corresponde
      if (updated.every(i => i.completed)) {
        await supabase.from("activity_feed").insert({
          user_id: user.id,
          activity_type: "completed_objective",
          objective_id: objective.id,
          objective_item_id: objective.id,
          objective_title: objective.title,
          item_name: null
        });
      }

      toast({
        title: "Listo ✅",
        description: "Se marcaron todos los lugares",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };



  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader
        title={objective.title}
        showBack
        action={<div className="text-sm font-semibold text-primary">{Math.round(progress)}%</div>}
      />

      <main className="max-w-lg mx-auto">
        <div className="relative h-64 border-b border-border">
          <img
            src={objective.image_url}
            alt={objective.title}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-4">
          {!hasObjective ? (
            <>
              <h2 className="text-xl font-semibold mb-2">Sobre este objetivo</h2>

              <p className="text-muted-foreground mb-6">
                {objective.description}
              </p>

              {items.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold mb-3">Mapa de lugares</h3>
                  <ObjectiveMap items={items} />
                </>
              )}

              <Button
                onClick={handleAddObjective}
                className="w-full bg-primary text-primary-foreground"
                size="lg"
              >
                Agregar objetivo
              </Button>
            </>
          ) : (
            <>
              <div className="flex gap-2 mb-6">
                {/* Información */}
                <Button onClick={() => setSummaryDialogOpen(true)} variant="outline" className="flex-1">
                  <Info className="w-4 h-4 mr-2" />
                  Información
                </Button>

                {/* ✅ Nuevo botón: Marcar todo */}
                <Button onClick={handleMarkAll} variant="outline" className="flex-1">
                  {allCompleted ? "Desmarcar todo" : "Marcar todo"}
                </Button>

                {/* Eliminar */}
                <Button onClick={handleAddObjective} variant="outline" className="flex-1">
                  Eliminar objetivo
                </Button>
              </div>


              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar lugares..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1">
                {filteredItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No se encontraron lugares
                  </p>
                ) : (
                  filteredItems.map((item) => (
                    <div key={item.id} className="flex gap-2">
                      <button
                        onClick={() => handleToggleItem(item.id, item.completed)}
                        className="flex-1 flex items-center gap-3 p-4 hover:bg-muted rounded-lg transition-colors"
                      >
                        <Checkbox checked={item.completed} className="pointer-events-none" />
                        <span className={item.completed ? "line-through text-muted-foreground" : ""}>
                          {item.name}
                        </span>
                      </button>
                      <Button
                        onClick={() => {
                          setSelectedPlace(item);
                          setDialogOpen(true);
                        }}
                        variant="outline"
                        size="icon"
                        className="shrink-0"
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>

      <BottomNav />

      <PlaceDetailDialog
        place={selectedPlace}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onToggle={handleToggleItem}
      />

      <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{objective.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <p className="text-muted-foreground">{objective.description}</p>

            {items.length > 0 && (
              <>
                <h3 className="text-lg font-semibold mb-3">Mapa de lugares</h3>
                <ObjectiveMap items={items} />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ObjectiveDetail;

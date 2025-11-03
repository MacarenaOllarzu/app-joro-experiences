import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChevronRight, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlaceDetailDialog } from "@/components/PlaceDetailDialog";

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

  useEffect(() => {
    checkAuth();
    loadObjective();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
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
          .order("order_index");

        if (itemsData) {
          const { data: progressData } = await supabase
            .from("user_progress")
            .select("objective_item_id")
            .eq("user_id", user.id)
            .in("objective_item_id", itemsData.map((item) => item.id));

          const completedIds = new Set(
            progressData?.map((p) => p.objective_item_id) || []
          );

          const mappedItems = itemsData.map((item) => ({
            ...item,
            completed: completedIds.has(item.id),
          }));
          setItems(mappedItems);
          setFilteredItems(mappedItems);
        }
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredItems(items);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredItems(
        items.filter((item) => item.name.toLowerCase().includes(query))
      );
    }
  }, [searchQuery, items]);

  const handleAddObjective = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !id) return;

      if (hasObjective) {
        const { error } = await supabase
          .from("user_objectives")
          .delete()
          .eq("user_id", user.id)
          .eq("objective_id", id);

        if (error) throw error;

        toast({
          title: "Objetivo eliminado",
          description: "El objetivo ha sido eliminado de tu lista",
        });
        setHasObjective(false);
      } else {
        const { error } = await supabase.from("user_objectives").insert({
          user_id: user.id,
          objective_id: id,
        });

        if (error) throw error;

        toast({
          title: "¡Objetivo agregado!",
          description: "El objetivo ha sido agregado a tu lista",
        });
        setHasObjective(true);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!hasObjective) {
        await handleAddObjective();
      }

      if (completed) {
        const { error } = await supabase
          .from("user_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("objective_item_id", itemId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_progress").insert({
          user_id: user.id,
          objective_item_id: itemId,
        });

        if (error) throw error;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, completed: !completed } : item
        )
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Cargando...</div>
      </div>
    );
  }

  if (!objective) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Objetivo no encontrado</div>
      </div>
    );
  }

  const completedCount = items.filter((item) => item.completed).length;
  const progress = (completedCount / objective.total_items) * 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader
        title={objective.title}
        showBack
        action={
          <div className="text-sm font-semibold text-primary">
            {Math.round(progress)}%
          </div>
        }
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
          <Button
            onClick={handleAddObjective}
            className="w-full bg-primary text-primary-foreground mb-6"
          >
            {hasObjective ? "Eliminar objetivo" : "Agregar objetivo"}
          </Button>

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
                  <button
                    onClick={() => {
                      setSelectedPlace(item);
                      setDialogOpen(true);
                    }}
                    className="p-4 hover:bg-muted rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <BottomNav />
      
      <PlaceDetailDialog
        place={selectedPlace}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onToggle={handleToggleItem}
      />
    </div>
  );
};

export default ObjectiveDetail;

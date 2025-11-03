import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapPin, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlaceDetailDialogProps {
  place: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    completed: boolean;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (itemId: string, completed: boolean) => Promise<void>;
}

export const PlaceDetailDialog = ({
  place,
  open,
  onOpenChange,
  onToggle,
}: PlaceDetailDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  if (!place) return null;

  const handleToggle = async () => {
    setLoading(true);
    try {
      await onToggle(place.id, place.completed);
      toast({
        title: place.completed ? "Desmarcado" : "¡Visitado!",
        description: place.completed
          ? "Lugar desmarcado"
          : "Has marcado este lugar como visitado",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el lugar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const mapUrl = `https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=12/${place.latitude}/${place.longitude}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{place.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Map Preview */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border">
            <iframe
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${place.longitude - 0.1},${place.latitude - 0.1},${place.longitude + 0.1},${place.latitude + 0.1}&marker=${place.latitude},${place.longitude}`}
              className="w-full h-full"
              title={`Mapa de ${place.name}`}
            />
          </div>

          {/* Location Info */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">Ubicación</p>
              <p className="text-xs text-muted-foreground">
                {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
              </p>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-1 inline-block"
              >
                Ver en OpenStreetMap →
              </a>
            </div>
          </div>

          {/* Description placeholder */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Explora este increíble lugar y marca cuando lo visites para seguir
              tu progreso.
            </p>
          </div>

          {/* Action Button */}
          <Button
            onClick={handleToggle}
            disabled={loading}
            className="w-full"
            variant={place.completed ? "outline" : "default"}
          >
            {place.completed ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Marcar como no visitado
              </>
            ) : (
              "Marcar como visitado"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

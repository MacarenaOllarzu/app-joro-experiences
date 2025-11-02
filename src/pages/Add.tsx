import { useNavigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

const Add = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Agregar" showBack />
      
      <main className="max-w-lg mx-auto p-4">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold mb-2">Crear objetivos personalizados</h2>
          <p className="text-muted-foreground mb-6">
            Próximamente podrás crear tus propios objetivos
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Add;

import { Home, Search, Plus, Bell, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();
  
  const navItems = [
    { icon: Home, label: "Inicio", path: "/dashboard" },
    { icon: Search, label: "Explorar", path: "/users" },
    { icon: Plus, label: "Agregar", path: "/explore" },
    { icon: Bell, label: "Notificaciones", path: "/notifications" },
    { icon: User, label: "Perfil", path: "/user/me" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;

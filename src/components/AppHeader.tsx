import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";

interface AppHeaderProps {
  title?: string;
  showBack?: boolean;
  action?: React.ReactNode;
}

const AppHeader = ({ title, showBack = false, action }: AppHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 flex-1">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          {title && (
            <h1 className="text-lg font-semibold truncate">{title}</h1>
          )}
          {!title && !showBack && (
            <span className="text-xl font-bold tracking-tight">JORO</span>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
};

export default AppHeader;

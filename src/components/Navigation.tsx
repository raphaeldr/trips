import { NavLink } from "@/components/NavLink";
import { Map, Image, BookOpen, Home, Lock } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export const Navigation = () => {
  const { isAdmin } = useAdminAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-2 text-xl font-bold text-foreground hover:text-primary transition-colors">
            <span className="font-display text-2xl">Wereldrijst</span>
          </NavLink>
          
          <div className="flex items-center gap-8">
            <NavLink 
              to="/" 
              end
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </NavLink>
            
            <NavLink 
              to="/map"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              <Map className="w-4 h-4" />
              <span>Map</span>
            </NavLink>
            
            <NavLink 
              to="/gallery"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              <Image className="w-4 h-4" />
              <span>Gallery</span>
            </NavLink>
            
            <NavLink 
              to="/blog"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              activeClassName="text-primary"
            >
              <BookOpen className="w-4 h-4" />
              <span>Blog</span>
            </NavLink>
            
            {isAdmin && (
              <NavLink 
                to="/admin"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                activeClassName="text-primary"
              >
                <Lock className="w-4 h-4" />
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

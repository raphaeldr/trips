import { NavLink } from "@/components/NavLink";
import { Home, Map, Image, BookOpen, Lock } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export const MobileBottomNav = () => {
  const { isAdmin } = useAdminAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-t border-border md:hidden">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <NavLink
            to="/"
            end
            className="flex flex-col items-center text-xs text-muted-foreground"
            activeClassName="text-primary"
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/map"
            className="flex flex-col items-center text-xs text-muted-foreground"
            activeClassName="text-primary"
          >
            <Map className="w-5 h-5" />
            <span>Map</span>
          </NavLink>

          <NavLink
            to="/gallery"
            className="flex flex-col items-center text-xs text-muted-foreground"
            activeClassName="text-primary"
          >
            <Image className="w-5 h-5" />
            <span>Gallery</span>
          </NavLink>

          <NavLink
            to="/blog"
            className="flex flex-col items-center text-xs text-muted-foreground"
            activeClassName="text-primary"
          >
            <BookOpen className="w-5 h-5" />
            <span>Blog</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className="flex flex-col items-center text-xs text-muted-foreground"
              activeClassName="text-primary"
            >
              <Lock className="w-5 h-5" />
              <span>Admin</span>
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};


import { NavLink } from "@/components/NavLink";
import { Map, Image, BookOpen, Home, Lock } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export const Navigation = () => {
  const { isAdmin } = useAdminAuth();

  return (
    <nav className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-4xl bg-white/70 dark:bg-black/70 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-full shadow-lg md:block hidden transition-all hover:bg-white/80 dark:hover:bg-black/80">
      <div className="px-6 py-3 flex items-center justify-between">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-foreground hover:text-primary transition-colors font-display"
        >
          De reis
        </NavLink>

        <div className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            activeClassName="bg-black/5 dark:bg-white/10 text-foreground font-semibold"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/map"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            activeClassName="bg-black/5 dark:bg-white/10 text-foreground font-semibold"
          >
            <Map className="w-4 h-4" />
            <span>Map</span>
          </NavLink>

          <NavLink
            to="/gallery"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            activeClassName="bg-black/5 dark:bg-white/10 text-foreground font-semibold"
          >
            <Image className="w-4 h-4" />
            <span>Gallery</span>
          </NavLink>

          <NavLink
            to="/blog"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            activeClassName="bg-black/5 dark:bg-white/10 text-foreground font-semibold"
          >
            <BookOpen className="w-4 h-4" />
            <span>Journal</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className="flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-all ml-2"
              activeClassName="text-primary bg-primary/10"
            >
              <Lock className="w-4 h-4" />
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
};

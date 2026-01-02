import { NavLink } from "@/components/NavLink";
import { Map, Sparkles, Home, Lock } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export const Navigation = () => {
  const { isAdmin } = useAdminAuth();

  const DesktopNav = () => (
    <nav className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-4xl bg-white/70 dark:bg-black/70 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-full shadow-lg transition-all hover:bg-white/80 dark:hover:bg-black/80 hidden md:block">
      <div className="px-6 py-3 flex items-center justify-between">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-lg font-semibold text-foreground hover:text-primary transition-colors font-display"
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
            <Home className="w-4 h-4" strokeWidth={1.5} />
            <span className="font-sans">Home</span>
          </NavLink>

          <NavLink
            to="/map"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            activeClassName="bg-black/5 dark:bg-white/10 text-foreground font-semibold"
          >
            <Map className="w-4 h-4" strokeWidth={1.5} />
            <span className="font-sans">Journey</span>
          </NavLink>

          <NavLink
            to="/gallery"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all"
            activeClassName="bg-black/5 dark:bg-white/10 text-foreground font-semibold"
          >
            <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            <span className="font-sans">Moments</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className="flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:text-primary hover:bg-black/5 dark:hover:bg-white/10 transition-all ml-2"
              activeClassName="text-primary bg-primary/10"
            >
              <Lock className="w-4 h-4" strokeWidth={1.5} />
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );

  const MobileNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-white/20 dark:border-white/10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] md:hidden pb-safe">
      <div className="grid grid-cols-4 h-16 items-center px-2">
        <NavLink
          to="/"
          end
          className="flex flex-col items-center justify-center gap-1 h-full text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          activeClassName="text-primary font-medium"
        >
          <Home className="w-6 h-6" strokeWidth={1.5} />
          <span className="text-xs font-medium font-sans">Home</span>
        </NavLink>

        <NavLink
          to="/map"
          className="flex flex-col items-center justify-center gap-1 h-full text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          activeClassName="text-primary font-medium"
        >
          <Map className="w-6 h-6" strokeWidth={1.5} />
          <span className="text-xs font-medium font-sans">Journey</span>
        </NavLink>

        <NavLink
          to="/gallery"
          className="flex flex-col items-center justify-center gap-1 h-full text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          activeClassName="text-primary font-medium"
        >
          <Sparkles className="w-6 h-6" strokeWidth={1.5} />
          <span className="text-xs font-medium font-sans">Moments</span>
        </NavLink>

        {isAdmin ? (
          <NavLink
            to="/admin"
            className="flex flex-col items-center justify-center gap-1 h-full text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            activeClassName="text-primary font-medium"
          >
            <Lock className="w-6 h-6" strokeWidth={1.5} />
            <span className="text-xs font-medium font-sans">Admin</span>
          </NavLink>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 h-full opacity-0 pointer-events-none">
            {/* Spacer for 4-col grid balance if not admin, or we could make it 3 cols. 
                 Keeping it 4 cols to maintain consistent spacing even if empty is usually safer for muscle memory 
                 or switch to 3 cols if prefer. Let's keep 4 cols but empty. */}
          </div>
        )}
      </div>
    </nav>
  );

  return (
    <>
      <DesktopNav />
      <MobileNav />
    </>
  );
};

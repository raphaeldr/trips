import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Plane } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import type { Destination } from "@/types";

const Home = () => {
  // Fetch destinations for day counter
  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("*").order("arrival_date", {
        ascending: true,
      });
      if (error) throw error;
      return data;
    },
  });

  // Fetch trip settings for dynamic content
  const { data: tripSettings } = useQuery({
    queryKey: ["tripSettings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_settings").select("*").single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch latest photos for homepage
  const { data: latestPhotos } = useQuery({
    queryKey: ["latestPhotos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        // Removed explicit video exclusion
        .order("created_at", {
          ascending: false,
        })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  // Fetch hero image
  const { data: heroPhoto } = useQuery({
    queryKey: ["heroPhoto"],
    queryFn: async () => {
      const { data, error } = await supabase.from("photos").select("*").eq("is_hero", true).single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch unique country count (minus start country)
  const { data: countryCount } = useQuery({
    queryKey: ["countryCount"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("country");

      if (error) throw error;

      const uniqueCountries = new Set(data.map((d) => d.country));
      // Subtract 1 for the start country (Luxembourg)
      return Math.max(0, uniqueCountries.size - 1);
    },
  });

  // Fetch total photo count
  const { data: photoCount } = useQuery({
    queryKey: ["photoCount"],
    queryFn: async () => {
      const { count, error } = await supabase.from("photos").select("*", {
        count: "exact",
        head: true,
      });
      if (error) throw error;
      return count || 0;
    },
  });

  // Calculate total days of adventure from first to last destination
  const calculateDaysOfAdventure = () => {
    if (!destinations || destinations.length === 0) return 0;

    const firstDate = new Date(destinations[0].arrival_date);
    const lastDest = destinations[destinations.length - 1];
    const lastDate = lastDest.departure_date ? new Date(lastDest.departure_date) : new Date();

    // Calculate days from first arrival to last departure
    // Added +1 to match the logic in Map.tsx (inclusive day count)
    const daysOfAdventure = Math.ceil(differenceInDays(lastDate, firstDate)) + 1;
    return daysOfAdventure;
  };
  const daysOfAdventure = calculateDaysOfAdventure();
  const familyName = tripSettings?.family_name || "Pia, Mila, Liesbet and Raphaël";
  const tagline = tripSettings?.tagline || "Six Months. One World. Infinite Memories.";

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Navigation />
      <BottomNav />

      {/* Hero Dashboard Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Background Image or Video */}
        {heroPhoto ? (
          <>
            {heroPhoto.mime_type?.startsWith("video/") || heroPhoto.animated_path ? (
              <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-20">
                <source
                  src={
                    heroPhoto.animated_path
                      ? supabase.storage.from("photos").getPublicUrl(heroPhoto.animated_path).data.publicUrl
                      : supabase.storage.from("photos").getPublicUrl(heroPhoto.storage_path).data.publicUrl
                  }
                  type="video/mp4"
                />
              </video>
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center opacity-20"
                style={{
                  backgroundImage: `url(${supabase.storage.from("photos").getPublicUrl(heroPhoto.storage_path).data.publicUrl})`,
                }}
              />
            )}
          </>
        ) : null}

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 text-center text-white">
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            {familyName}
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-8 animate-fade-in opacity-90" style={{ animationDelay: "0.1s" }}>
            {tagline}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mt-12 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="text-3xl md:text-4xl font-bold text-amber-400">{daysOfAdventure}</div>
              <div className="text-sm text-white/80 mt-2">Days</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="text-3xl md:text-4xl font-bold text-amber-400">{countryCount || 0}</div>
              <div className="text-sm text-white/80 mt-2">Countries</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <div className="text-3xl md:text-4xl font-bold text-amber-400">{photoCount}</div>
              <div className="text-sm text-white/80 mt-2">Photos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Airport Departures Board Section */}
      <section className="py-16 bg-slate-950">
        <div className="container mx-auto px-6">
          <div className="bg-black rounded-2xl shadow-2xl overflow-hidden border-4 border-slate-700">
            {/* Board Header */}
            <div className="bg-slate-900 border-b-4 border-slate-700 px-8 py-6 flex items-center gap-4">
              <div className="bg-amber-400 p-3 rounded-lg">
                <Plane className="w-8 h-8 text-black" />
              </div>
              <h2 className="font-display text-4xl font-bold text-amber-400 tracking-wider" style={{ fontFamily: "'Courier New', monospace" }}>
                DEPARTURES
              </h2>
            </div>

            {/* Board Content */}
            <div className="p-8">
              {/* Column Headers */}
              <div className="grid grid-cols-12 gap-4 mb-4 pb-4 border-b border-slate-800">
                <div className="col-span-3 text-slate-500 font-bold text-sm tracking-widest" style={{ fontFamily: "'Courier New', monospace" }}>
                  DATE
                </div>
                <div className="col-span-4 text-slate-500 font-bold text-sm tracking-widest" style={{ fontFamily: "'Courier New', monospace" }}>
                  DESTINATION
                </div>
                <div className="col-span-2 text-slate-500 font-bold text-sm tracking-widest" style={{ fontFamily: "'Courier New', monospace" }}>
                  COUNTRY
                </div>
                <div className="col-span-3 text-slate-500 font-bold text-sm tracking-widest" style={{ fontFamily: "'Courier New', monospace" }}>
                  STATUS
                </div>
              </div>

              {/* Destination Rows */}
              <div className="space-y-2">
                {destinations && destinations.length > 0 ? (
                  destinations.map((dest, index) => {
                    const isPast = dest.departure_date ? new Date(dest.departure_date) < new Date() : false;
                    const isCurrent = dest.is_current;
                    const status = isCurrent ? "VISITING" : isPast ? "DEPARTED" : "SCHEDULED";
                    
                    return (
                      <div
                        key={dest.id}
                        className="grid grid-cols-12 gap-4 py-3 hover:bg-slate-900/50 transition-colors rounded-lg px-2 animate-fade-in"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="col-span-3 text-slate-400 font-mono text-lg tracking-wider">
                          {format(new Date(dest.arrival_date), "dd MMM yyyy").toUpperCase()}
                        </div>
                        <div className="col-span-4 text-amber-400 font-mono text-xl font-bold tracking-wider">
                          {dest.name.toUpperCase()}
                        </div>
                        <div className="col-span-2 text-slate-300 font-mono text-lg tracking-wider">
                          {dest.country.toUpperCase()}
                        </div>
                        <div className="col-span-3 flex items-center gap-2">
                          <span
                            className={`font-mono text-lg tracking-wider ${
                              isCurrent
                                ? "text-green-400 animate-pulse"
                                : isPast
                                  ? "text-slate-500"
                                  : "text-blue-400"
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-slate-500 py-12 font-mono">
                    NO DESTINATIONS SCHEDULED
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* View Map Button */}
          <div className="text-center mt-8">
            <Link to="/map">
              <Button size="lg" className="gap-2">
                View Full Journey Map
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Snapshots */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-display font-bold text-foreground mb-12 text-left">Latest snapshots</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {latestPhotos?.map((photo) => {
              const publicUrl = supabase.storage.from("photos").getPublicUrl(photo.storage_path).data.publicUrl;
              const isVideo = photo.mime_type?.startsWith("video/");

              return (
                <Link key={photo.id} to="/gallery">
                  <div className="aspect-square rounded-xl overflow-hidden shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer hover:scale-105 group relative">
                    {isVideo ? (
                      <div className="relative w-full h-full">
                        <video
                          src={`${publicUrl}#t=0.1`}
                          className="w-full h-full object-cover"
                          preload="metadata"
                          muted
                          playsInline
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                          <div className="bg-black/30 backdrop-blur-sm p-3 rounded-full border border-white/20">
                            <Play className="w-6 h-6 text-white fill-white" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={publicUrl}
                        alt={photo.title || photo.ai_caption || "Travel photo"}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Link to="/gallery">
              <Button size="lg" variant="outline" className="gap-2">
                View full gallery
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-footer text-footer-foreground py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-display text-2xl font-bold mb-4">Our trip</h3>
              <p className="text-footer-foreground/70">
                Documenting our 6-month journey around the globe. Exploring cultures, tasting foods, and creating
                memories.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Links</h4>
              <div className="flex flex-col gap-2">
                <Link to="/" className="text-footer-foreground/70 hover:text-primary transition-colors">
                  Home
                </Link>
                <Link to="/map" className="text-footer-foreground/70 hover:text-primary transition-colors">
                  Live Map
                </Link>
                <Link to="/gallery" className="text-footer-foreground/70 hover:text-primary transition-colors">
                  Photo Gallery
                </Link>
                <Link to="/blog" className="text-footer-foreground/70 hover:text-primary transition-colors">
                  Blog
                </Link>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Journey Stats</h4>
              <p className="text-footer-foreground/70">
                {daysOfAdventure} days traveled
                <br />
                {countryCount || 0} countries visited
                <br />
                {photoCount} photos captured
              </p>
            </div>
          </div>

          <div className="border-t border-footer-foreground/20 mt-8 pt-8 text-center text-footer-foreground/60 text-sm">
            © 2025 {familyName}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};
export default Home;

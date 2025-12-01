import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { MapEmbed } from "@/components/MapEmbed";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, Camera, Globe, Plane, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { PackingStatusWidget, AiLocationFact } from "@/components/DashboardWidgets";

const Home = () => {
  const [textColor, setTextColor] = useState("text-white");

  // Fetch destinations for day counter & map
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

  // Fetch hero image
  const { data: heroPhoto, isLoading: heroLoading } = useQuery({
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
      return Math.max(0, uniqueCountries.size);
    },
  });

  // Analyze image brightness and adjust text color
  useEffect(() => {
    if (!heroPhoto) {
      setTextColor("text-white");
      return;
    }
    const img = new Image();
    img.crossOrigin = "Anonymous";

    const isVideo = heroPhoto.mime_type?.startsWith("video/") || heroPhoto.animated_path;
    const mediaUrl =
      isVideo && heroPhoto.animated_path
        ? supabase.storage.from("photos").getPublicUrl(heroPhoto.animated_path).data.publicUrl
        : supabase.storage.from("photos").getPublicUrl(heroPhoto.storage_path).data.publicUrl;

    if (isVideo) {
      setTextColor("text-white");
      return;
    }

    img.src = mediaUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Simple brightness check (sample center)
        const imageData = ctx.getImageData(0, 0, 1, 1).data;
        const brightness = (imageData[0] * 299 + imageData[1] * 587 + imageData[2] * 114) / 1000;
        setTextColor(brightness > 125 ? "text-slate-900" : "text-white");
      } catch (e) {
        setTextColor("text-white");
      }
    };
  }, [heroPhoto]);

  // Calculate stats
  const calculateDaysOfAdventure = () => {
    if (!destinations || destinations.length === 0) return 0;
    const firstDate = new Date(destinations[0].arrival_date);
    const today = new Date();
    return Math.ceil(differenceInDays(today, firstDate)) + 1;
  };

  const daysOfAdventure = calculateDaysOfAdventure();
  const familyName = tripSettings?.family_name || "The Wanderers";
  const currentDestination = destinations?.find((d) => d.is_current) || destinations?.[destinations.length - 1];
  
  // Calculate total KM (mocked for now, normally would sum distances between coordinates)
  const totalKm = (countryCount || 0) * 1245 + 340; 

  const heroMediaUrl = heroPhoto
    ? supabase.storage.from("photos").getPublicUrl(heroPhoto.animated_path || heroPhoto.storage_path).data.publicUrl
    : null;

  const isVideo = heroPhoto?.mime_type?.startsWith("video/") || heroPhoto?.animated_path;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <Navigation />

      <main className="pt-24 md:pt-28 container mx-auto px-4 sm:px-6">
        {/* Dynamic Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]">
          
          {/* 1. Header / Hero Block (Large) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 relative rounded-3xl overflow-hidden shadow-2xl group border-4 border-white dark:border-border">
            {heroLoading ? (
              <Skeleton className="w-full h-full" />
            ) : heroMediaUrl ? (
              <>
                <div className="absolute inset-0 z-0">
                  {isVideo ? (
                    <video autoPlay loop muted playsInline className="w-full h-full object-cover">
                      <source src={heroMediaUrl} type="video/mp4" />
                    </video>
                  ) : (
                    <img
                      src={heroMediaUrl}
                      alt="Hero"
                      className="w-full h-full object-cover transition-transform duration-[20s] ease-linear scale-100 group-hover:scale-110"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                <span className="text-white/50">Upload a hero image</span>
              </div>
            )}

            <div className="absolute inset-0 z-10 flex flex-col justify-between p-8">
              <div className="flex justify-between items-start">
                <div className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border border-white/30 flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  Live Update
                </div>
              </div>

              <div>
                <h2 className="text-white/80 text-lg font-medium mb-2 tracking-wide font-display">
                  Currently Exploring
                </h2>
                <div className="mb-4">
                  <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg">
                    {currentDestination?.name || "Unknown"}
                  </h1>
                  <div className="text-2xl text-white/90 font-light mt-2 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    {currentDestination?.country || "Earth"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Days Counter (Small) */}
          <div className="col-span-1 row-span-1">
            <div className="bg-card rounded-3xl p-6 h-full flex flex-col justify-center items-center text-center shadow-card border border-border/50 hover:border-primary/50 transition-colors">
              <Calendar className="w-8 h-8 text-primary mb-2 opacity-80" />
              <span className="text-5xl font-display font-bold text-foreground tabular-nums">
                {daysOfAdventure}
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mt-1">Days Traveling</span>
            </div>
          </div>

          {/* 3. Distance Tracker (Small) */}
          <div className="col-span-1 row-span-1">
            <div className="bg-slate-900 text-white rounded-3xl p-6 h-full flex flex-col justify-center items-center text-center shadow-card relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[url('[https://www.transparenttextures.com/patterns/cubes.png](https://www.transparenttextures.com/patterns/cubes.png)')]"></div>
              <Plane className="w-8 h-8 text-blue-400 mb-2" />
              <span className="text-4xl font-display font-bold tabular-nums">
                {totalKm.toLocaleString()}
              </span>
              <span className="text-xs text-blue-200/70 uppercase tracking-widest font-semibold mt-1">KM Traveled</span>
            </div>
          </div>

          {/* 4. Where We Are Widget */}
          <div className="col-span-1 md:col-span-2 row-span-1">
            <div className="bg-card rounded-3xl p-6 h-full flex flex-col justify-center border border-border/50">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Where We Are
              </h3>
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-primary flex-shrink-0" />
                <div>
                  <div className="text-2xl font-bold font-display text-foreground">
                    {currentDestination?.name || "Unknown"}
                  </div>
                  <div className="text-lg text-muted-foreground">
                    {currentDestination?.country || "Earth"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 6. Packing Status (Wide) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1">
            <PackingStatusWidget status="over" percentage={110} />
          </div>

          {/* 7. AI Fact (Tall) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1">
            <AiLocationFact location={currentDestination?.country || "Japan"} />
          </div>

          {/* 8. Map Entry (Large Square) */}
          <Link to="/map" className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 group cursor-pointer relative rounded-3xl overflow-hidden border border-border shadow-card">
            <div className="absolute inset-0 pointer-events-none transition-all duration-700 group-hover:scale-105">
              <MapEmbed className="w-full h-full" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90" />
            <div className="absolute bottom-0 left-0 p-8 w-full">
              <div className="flex justify-between items-end">
                <div>
                  <div className="bg-primary/20 text-primary w-fit px-3 py-1 rounded-full text-xs font-bold mb-3 flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    INTERACTIVE MAP
                  </div>
                  <h3 className="text-3xl font-display font-bold">Track Our Route</h3>
                  <p className="text-muted-foreground mt-1 max-w-sm">
                    Follow the path from {destinations?.[0]?.country || "Home"} to {currentDestination?.country}.
                  </p>
                </div>
                <div className="bg-foreground text-background p-4 rounded-full group-hover:rotate-45 transition-transform duration-300">
                  <ArrowRight className="w-6 h-6" />
                </div>
              </div>
            </div>
          </Link>

          {/* 9. Gallery Teaser (Tall) */}
          <Link to="/gallery" className="col-span-1 md:col-span-1 row-span-2 bg-zinc-100 dark:bg-zinc-900 rounded-3xl p-8 flex flex-col justify-between group hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white dark:bg-black rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                <Camera className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="text-2xl font-bold leading-tight">
                Visual<br/>Diary
              </h3>
            </div>
            <div>
              <div className="flex -space-x-4 mb-4">
                {[1,2,3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-background bg-muted overflow-hidden">
                     {/* Placeholders for avatars/thumbnails */}
                     <div className="w-full h-full bg-gradient-to-tr from-primary/40 to-blue-400/40" />
                  </div>
                ))}
                <div className="w-10 h-10 rounded-full border-2 border-background bg-black text-white flex items-center justify-center text-xs font-bold">
                  +2k
                </div>
              </div>
              <p className="text-sm text-muted-foreground">View all photos →</p>
            </div>
          </Link>

        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;

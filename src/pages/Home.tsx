import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { MapEmbed } from "@/components/MapEmbed";
import { ArrowRight, Calendar, Camera, Globe, Plane, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { WeatherWidget, PackingStatusWidget, CurrentLocationCard } from "@/components/DashboardWidgets";

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

  // Calculate stats
  const calculateDaysOfAdventure = () => {
    if (!destinations || destinations.length === 0) return 0;
    const firstDate = new Date(destinations[0].arrival_date);
    const today = new Date();
    return Math.ceil(differenceInDays(today, firstDate)) + 1;
  };

  const daysOfAdventure = calculateDaysOfAdventure();
  const familyName = tripSettings?.family_name || "The Wanderers";
  
  // Logic to find current destination
  const currentDestination = destinations?.find((d) => d.is_current) || destinations?.[destinations.length - 1];
  
  // Calculate days at current location
  const daysAtCurrent = currentDestination 
    ? Math.max(1, differenceInDays(new Date(), new Date(currentDestination.arrival_date)))
    : 0;

  // Calculate total KM (mocked for now)
  const totalKm = (countryCount || 0) * 1245 + 340; 

  const heroMediaUrl = heroPhoto
    ? supabase.storage.from("photos").getPublicUrl(heroPhoto.animated_path || heroPhoto.storage_path).data.publicUrl
    : null;

  const isVideo = heroPhoto?.mime_type?.startsWith("video/") || heroPhoto?.animated_path;

  // Mock weather condition based on country name for demo purposes
  const getWeatherCondition = (country?: string) => {
    if (!country) return "Sunny";
    const coldCountries = ["Iceland", "Norway", "Canada", "Switzerland", "New Zealand"];
    const rainyCountries = ["UK", "Ireland", "Scotland"];
    
    if (coldCountries.some(c => country.includes(c))) return "Snowy";
    if (rainyCountries.some(c => country.includes(c))) return "Rainy";
    return "Sunny";
  };

  const getWeatherTemp = (country?: string) => {
    const condition = getWeatherCondition(country);
    if (condition === "Snowy") return -2;
    if (condition === "Rainy") return 12;
    return 28;
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-12">
      <Navigation />

      <main className="pt-24 md:pt-28 container mx-auto px-4 sm:px-6">
        {/* Dynamic Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[180px]">
          
          {/* 1. Header / Hero Block (Large) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 relative rounded-[2rem] overflow-hidden shadow-2xl group border-4 border-white dark:border-zinc-800">
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
                      className="w-full h-full object-cover transition-transform duration-[30s] ease-linear scale-100 group-hover:scale-110"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                <span className="text-white/50">Upload a hero image</span>
              </div>
            )}

            <div className="absolute inset-0 z-10 flex flex-col justify-end p-8 md:p-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-semibold tracking-wider uppercase mb-4 border border-white/20">
                  <Globe className="w-3 h-3" />
                  Global Expedition
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-white mb-2 tracking-tight leading-[1.1]">
                  {familyName} <br />
                  <span className="text-white/70">World Tour</span>
                </h1>
                <p className="text-white/80 text-lg max-w-md font-light leading-relaxed">
                  Documenting our 6-month journey around the globe, one adventure at a time.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Days Counter (Small) */}
          <div className="col-span-1 row-span-1">
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-[2rem] p-6 h-full flex flex-col justify-center items-center text-center border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <Calendar className="w-6 h-6 text-zinc-400 mb-3" />
              <span className="text-5xl font-display font-bold text-foreground tabular-nums tracking-tight">
                {daysOfAdventure}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Days Traveling</span>
            </div>
          </div>

          {/* 3. Distance Tracker (Small) */}
          <div className="col-span-1 row-span-1">
            <div className="bg-slate-950 text-white rounded-[2rem] p-6 h-full flex flex-col justify-center items-center text-center relative overflow-hidden group">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] group-hover:[background-size:20px_20px] transition-all duration-500"></div>
              <Plane className="w-6 h-6 text-blue-400 mb-3 relative z-10" />
              <span className="text-4xl font-display font-bold tabular-nums relative z-10">
                {totalKm.toLocaleString()}
              </span>
              <span className="text-[10px] text-blue-200/60 uppercase tracking-widest font-bold mt-1 relative z-10">KM Traveled</span>
            </div>
          </div>

          {/* 4. Weather Widget (Tall) */}
          <div className="col-span-1 row-span-2 rounded-[2rem] overflow-hidden">
            <WeatherWidget 
              location={currentDestination?.name || "Local"} 
              condition={getWeatherCondition(currentDestination?.country)}
              temp={getWeatherTemp(currentDestination?.country)}
            />
          </div>

          {/* 5. Current Location Card (Wide) */}
          <div className="col-span-1 md:col-span-2 row-span-1 rounded-[2rem] overflow-hidden">
            <CurrentLocationCard 
              name={currentDestination?.name || "Unknown"}
              country={currentDestination?.country || "In Transit"}
              arrivalDate={currentDestination?.arrival_date || new Date().toISOString()}
              daysHere={daysAtCurrent}
            />
          </div>

          {/* 6. Packing Status (Wide) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 row-span-1 rounded-[2rem] overflow-hidden">
            <PackingStatusWidget status="over" percentage={110} />
          </div>

          {/* 7. Map Entry (Large Square) */}
          <Link to="/map" className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 relative rounded-[2rem] overflow-hidden border border-border/50 shadow-sm bg-muted/30">
            <div className="absolute inset-0">
              <MapEmbed className="w-full h-full" />
            </div>
            
            <div className="absolute bottom-0 left-0 p-8 w-full">
              <div className="flex justify-between items-end">
                <div>
                  <div className="bg-blue-500 text-white w-fit px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-3 flex items-center gap-1.5 shadow-lg shadow-blue-500/20">
                    <Globe className="w-3 h-3" />
                    Live Tracker
                  </div>
                  <h3 className="text-2xl font-display font-bold text-white drop-shadow-md">Interactive Route</h3>
                  <p className="text-white/90 mt-1 max-w-sm text-sm drop-shadow-md font-medium">
                    View our full path from start to finish.
                  </p>
                </div>
                <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white p-4 rounded-full shadow-xl">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </Link>

          {/* 8. Gallery Teaser (Wide - Expanded) */}
          <Link to="/gallery" className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 bg-orange-50 dark:bg-orange-950/20 rounded-[2rem] p-8 flex flex-col justify-between group hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors border border-orange-100 dark:border-orange-900/50">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white dark:bg-orange-900 rounded-2xl flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform duration-300 text-orange-500">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-display font-bold leading-tight text-orange-950 dark:text-orange-100">
                Visual<br/>Diary
              </h3>
            </div>
            <div className="flex justify-between items-end">
              <div className="flex -space-x-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-black bg-orange-200 dark:bg-orange-800" />
                ))}
              </div>
              <span className="text-sm font-medium text-orange-800 dark:text-orange-200 flex items-center gap-2 bg-white/50 dark:bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm">
                View All Photos <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>

        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;

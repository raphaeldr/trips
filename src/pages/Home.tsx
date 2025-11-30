import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { MapEmbed } from "@/components/MapEmbed";
import { Button } from "@/components/ui/button";
import { ArrowRight, Map as MapIcon, Calendar, Camera, BookOpen, Globe, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import type { Destination } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AirportBoard } from "@/components/ui/AirportText";

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
  const { data: heroPhoto, isLoading: heroLoading } = useQuery({
    queryKey: ["heroPhoto"],
    queryFn: async () => {
      const { data, error } = await supabase.from("photos").select("*").eq("is_hero", true).single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch latest blog post
  const { data: latestPost } = useQuery({
    queryKey: ["latestBlogPost"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, destinations(*)")
        .eq("status", "published")
        .order("published_at", {
          ascending: false,
        })
        .limit(1)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch latest blog posts (for featured section if needed, distinct from latestPost)
  const { data: featuredPosts } = useQuery({
    queryKey: ["latestBlogPosts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, destinations(*)")
        .eq("status", "published")
        .order("published_at", {
          ascending: false,
        })
        .limit(2);
      if (error) throw error;
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
      // Subtract 1 for the start country (approximate logic)
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

  // Analyze image brightness and adjust text color
  useEffect(() => {
    if (!heroPhoto) {
      setTextColor("text-white");
      return;
    }
    const img = new Image();
    img.crossOrigin = "Anonymous";

    // Check if it's a video or image
    const isVideo = heroPhoto.mime_type?.startsWith("video/") || heroPhoto.animated_path;
    const mediaUrl =
      isVideo && heroPhoto.animated_path
        ? supabase.storage.from("photos").getPublicUrl(heroPhoto.animated_path).data.publicUrl
        : supabase.storage.from("photos").getPublicUrl(heroPhoto.storage_path).data.publicUrl;

    if (isVideo) {
      // For video, we default to white text as it's hard to analyze video brightness client-side efficiently
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

        // Sample center area of image
        const sampleSize = 200;
        const x = (canvas.width - sampleSize) / 2;
        const y = (canvas.height - sampleSize) / 2;

        // Ensure coordinates are within bounds
        const safeX = Math.max(0, Math.min(x, canvas.width - 1));
        const safeY = Math.max(0, Math.min(y, canvas.height - 1));
        const safeWidth = Math.min(sampleSize, canvas.width - safeX);
        const safeHeight = Math.min(sampleSize, canvas.height - safeY);

        if (safeWidth <= 0 || safeHeight <= 0) return;

        const imageData = ctx.getImageData(safeX, safeY, safeWidth, safeHeight);
        const data = imageData.data;
        let totalBrightness = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Calculate perceived brightness
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          totalBrightness += brightness;
        }

        const avgBrightness = totalBrightness / (data.length / 4);
        setTextColor(avgBrightness > 160 ? "text-slate-800" : "text-slate-100");
      } catch (error) {
        console.error("Error analyzing image:", error);
        setTextColor("text-white");
      }
    };
    img.onerror = () => {
      setTextColor("text-white");
    };
  }, [heroPhoto]);

  // Calculate total days of adventure
  const calculateDaysOfAdventure = () => {
    if (!destinations || destinations.length === 0) return 0;
    const firstDate = new Date(destinations[0].arrival_date);
    const today = new Date();
    return Math.ceil(differenceInDays(today, firstDate)) + 1;
  };

  const daysOfAdventure = calculateDaysOfAdventure();
  const familyName = tripSettings?.family_name || "The Anderson Family";

  // Current location for map card
  const currentDestination = destinations?.find((d) => d.is_current);

  // Media URL handling
  const heroMediaUrl = heroPhoto
    ? supabase.storage.from("photos").getPublicUrl(heroPhoto.animated_path || heroPhoto.storage_path).data.publicUrl
    : null;

  const isVideo = heroPhoto?.mime_type?.startsWith("video/") || heroPhoto?.animated_path;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="pt-24 md:pt-28 pb-12">
        {/* Bento Grid Layout */}
        <div className="bento-grid">
          {/* 1. Header / Intro Block */}
          <div className="bento-card col-span-1 md:col-span-2 lg:col-span-2 row-span-1 p-8 flex flex-col justify-center items-start bg-card relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Globe className="w-24 h-24" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              On the move
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight mb-4 text-foreground leading-[1.1]">
              {familyName} <br />
              <span className="text-muted-foreground">Travel Journal</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              Six months. One world. Infinite memories. Join us as we explore continents, chase sunsets, and learn
              together.
            </p>
          </div>

          {/* 2. Hero Media Block */}
          <div className="bento-card col-span-1 md:col-span-1 lg:col-span-2 lg:row-span-2 relative min-h-[300px] lg:min-h-[400px]">
            {heroLoading ? (
              <Skeleton className="w-full h-full" />
            ) : heroMediaUrl ? (
              <>
                {isVideo ? (
                  <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
                    <source src={heroMediaUrl} type="video/mp4" />
                  </video>
                ) : (
                  <img
                    src={heroMediaUrl}
                    alt="Hero"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-0 left-0 p-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">Latest Snapshot</span>
                  </div>
                  {heroPhoto?.title && <p className="font-medium text-lg">{heroPhoto.title}</p>}
                </div>
              </>
            ) : (
              <div className="absolute inset-0 bg-secondary flex items-center justify-center">
                <p className="text-muted-foreground">No cover image set</p>
              </div>
            )}
          </div>

          {/* 3. Stats Block - Days */}
          <div className="bento-card col-span-1 p-6 flex flex-col justify-between bg-[#F2F2F2] dark:bg-card">
            <div className="flex justify-between items-start">
              <Calendar className="w-6 h-6 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">DURATION</span>
            </div>
            <div>
              <span className="text-5xl md:text-6xl font-display font-bold text-foreground block">
                {daysOfAdventure}
              </span>
              <span className="text-sm text-muted-foreground font-medium mt-1 block">Days on the road</span>
            </div>
          </div>

          {/* 4. Stats Block - Countries */}
          <div className="bento-card col-span-1 p-6 flex flex-col justify-between bg-primary/5 dark:bg-card">
            <div className="flex justify-between items-start">
              <MapIcon className="w-6 h-6 text-primary" />
              <span className="text-xs font-mono text-muted-foreground">EXPLORED</span>
            </div>
            <div>
              <span className="text-5xl md:text-6xl font-display font-bold text-primary block">
                {countryCount || 0}
              </span>
              <span className="text-sm text-muted-foreground font-medium mt-1 block">Countries visited</span>
            </div>
          </div>

          {/* 5. Map Block */}
          <Link
            to="/map"
            className="bento-card col-span-1 md:col-span-2 lg:col-span-2 lg:row-span-1 relative min-h-[240px] group cursor-pointer"
          >
            <div className="absolute inset-0 pointer-events-none">
              <MapEmbed className="w-full h-full group-hover:grayscale-0 transition-all duration-500" />
            </div>
            <div className="absolute bottom-0 left-0 p-6 w-full flex justify-between items-end bg-gradient-to-t from-background/60 to-transparent">
              <div>
                <h3 className="text-xl font-bold mb-1">Live Journey Map</h3>
                <p className="text-sm text-muted-foreground">
                  {currentDestination
                    ? `Currently in ${currentDestination.name}, ${currentDestination.country}`
                    : "Track our route across the globe"}
                </p>
              </div>
              <div className="bg-background/80 backdrop-blur-sm p-2 rounded-full border shadow-sm group-hover:scale-110 transition-transform">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>

          {/* 6. Latest Story */}
          <div className="bento-card col-span-1 md:col-span-2 p-0 flex flex-col relative group">
            <div className="p-6 md:p-8 flex flex-col h-full z-10 relative">
              <div className="flex items-center gap-2 text-primary mb-4">
                <BookOpen className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Latest Story</span>
              </div>

              {latestPost ? (
                <>
                  <Link to={`/blog/${latestPost.slug}`} className="flex-1">
                    <h3 className="text-2xl md:text-3xl font-display font-bold mb-3 group-hover:text-primary transition-colors line-clamp-2">
                      {latestPost.title}
                    </h3>
                    <p className="text-muted-foreground line-clamp-3 mb-6">{latestPost.excerpt}</p>
                  </Link>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-sm text-muted-foreground font-mono">
                      {latestPost.published_at && format(new Date(latestPost.published_at), "MMMM d, yyyy")}
                    </span>
                    <Link to={`/blog/${latestPost.slug}`}>
                      <Button variant="ghost" className="p-0 hover:bg-transparent hover:text-primary gap-2">
                        Read Story <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  No stories published yet
                </div>
              )}
            </div>
            {/* Background decorative image if available */}
            {latestPost?.cover_image_url && (
              <div className="absolute right-0 top-0 w-1/3 h-full opacity-[0.03] pointer-events-none">
                <img src={latestPost.cover_image_url} className="w-full h-full object-cover grayscale" alt="" />
              </div>
            )}
          </div>

          {/* 7. Gallery Link */}
          <Link
            to="/gallery"
            className="bento-card col-span-1 p-6 flex flex-col items-center justify-center text-center bg-foreground text-background group hover:bg-foreground/90"
          >
            <div className="mb-4 relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <Camera className="w-10 h-10 relative z-10" />
            </div>
            <h3 className="text-xl font-bold mb-1">Photo Gallery</h3>
            <p className="text-sm text-white/60 mb-4">View all captured moments</p>
            <span className="text-xs border border-white/20 rounded-full px-3 py-1 group-hover:bg-white/10 transition-colors">
              Enter Gallery
            </span>
          </Link>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;

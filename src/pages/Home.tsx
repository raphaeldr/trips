import { useState, useEffect, useRef, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { MapEmbed } from "@/components/MapEmbed";
import { Button } from "@/components/ui/button";
import { ArrowRight, Map as MapIcon, Calendar, Camera, BookOpen, Globe, Play, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import type { Destination } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AirportBoard } from "@/components/ui/AirportText";

const Home = () => {
  const [textColor, setTextColor] = useState("text-white");
  const [scatterInView, setScatterInView] = useState(false);
  const scatterRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
        .order("created_at", {
          ascending: false,
        })
        .limit(12); // Increased limit for scatter grid
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

  // Fetch latest blog posts (for featured section)
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

  // Fetch unique country count
  const { data: countryCount } = useQuery({
    queryKey: ["countryCount"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("country");
      if (error) throw error;
      const uniqueCountries = new Set(data.map((d) => d.country));
      return Math.max(0, uniqueCountries.size - 1);
    },
  });

  // Intersection Observer for Scatter Grid
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setScatterInView(true);
          }
        });
      },
      { threshold: 0.2 }, // Trigger when 20% of the section is visible
    );

    if (scatterRef.current) {
      observer.observe(scatterRef.current);
    }

    return () => {
      if (scatterRef.current) {
        observer.unobserve(scatterRef.current);
      }
    };
  }, []);

  // Generate random positions for the scatter effect (memoized to keep them stable)
  const scatterStyles = useMemo(() => {
    return (
      latestPhotos?.map(() => ({
        transform: `translate(${Math.random() * 100 - 50}vw, ${Math.random() * 100 - 50}vh) rotate(${Math.random() * 40 - 20}deg) scale(${0.5 + Math.random() * 0.5})`,
        opacity: 0,
      })) || []
    );
  }, [latestPhotos]);

  // Analyze image brightness
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

        const sampleSize = 200;
        const x = (canvas.width - sampleSize) / 2;
        const y = (canvas.height - sampleSize) / 2;

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

  const calculateDaysOfAdventure = () => {
    if (!destinations || destinations.length === 0) return 0;
    const firstDate = new Date(destinations[0].arrival_date);
    const today = new Date();
    return Math.ceil(differenceInDays(today, firstDate)) + 1;
  };

  const daysOfAdventure = calculateDaysOfAdventure();
  const familyName = tripSettings?.family_name || "The Anderson Family";
  const currentDestination = destinations?.find((d) => d.is_current);
  const heroMediaUrl = heroPhoto
    ? supabase.storage.from("photos").getPublicUrl(heroPhoto.animated_path || heroPhoto.storage_path).data.publicUrl
    : null;
  const isVideo = heroPhoto?.mime_type?.startsWith("video/") || heroPhoto?.animated_path;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 overflow-x-hidden">
      <Navigation />

      <main className="pt-24 md:pt-28 pb-12">
        {/* Hero Section */}
        <section className="relative h-[80vh] flex items-center justify-center overflow-hidden mb-12 rounded-b-3xl md:rounded-b-[3rem] shadow-lg">
          {heroPhoto ? (
            <>
              {isVideo ? (
                <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
                  <source src={heroMediaUrl} type="video/mp4" />
                </video>
              ) : (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105"
                  style={{ backgroundImage: `url(${heroMediaUrl})` }}
                />
              )}
              <div className={`absolute inset-0 ${textColor === "text-slate-800" ? "bg-white/20" : "bg-black/30"}`} />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-footer/20" />
          )}

          <div className={`relative z-10 container mx-auto px-6 text-center ${textColor}`}>
            <div className="inline-block mb-6 px-6 py-2 bg-primary/90 rounded-full backdrop-blur-sm animate-fade-in shadow-sm">
              <span className="text-sm font-semibold text-primary-foreground tracking-wider uppercase">
                {daysOfAdventure} days of adventure
              </span>
            </div>

            <div className="mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="flex justify-center">
                <AirportBoard
                  text={`${daysOfAdventure} days of adventures`}
                  className="text-4xl md:text-6xl lg:text-8xl font-bold tracking-tight drop-shadow-md"
                />
              </div>
            </div>

            <p
              className="text-xl md:text-2xl max-w-3xl mx-auto mb-12 animate-fade-in opacity-90 drop-shadow-sm font-medium"
              style={{ animationDelay: "0.2s" }}
            >
              Join {familyName} as we explore continents, chase sunsets, and learn about the world together.
            </p>

            <div className="animate-fade-in w-full max-w-md mx-auto" style={{ animationDelay: "0.3s" }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigate("/blog");
                }}
                className="relative flex items-center w-full bg-white/80 backdrop-blur-md rounded-full p-1.5 transition-all duration-300 hover:bg-white shadow-lg hover:shadow-xl border border-white/20 group"
              >
                <div className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-md" />
                <div className="relative flex items-center pl-5 flex-1 z-10">
                  <span className="text-muted-foreground/60 font-medium mr-1 select-none text-lg">journal/</span>
                  <input
                    type="text"
                    placeholder="search..."
                    className="w-full bg-transparent border-none outline-none text-gray-900 placeholder:text-muted-foreground/40 h-10 font-medium text-lg"
                  />
                </div>
                <Button
                  type="submit"
                  className="relative z-10 rounded-full px-8 h-12 bg-gray-900 text-white hover:bg-black border-none shadow-md transition-all font-bold text-base hover:scale-105 active:scale-95"
                >
                  Explore
                </Button>
              </form>
            </div>
          </div>
        </section>

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

          {/* 2. Hero Media Block (Secondary) */}
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
              <MapEmbed className="w-full h-full grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 p-6 w-full flex justify-between items-end">
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

        {/* Scattered Photo Grid Animation */}
        <div ref={scatterRef} className="mt-32 mb-32 relative container mx-auto px-4 min-h-[800px]">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6">Capturing every moment</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From spontaneous snapshots to breathtaking landscapes, our gallery tells the story of our journey.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 scattered-grid">
            {latestPhotos?.map((photo, index) => {
              const publicUrl = supabase.storage.from("photos").getPublicUrl(photo.storage_path).data.publicUrl;
              const isVideo = photo.mime_type?.startsWith("video/");
              // Apply random scatter style if not in view, else reset to grid
              const style =
                !scatterInView && scatterStyles[index]
                  ? scatterStyles[index]
                  : {
                      transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)",
                      opacity: 1,
                    };

              // Stagger delay based on index
              const transitionDelay = `${index * 0.1}s`;

              return (
                <div
                  key={photo.id}
                  className="scattered-item aspect-square rounded-2xl overflow-hidden shadow-card hover:shadow-xl transition-all duration-500 hover:scale-105 bg-card"
                  style={{
                    ...style,
                    transitionDelay: scatterInView ? transitionDelay : "0s",
                  }}
                >
                  {isVideo ? (
                    <video
                      src={`${publicUrl}#t=0.1`}
                      className="w-full h-full object-cover"
                      preload="metadata"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={publicUrl}
                      alt={photo.title || "Gallery photo"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div
            className={`text-center mt-16 transition-opacity duration-1000 delay-1000 ${scatterInView ? "opacity-100" : "opacity-0"}`}
          >
            <Link to="/gallery">
              <Button size="lg" variant="outline" className="rounded-full px-8">
                View Full Gallery
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Home;

import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { MapEmbed } from "@/components/MapEmbed";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { Destination } from "@/types";
const Home = () => {
  const [textColor, setTextColor] = useState("text-white");
  // Fetch destinations for day counter
  const {
    data: destinations
  } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("destinations").select("*").order("arrival_date", {
        ascending: true
      });
      if (error) throw error;
      return data;
    }
  });

  // Fetch trip settings for dynamic content
  const {
    data: tripSettings
  } = useQuery({
    queryKey: ["tripSettings"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("trip_settings").select("*").single();
      if (error) throw error;
      return data;
    }
  });

  // Fetch latest photos for homepage
  const {
    data: latestPhotos
  } = useQuery({
    queryKey: ["latestPhotos"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("photos").select("*").order("created_at", {
        ascending: false
      }).limit(8);
      if (error) throw error;
      return data;
    }
  });

  // Fetch hero image
  const {
    data: heroPhoto
  } = useQuery({
    queryKey: ["heroPhoto"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("photos").select("*").eq("is_hero", true).single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    }
  });

  // Fetch latest blog posts
  const {
    data: featuredPosts
  } = useQuery({
    queryKey: ["latestBlogPosts"],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from("blog_posts").select("*, destinations(*)").eq("status", "published").order("published_at", {
        ascending: false
      }).limit(2);
      if (error) throw error;
      return data;
    }
  });

  // Fetch destination count
  const {
    data: destinationCount
  } = useQuery({
    queryKey: ["destinationCount"],
    queryFn: async () => {
      const {
        count,
        error
      } = await supabase.from("destinations").select("*", {
        count: "exact",
        head: true
      });
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch total photo count
  const {
    data: photoCount
  } = useQuery({
    queryKey: ["photoCount"],
    queryFn: async () => {
      const {
        count,
        error
      } = await supabase.from("photos").select("*", {
        count: "exact",
        head: true
      });
      if (error) throw error;
      return count || 0;
    }
  });

  // Analyze image brightness and adjust text color
  useEffect(() => {
    if (!heroPhoto) {
      setTextColor("text-white");
      return;
    }
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = supabase.storage.from("photos").getPublicUrl(heroPhoto.storage_path).data.publicUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Sample center area of image (more relevant for text overlay)
        const sampleSize = 200;
        const x = (canvas.width - sampleSize) / 2;
        const y = (canvas.height - sampleSize) / 2;
        const imageData = ctx.getImageData(x, y, sampleSize, sampleSize);
        const data = imageData.data;
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Calculate perceived brightness using luminance formula
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          totalBrightness += brightness;
        }
        const avgBrightness = totalBrightness / (data.length / 4);

        // If average brightness > 128 (midpoint), image is light, use darker text
        // Use softer colors: light gray for dark images, dark gray for light images
        setTextColor(avgBrightness > 128 ? "text-gray-800" : "text-gray-200");
      } catch (error) {
        console.error("Error analyzing image:", error);
        setTextColor("text-white");
      }
    };
    img.onerror = () => {
      setTextColor("text-white");
    };
  }, [heroPhoto]);

  // Calculate total days of adventure from first to last destination
  const calculateDaysOfAdventure = () => {
    if (!destinations || destinations.length === 0) return 0;

    const firstDate = new Date(destinations[0].arrival_date);
    const lastDest = destinations[destinations.length - 1];
    const lastDate = lastDest.departure_date ? new Date(lastDest.departure_date) : new Date();
    
    // Calculate days from first arrival to last departure
    const daysOfAdventure = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysOfAdventure;
  };
  const daysOfAdventure = calculateDaysOfAdventure();
  const familyName = tripSettings?.family_name || "Pia, Mila, Liesbet and Raphaël";
  const tagline = tripSettings?.tagline || "Six Months. One World. Infinite Memories.";
  return <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image or Video */}
        {heroPhoto ? <>
            {heroPhoto.animated_path ? <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover">
                <source src={supabase.storage.from("photos").getPublicUrl(heroPhoto.animated_path).data.publicUrl} type="video/mp4" />
              </video> : <div className="absolute inset-0 bg-cover bg-center" style={{
          backgroundImage: `url(${supabase.storage.from("photos").getPublicUrl(heroPhoto.storage_path).data.publicUrl})`
        }} />}
            <div className="absolute inset-0 bg-black/40" />
          </> : <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-footer/20" />}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-overlay opacity-50" />

        {/* Content */}
        <div className={`relative z-10 container mx-auto px-6 text-center ${textColor}`}>
          <div className="inline-block mb-6 px-6 py-2 bg-primary/90 rounded-full backdrop-blur-sm animate-fade-in">
            <span className="text-sm font-semibold text-primary-foreground tracking-wider uppercase">
              {daysOfAdventure} days of adventure
            </span>
          </div>

          <h1 className="font-display text-6xl md:text-8xl font-bold mb-6 animate-fade-in" style={{
          animationDelay: "0.1s"
        }}>
            {tagline.split(". ").map((part, i) => <span key={i}>
                {part}
                {i < tagline.split(". ").length - 1 ? "." : ""}
                {i < tagline.split(". ").length - 1 && <br />}
              </span>)}
          </h1>

          <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-12 animate-fade-in opacity-90" style={{
          animationDelay: "0.2s"
        }}>
            Join {familyName} as we explore continents, chase sunsets, and learn about the world together.
          </p>

          <div className="flex gap-4 justify-center animate-fade-in" style={{
          animationDelay: "0.3s"
        }}>
            <Link to="/blog">
              <Button size="lg" className="gap-2 shadow-elegant hover:shadow-xl transition-all">
                Read journal
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/map">
              <Button size="lg" className="gap-2 shadow-elegant hover:shadow-xl transition-all">
                View map
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Stories Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-display font-bold text-foreground mb-12 text-left">Latest stories</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featuredPosts && featuredPosts.length > 0 ? featuredPosts.map(post => <Link key={post.id} to={`/blog/${post.slug}`}>
                  <div className="group relative overflow-hidden rounded-2xl shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer">
                    <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 to-footer/20">
                      {post.cover_image_url && <img src={post.cover_image_url} alt={post.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="absolute inset-0 bg-gradient-overlay" />
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <div className="flex items-center gap-2 text-sm text-primary-foreground/80 mb-2">
                        {post.published_at && <span>{format(new Date(post.published_at), "d MMMM yyyy")}</span>}
                        {post.destinations && <>
                            <span>•</span>
                            <span>{post.destinations.name}</span>
                          </>}
                      </div>
                      <h3 className="text-2xl font-bold text-primary-foreground mb-3 group-hover:text-primary transition-colors">
                        {post.title}
                      </h3>
                      {post.excerpt && <p className="text-primary-foreground/90 mb-4 line-clamp-2">{post.excerpt}</p>}
                      <span className="text-primary font-medium flex items-center gap-2">
                        Read Full Story
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>) : <div className="col-span-2 text-center text-muted-foreground py-12">
                No featured stories yet. Check back soon!
              </div>}
          </div>
        </div>
      </section>

      {/* Map Preview Section */}
      <section className="py-24 bg-muted">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-display font-bold text-foreground">Where we've been</h2>
            <Link to="/map">
              <Button variant="outline" className="gap-2">
                Full Screen map
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="aspect-[16/9] bg-secondary rounded-2xl shadow-card overflow-hidden">
            <MapEmbed className="w-full h-full" />
          </div>
        </div>
      </section>

      {/* Latest Snapshots */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-display font-bold text-foreground mb-12 text-left">Latest snapshots</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {latestPhotos?.map(photo => {
            const photoUrl = supabase.storage.from("photos").getPublicUrl(photo.storage_path).data.publicUrl;
            return <Link key={photo.id} to="/gallery">
                  <div className="aspect-square rounded-xl overflow-hidden shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer hover:scale-105">
                    <img src={photoUrl} alt={photo.title || photo.ai_caption || "Travel photo"} className="w-full h-full object-cover" />
                  </div>
                </Link>;
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
              <h4 className="font-semibold mb-4">Follow Us</h4>
              <p className="text-footer-foreground/70">
                Journey stats:
                <br />
                {daysOfAdventure} days traveled
                <br />
                {destinationCount} countries visited
                <br />
                {photoCount} photos captured
              </p>
            </div>
          </div>

          <div className="border-t border-footer-foreground/20 mt-8 pt-8 text-center text-footer-foreground/60 text-sm">
            © 2025 Pia, Mila, Liesbet and Raphaël. All rights reserved.
          </div>
        </div>
      </footer>
    </div>;
};
export default Home;
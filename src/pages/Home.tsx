import { Navigation } from "@/components/Navigation";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
  // Fetch trip settings for dynamic day counter
  const { data: tripSettings } = useQuery({
    queryKey: ['tripSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trip_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate current day
  const calculateCurrentDay = () => {
    if (!tripSettings) return 124; // fallback
    
    const startDate = new Date(tripSettings.start_date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.min(diffDays, tripSettings.total_days);
  };

  const currentDay = calculateCurrentDay();
  const totalDays = tripSettings?.total_days || 180;
  const familyName = tripSettings?.family_name || 'Anderson Family';
  const tagline = tripSettings?.tagline || 'Six Months. One World. Infinite Memories.';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image - placeholder for now */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-footer/20" />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-overlay" />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 text-center">
          <div className="inline-block mb-6 px-6 py-2 bg-primary/90 rounded-full backdrop-blur-sm animate-fade-in">
            <span className="text-sm font-semibold text-primary-foreground tracking-wider uppercase">
              Day {currentDay} of {totalDays}
            </span>
          </div>
          
          <h1 className="font-display text-6xl md:text-8xl font-bold text-foreground mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {tagline.split('. ').map((part, i) => (
              <span key={i}>
                {part}{i < tagline.split('. ').length - 1 ? '.' : ''}
                {i < tagline.split('. ').length - 1 && <br />}
              </span>
            ))}
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Join the {familyName} as we explore continents, chase sunsets, and learn about the world together.
          </p>
          
          <div className="flex gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/blog">
              <Button size="lg" className="gap-2 shadow-elegant hover:shadow-xl transition-all">
                Read Journal
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/map">
              <Button size="lg" variant="outline" className="gap-2 hover:bg-primary hover:text-primary-foreground transition-all">
                View Map
              </Button>
            </Link>
          </div>
        </div>
      </section>
      
      {/* Featured Stories Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-display font-bold text-foreground mb-12 text-center">
            Featured Stories
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Placeholder cards - will be dynamic */}
            {[1, 2].map((i) => (
              <div key={i} className="group relative overflow-hidden rounded-2xl shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer">
                <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 to-footer/20" />
                <div className="absolute inset-0 bg-gradient-overlay" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <div className="flex items-center gap-2 text-sm text-primary-foreground/80 mb-2">
                    <span>01/10/2023</span>
                    <span>•</span>
                    <span>JFK Airport</span>
                  </div>
                  <h3 className="text-2xl font-bold text-primary-foreground mb-3 group-hover:text-primary transition-colors">
                    We have taken off! Goodbye New York.
                  </h3>
                  <p className="text-primary-foreground/90 mb-4">
                    The bags are packed, the house is rented out. The adventure of a lifetime begins today.
                  </p>
                  <span className="text-primary font-medium flex items-center gap-2">
                    Read Full Story
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Map Preview Section */}
      <section className="py-24 bg-muted">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-4xl font-display font-bold text-foreground">
              Where We've Been
            </h2>
            <Link to="/map">
              <Button variant="outline" className="gap-2">
                Full Screen Map
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          <div className="aspect-[16/9] bg-secondary rounded-2xl shadow-card overflow-hidden">
            <MapView className="w-full h-full" />
          </div>
        </div>
      </section>
      
      {/* Latest Snapshots */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-display font-bold text-foreground mb-12 text-center">
            Latest Snapshots
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-square bg-gradient-to-br from-primary/10 to-footer/10 rounded-xl overflow-hidden shadow-card hover:shadow-elegant transition-all duration-300 cursor-pointer hover:scale-105" />
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/gallery">
              <Button size="lg" variant="outline" className="gap-2">
                View Full Gallery
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
              <h3 className="font-display text-2xl font-bold mb-4">WanderLust</h3>
              <p className="text-footer-foreground/70">
                Documenting the {familyName}'s 6-month journey around the globe. Exploring cultures, tasting foods, and creating memories.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Links</h4>
              <div className="flex flex-col gap-2">
                <Link to="/" className="text-footer-foreground/70 hover:text-primary transition-colors">Home</Link>
                <Link to="/map" className="text-footer-foreground/70 hover:text-primary transition-colors">Live Map</Link>
                <Link to="/gallery" className="text-footer-foreground/70 hover:text-primary transition-colors">Photo Gallery</Link>
                <Link to="/blog" className="text-footer-foreground/70 hover:text-primary transition-colors">Blog</Link>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Follow Us</h4>
              <p className="text-footer-foreground/70">
                Journey stats: {currentDay} days traveled, XX countries visited, XXXX photos captured
              </p>
            </div>
          </div>
          
          <div className="border-t border-footer-foreground/20 mt-8 pt-8 text-center text-footer-foreground/60 text-sm">
            © 2024 Anderson Family. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

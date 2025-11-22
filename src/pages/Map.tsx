import { Navigation } from "@/components/Navigation";

const Map = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 container mx-auto px-6 py-12">
        <h1 className="text-4xl font-display font-bold text-foreground mb-8">Interactive Map</h1>
        <div className="aspect-[16/9] bg-secondary rounded-2xl shadow-card">
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            Map with animated routes, clustered markers, and timeline slider coming soon
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;

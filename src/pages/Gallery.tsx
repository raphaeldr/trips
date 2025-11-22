import { Navigation } from "@/components/Navigation";

const Gallery = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 container mx-auto px-6 py-12">
        <h1 className="text-4xl font-display font-bold text-foreground mb-8">Photo Gallery</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="aspect-square bg-gradient-to-br from-primary/10 to-footer/10 rounded-xl shadow-card" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Gallery;

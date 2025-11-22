import { Navigation } from "@/components/Navigation";

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 container mx-auto px-6 py-12">
        <h1 className="text-4xl font-display font-bold text-foreground mb-8">Travel Journal</h1>
        <div className="max-w-4xl mx-auto space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl shadow-card p-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <span>01/10/2023</span>
                <span>•</span>
                <span>JFK Airport</span>
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">
                Blog Post Title
              </h2>
              <p className="text-foreground/80">
                Blog content with rich multimedia support coming soon...
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Blog;

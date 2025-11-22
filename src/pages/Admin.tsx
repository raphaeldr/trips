import { Navigation } from "@/components/Navigation";

const Admin = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-20 container mx-auto px-6 py-12">
        <h1 className="text-4xl font-display font-bold text-foreground mb-8">Backend Dashboard</h1>
        <div className="bg-card rounded-2xl shadow-card p-8">
          <p className="text-muted-foreground">
            Backend management interface for uploading photos, editing stories, and featuring content coming soon...
          </p>
        </div>
      </div>
    </div>
  );
};

export default Admin;

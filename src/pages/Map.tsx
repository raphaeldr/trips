import { Navigation } from "@/components/Navigation";
import { MapView } from "@/components/MapView";

const Map = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Our Journey</h1>
        <MapView className="w-full h-[600px] rounded-lg shadow-lg" />
      </main>
    </div>
  );
};

export default Map;

import { useState, useEffect } from "react";
import { Luggage, Info, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// --- Types ---
interface PackingStatusProps {
  status: "under" | "perfect" | "over";
  percentage: number;
}

interface AiFactProps {
  location: string;
  keywords: string[];
}

// --- Components ---

export const PackingStatusWidget = ({ status, percentage }: PackingStatusProps) => {
  const getStatusColor = () => {
    if (status === "over") return "bg-red-500";
    if (status === "perfect") return "bg-green-500";
    return "bg-yellow-500";
  };

  const getStatusText = () => {
    if (status === "over") return "Uh oh, Overpacked!";
    if (status === "perfect") return "Goldilocks Zone";
    return "Room for Souvenirs";
  };

  return (
    <Card className="h-full bg-card p-6 flex flex-col justify-between border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-bold uppercase tracking-wider">
          <Luggage className="w-4 h-4" />
          Bag Status
        </div>
        <Badge variant="outline" className={status === "over" ? "text-red-500 border-red-200" : ""}>
          {percentage}% Full
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <span className="text-xl font-bold font-display">{getStatusText()}</span>
        </div>
        <Progress value={percentage} className="h-3" />
        <p className="text-xs text-muted-foreground pt-2">
          {status === 'over' ? "Maybe leave the extra hiking boots?" : "Ready for capybara plushies!"}
        </p>
      </div>
    </Card>
  );
};

export const AiLocationFact = ({ location }: { location: string }) => {
  const [fact, setFact] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Mock AI fetching simulation
  useEffect(() => {
    setLoading(true);
    const facts = [
      `Did you know? ${location} is famous for its harmonious blend of ancient tradition and futuristic technology.`,
      `Local Legend: In ${location}, it is said that capybaras hold the secret to eternal chill.`,
      `Travel Tip: The best sushi in ${location} isn't always at the most expensive restaurant.`,
      `Geography: ${location} features some of the most dramatic glacier formations in the hemisphere.`,
    ];
    
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    
    const timer = setTimeout(() => {
      setFact(randomFact);
      setLoading(false);
    }, 2500); // Simulate network/AI delay

    return () => clearTimeout(timer);
  }, [location]);

  return (
    <Card className="h-full bg-black/5 dark:bg-white/5 border-none p-6 relative overflow-hidden backdrop-blur-sm">
      <div className="absolute top-3 right-3">
        <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
      </div>
      
      <div className="flex flex-col h-full">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Info className="w-4 h-4" />
          AI Quick Fact
        </h3>
        
        <div className="flex-1 flex items-center">
          {loading ? (
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-4 w-[90%]" />
            </div>
          ) : (
            <p className="text-lg font-medium leading-relaxed italic text-foreground/90 animate-in fade-in slide-in-from-bottom-2 duration-500">
              "{fact}"
            </p>
          )}
        </div>
        
        <div className="mt-4 flex gap-2">
          <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 hover:bg-purple-200">
            AI Generated
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {location}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

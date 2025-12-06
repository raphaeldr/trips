import { Music, Mail, MessageSquare, ArrowUpRight, Play, Pause } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

// --- Playlist Widget ---
export const PlaylistWidget = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const currentSong = {
    title: "Midnight City",
    artist: "M83",
    cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop",
  };

  return (
    <Card className="h-full bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-white/10 p-6 flex flex-col justify-between relative overflow-hidden group">
      {/* Animated background pulse */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
          <Music className="w-3 h-3" />
          On Repeat
        </div>
        <div className="flex gap-1">
          <span className="w-1 h-3 bg-primary/50 rounded-full animate-[bounce_1s_infinite]" />
          <span className="w-1 h-4 bg-primary/80 rounded-full animate-[bounce_1.2s_infinite]" />
          <span className="w-1 h-2 bg-primary/30 rounded-full animate-[bounce_0.8s_infinite]" />
        </div>
      </div>

      <div className="flex items-center gap-4 mt-4 relative z-10">
        <img
          src={currentSong.cover}
          alt="Album Art"
          className={`w-12 h-12 rounded-md object-cover shadow-lg ${isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate text-white">{currentSong.title}</p>
          <p className="text-xs text-white/60 truncate">{currentSong.artist}</p>
        </div>
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full h-8 w-8 bg-white text-black hover:bg-white/90"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
        </Button>
      </div>
    </Card>
  );
};

// --- Contact Widget ---
export const ContactWidget = () => {
  return (
    <Card className="h-full bg-card border-white/5 p-6 flex flex-col justify-center gap-4 relative overflow-hidden group hover:border-primary/30 transition-colors">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10">
        <h3 className="text-xl font-bold font-display text-white mb-1">Get in Touch</h3>
        <p className="text-sm text-muted-foreground mb-4">Have a recommendation or just want to say hi?</p>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5 hover:text-primary gap-2">
            <Mail className="w-4 h-4" />
            Email
          </Button>
          <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/5 hover:text-primary gap-2">
            <MessageSquare className="w-4 h-4" />
            Comment
          </Button>
        </div>
      </div>
    </Card>
  );
};

// --- Stat Box ---
interface StatBoxProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ElementType;
  className?: string;
}

export const StatBox = ({ label, value, subtext, icon: Icon, className }: StatBoxProps) => (
  <Card
    className={`h-full border-white/5 p-6 flex flex-col justify-between relative overflow-hidden group ${className}`}
  >
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
      {Icon && <Icon className="w-16 h-16" />}
    </div>

    <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider flex items-center gap-2">
      {Icon && <Icon className="w-3 h-3 text-primary" />}
      {label}
    </div>

    <div className="mt-2">
      <div className="text-4xl font-display font-bold text-white tracking-tight flex items-baseline gap-1">
        {value}
        {subtext && <span className="text-sm text-muted-foreground font-normal ml-1">{subtext}</span>}
      </div>
    </div>

    <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary hover:text-black hover:border-primary cursor-pointer">
      <ArrowUpRight className="w-4 h-4" />
    </div>
  </Card>
);

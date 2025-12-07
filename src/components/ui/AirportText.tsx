import React, { useEffect, useState, useRef, memo } from "react";
import { cn } from "@/lib/utils";

const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,':()&!?+-/";

interface SplitFlapCharProps {
  char: string;
  className?: string;
  delay?: number;
}

const SplitFlapChar = memo(({ char, className, delay = 0 }: SplitFlapCharProps) => {
  const [current, setCurrent] = useState(char);
  const [next, setNext] = useState(char);
  const [isFlipping, setIsFlipping] = useState(false);

  // Refs for animation state
  const targetRef = useRef(char);
  const currentRef = useRef(char);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    targetRef.current = char.toUpperCase();

    // Start spinning if target changed
    if (currentRef.current !== targetRef.current) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      // Add random delay before starting to spin
      timeoutRef.current = setTimeout(() => {
        startCycling();
      }, delay);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [char, delay]);

  const startCycling = () => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      if (currentRef.current === targetRef.current) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsFlipping(false);
        return;
      }

      setIsFlipping(true);

      // Move to next char
      const currentIdx = CHARS.indexOf(currentRef.current);
      // Determine next char (simple cycling through array)
      const nextCharIdx = (currentIdx + 1) % CHARS.length;
      const nextChar = CHARS[nextCharIdx];

      // Update state for render
      setCurrent(currentRef.current);
      setNext(nextChar);

      // Update ref for logic
      currentRef.current = nextChar;

      // Reset flipping state shortly before next interval to allow re-trigger
      setTimeout(() => {
        setIsFlipping(false);
      }, 100);
    }, 150); // Speed of flap change
  };

  // Base styles for the letter container
  // Increased contrast: darker background, white text
  const containerStyle = cn(
    "relative inline-block w-[0.8em] h-[1.3em] perspective-[300px] bg-[#111] mx-[1px] rounded-[2px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.5)]",
    className,
  );

  const commonClasses =
    "absolute left-0 w-full overflow-hidden flex items-center justify-center bg-[#181818] text-white font-mono font-bold";

  // Specific flap styles
  const topStyle = {
    height: "50%",
    top: 0,
    alignItems: "flex-end",
    borderBottom: "1px solid rgba(0,0,0,0.5)",
  };

  const bottomStyle = {
    height: "50%",
    bottom: 0,
    alignItems: "flex-start",
    borderTop: "1px solid rgba(255,255,255,0.05)",
  };

  return (
    <div className={containerStyle}>
      {/* Static Top (Shows Next - waiting to fall) */}
      <div className={commonClasses} style={topStyle}>
        <span className="translate-y-[50%]">{next}</span>
      </div>

      {/* Static Bottom (Shows Current - already fallen) */}
      <div className={commonClasses} style={bottomStyle}>
        <span className="-translate-y-[50%]">{current}</span>
      </div>

      {/* Flapping Top (Shows Current) - Flips Down */}
      {isFlipping && (
        <div className={cn(commonClasses, "origin-bottom animate-flap-down z-20 backface-hidden")} style={topStyle}>
          <span className="translate-y-[50%]">{current}</span>
        </div>
      )}

      {/* Flapping Bottom (Shows Next) - Flips Up */}
      {isFlipping && (
        <div className={cn(commonClasses, "origin-top animate-flap-up z-20 backface-hidden")} style={bottomStyle}>
          <span className="-translate-y-[50%]">{next}</span>
        </div>
      )}

      {/* Mechanical Hinge Line - clearly visible black line */}
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black z-30" />

      {/* Side highlights for depth */}
      <div className="absolute inset-y-0 left-0 w-[1px] bg-white/5 z-40 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-[1px] bg-black/40 z-40 pointer-events-none" />
    </div>
  );
});

SplitFlapChar.displayName = "SplitFlapChar";

interface AirportBoardProps {
  text: string;
  className?: string;
  padLength?: number;
}

export const AirportBoard = ({ text, className, padLength }: AirportBoardProps) => {
  const [letters, setLetters] = useState<string[]>([]);

  useEffect(() => {
    const upperText = text.toUpperCase();
    const chars = upperText.split("");
    if (padLength) {
      while (chars.length < padLength) chars.push(" ");
    }
    setLetters(chars);
  }, [text, padLength]);

  return (
    <div
      className={cn("inline-flex bg-[#0a0a0a] p-1 rounded-sm shadow-inner border border-white/10", className)}
      aria-label={text}
    >
      {letters.map((char, i) => (
        <SplitFlapChar
          key={i}
          char={char}
          // Staggered delay: base + random for mechanical feel
          delay={i * 30 + Math.random() * 150}
          className="text-base md:text-lg lg:text-xl w-[2.2ch] h-[1.4em]"
        />
      ))}
    </div>
  );
};

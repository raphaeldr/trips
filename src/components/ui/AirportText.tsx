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

      // Add random delay before starting to spin, like the reference code
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
      const nextCharIdx = (currentIdx + 1) % CHARS.length;
      const nextChar = CHARS[nextCharIdx];

      // Update state for render
      setCurrent(currentRef.current);
      setNext(nextChar);

      // Update ref for logic
      currentRef.current = nextChar;

      // Trigger flip animation reset
      setTimeout(() => {
        setIsFlipping(false);
      }, 100); // Wait for half animation cycle roughly
    }, 150); // Speed of flap change
  };

  const commonClasses =
    "absolute left-0 w-full overflow-hidden flex items-center justify-center bg-[#1e1e1e] text-white font-mono font-bold border-x border-[#111]";

  // Dynamic height styles
  const topStyle = {
    height: "50%",
    top: 0,
    alignItems: "flex-end",
    borderTopLeftRadius: "0.15em",
    borderTopRightRadius: "0.15em",
    borderBottom: "1px solid rgba(0,0,0,0.4)",
  };
  const bottomStyle = {
    height: "50%",
    bottom: 0,
    alignItems: "flex-start",
    borderBottomLeftRadius: "0.15em",
    borderBottomRightRadius: "0.15em",
    borderTop: "1px solid rgba(0,0,0,0.1)",
  };

  return (
    <div className={cn("relative inline-block w-[0.8em] h-[1.2em] perspective-[300px] bg-[#111] mx-[1px]", className)}>
      {/* Static Top (Shows Next) */}
      <div className={commonClasses} style={topStyle}>
        <span className="translate-y-[50%]">{next}</span>
      </div>

      {/* Static Bottom (Shows Current) */}
      <div className={commonClasses} style={bottomStyle}>
        <span className="-translate-y-[50%]">{current}</span>
      </div>

      {/* Flapping Top (Shows Current) - Flips Down */}
      {isFlipping && (
        <div className={cn(commonClasses, "origin-bottom animate-flap-down z-20 backface-hidden")} style={topStyle}>
          <span className="translate-y-[50%]">{current}</span>
        </div>
      )}

      {/* Flapping Bottom (Shows Next) - Flips Up (technically hidden until top drops, simplified here for visual effect) */}
      {isFlipping && (
        <div className={cn(commonClasses, "origin-top animate-flap-up z-20 backface-hidden")} style={bottomStyle}>
          <span className="-translate-y-[50%]">{next}</span>
        </div>
      )}

      {/* Mechanical Hinge Line */}
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-black/80 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
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
    <div className={cn("inline-flex bg-[#111] px-1 py-1 rounded", className)} aria-label={text}>
      {letters.map((char, i) => (
        <SplitFlapChar
          key={i}
          char={char}
          // Random delay for realism as requested in provided code snippet logic (20 * i + random)
          delay={i * 50 + Math.random() * 200}
          className="text-sm md:text-base lg:text-lg w-[1.8ch] h-[2.4ch]"
        />
      ))}
    </div>
  );
};

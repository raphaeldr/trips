import React, { useEffect, useState, useRef, memo } from "react";
import { cn } from "@/lib/utils";

const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,':()&!?+-";

interface SplitFlapCharProps {
  char: string;
  className?: string;
}

const SplitFlapChar = memo(({ char, className }: SplitFlapCharProps) => {
  const [displayChar, setDisplayChar] = useState(" ");
  const [isFlipping, setIsFlipping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // We keep track of the target internally to handle the animation loop
  const targetCharRef = useRef(char);

  useEffect(() => {
    targetCharRef.current = char.toUpperCase();

    // If already at target, do nothing
    if (displayChar === targetCharRef.current) return;

    // Start cycling if not already running
    if (!intervalRef.current) {
      startCycling();
    }
  }, [char]);

  const startCycling = () => {
    // Clear any existing interval just in case
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayChar((prev) => {
        const currentIdx = CHARS.indexOf(prev) === -1 ? 0 : CHARS.indexOf(prev);
        const targetIdx = CHARS.indexOf(targetCharRef.current) === -1 ? 0 : CHARS.indexOf(targetCharRef.current);

        // If we reached the target, stop
        if (currentIdx === targetIdx) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsFlipping(false);
          return prev;
        }

        // Otherwise advance one character
        setIsFlipping(true);
        const nextIdx = (currentIdx + 1) % CHARS.length;
        return CHARS[nextIdx];
      });
    }, 70); // Speed of the flip
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div
      className={cn(
        "relative inline-block w-[0.6em] h-[1em] text-center font-mono bg-[#222] text-white rounded-[2px] overflow-hidden shadow-sm mx-[1px]",
        className,
      )}
    >
      {/* Top Half (Static) */}
      <div className="absolute top-0 left-0 right-0 h-1/2 overflow-hidden bg-[#222] border-b border-black/40 z-0">
        <span className="absolute top-0 left-0 right-0 leading-[1em]">{displayChar}</span>
      </div>

      {/* Bottom Half (Static) */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 overflow-hidden bg-[#222] z-0">
        <span className="absolute bottom-0 left-0 right-0 leading-[1em] translate-y-[-50%]">{displayChar}</span>
      </div>

      {/* Animation Overlay (Simulates the flip) */}
      {isFlipping && <div className="absolute inset-0 z-10 animate-pulse bg-white/5 pointer-events-none" />}

      {/* Split Line */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/60 z-20 shadow-[0_1px_0_rgba(255,255,255,0.1)]" />
    </div>
  );
});

SplitFlapChar.displayName = "SplitFlapChar";

interface AirportBoardProps {
  text: string;
  className?: string;
  padLength?: number; // Ensure board has fixed width if needed
}

export const AirportBoard = ({ text, className, padLength }: AirportBoardProps) => {
  const [letters, setLetters] = useState<string[]>([]);

  useEffect(() => {
    // Pad or truncate text to ensure stable grid if needed, or just split
    const upperText = text.toUpperCase();
    const chars = upperText.split("");
    if (padLength) {
      while (chars.length < padLength) chars.push(" ");
    }
    setLetters(chars);
  }, [text, padLength]);

  return (
    <div className={cn("inline-flex flex-wrap", className)} aria-label={text}>
      {letters.map((char, i) => (
        <SplitFlapChar
          key={i}
          char={char}
          className="text-xs md:text-sm lg:text-base w-[12px] md:w-[16px] h-[18px] md:h-[24px] bg-[#1a1a1a] text-[#e0e0e0] rounded-sm"
        />
      ))}
    </div>
  );
};

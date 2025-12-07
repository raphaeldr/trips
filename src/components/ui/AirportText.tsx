import React, { useEffect, useState, useRef, memo } from "react";
import { cn } from "@/lib/utils";

const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,':()&!?+-";

interface SplitFlapCharProps {
  char: string;
  className?: string;
}

const SplitFlapChar = memo(({ char, className }: SplitFlapCharProps) => {
  const [displayChar, setDisplayChar] = useState(" ");
  const [prevChar, setPrevChar] = useState(" ");
  const [isFlipping, setIsFlipping] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const targetCharRef = useRef(char);

  useEffect(() => {
    targetCharRef.current = char.toUpperCase();

    if (displayChar === targetCharRef.current) return;

    if (!intervalRef.current) {
      startCycling();
    }
  }, [char]);

  const startCycling = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayChar((current) => {
        const currentIdx = CHARS.indexOf(current) === -1 ? 0 : CHARS.indexOf(current);
        const targetIdx = CHARS.indexOf(targetCharRef.current) === -1 ? 0 : CHARS.indexOf(targetCharRef.current);

        if (currentIdx === targetIdx) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsFlipping(false);
          return current;
        }

        setIsFlipping(true);
        setPrevChar(current); // Keep track of previous char for animation (if we were doing full 3d flip)
        const nextIdx = (currentIdx + 1) % CHARS.length;
        return CHARS[nextIdx];
      });
    }, 70);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Based on the CSS provided:
  // .departure-board span.letter style
  const letterStyle =
    "inline-block w-[1em] mx-[0.1em] h-[1.3em] text-center relative text-[#eee] font-[Helvetica,Arial,sans-serif]";

  // Box shadows from the CSS
  const shadowStyle = {
    boxShadow: `
      inset 0 -0.07em 0 rgba(50, 50, 50, 0.7),
      inset 0 -0.14em 0 rgba(0, 0, 0, 0.7),
      inset 0.14em 0 0.28em rgba(0, 0, 0, 0.9),
      inset -0.14em 0 0.28em rgba(0, 0, 0, 0.9),
      0 0.07em 0 rgba(255, 255, 255, 0.2)
    `,
  };

  return (
    <div className={cn(letterStyle, "bg-[#1e1e1e] rounded-[0.21em] overflow-hidden", className)} style={shadowStyle}>
      {/* Top Flap */}
      <div className="absolute top-0 left-0 w-full h-[0.65em] overflow-hidden bg-[#1e1e1e] z-10">
        <span className="absolute top-0 left-0 w-full text-center leading-[1.3em]">{displayChar}</span>
        {/* Top fold shading line from CSS :before */}
        <div className="absolute bottom-0 left-0 w-full h-0 border-b-[0.07em] border-[rgba(0,0,0,0.4)] z-20"></div>
      </div>

      {/* Bottom Flap */}
      <div className="absolute top-[0.65em] left-0 w-full h-[0.65em] overflow-hidden bg-[#1e1e1e] z-0">
        <span className="absolute top-[-0.65em] left-0 w-full text-center leading-[1.3em]">{displayChar}</span>
        {/* Bottom fold highlight line from CSS :before */}
        <div className="absolute top-0 left-0 w-full h-0 border-t-[0.07em] border-[rgba(255,255,255,0.08)] z-20"></div>
      </div>

      {/* Mechanical Fold Line (The split) */}
      <div className="absolute top-[0.62em] left-0 w-full h-[0.06em] bg-black/80 z-30" />

      {/* Flip Animation Overlay */}
      {isFlipping && <div className="absolute inset-0 z-40 bg-black/10 animate-pulse pointer-events-none" />}
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
    <div className={cn("inline-flex flex-wrap p-[0.15em] bg-[#1e1e1e] rounded-[0.21em]", className)} aria-label={text}>
      {letters.map((char, i) => (
        <SplitFlapChar key={i} char={char} className="text-sm md:text-base lg:text-lg" />
      ))}
    </div>
  );
};

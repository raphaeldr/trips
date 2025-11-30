import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface AirportBoardProps {
  text: string;
  className?: string;
}

// A mix of characters to cycle through for the "flipping" effect
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-., ";

export const AirportBoard = ({ text, className = "" }: AirportBoardProps) => {
  const [renderedChars, setRenderedChars] = useState<string[]>([]);
  const requestRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  // We use a ref for state that updates rapidly to avoid closure staleness in the animation loop
  const stateRef = useRef({
    currentIndex: 0,
    currentCycles: 0,
    charsArray: [] as string[],
    targetText: text,
  });

  useEffect(() => {
    // Initialize/Reset animation state when text changes
    const initialArray = Array(text.length).fill(" "); // Start with blank spaces

    stateRef.current = {
      currentIndex: 0,
      currentCycles: 0,
      charsArray: initialArray,
      targetText: text,
    };

    setRenderedChars(initialArray);

    // Start the animation loop
    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [text]);

  const animate = (time: number) => {
    // Control speed: Update every ~20ms for "super fast" flipping
    if (time - lastUpdateRef.current < 20) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }
    lastUpdateRef.current = time;

    const state = stateRef.current;

    // Stop if we've resolved the entire string
    if (state.currentIndex >= state.targetText.length) {
      return;
    }

    // "Stay longer" logic: Flip the current character X times before locking it
    // 5 flips * 20ms = ~100ms dwell time per character
    const FLIPS_BEFORE_LOCK = 5;

    if (state.currentCycles < FLIPS_BEFORE_LOCK) {
      // Phase 1: Cycle through random characters at the current index
      state.charsArray[state.currentIndex] = CHARS[Math.floor(Math.random() * CHARS.length)];
      state.currentCycles++;
    } else {
      // Phase 2: Lock the correct character and move to the next index
      state.charsArray[state.currentIndex] = state.targetText[state.currentIndex];
      state.currentIndex++;
      state.currentCycles = 0; // Reset cycle counter for the next character
    }

    // Trigger re-render with new state
    setRenderedChars([...state.charsArray]);

    // Continue loop
    requestRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className={cn("inline-flex flex-wrap justify-center gap-[2px]", className)} aria-label={text}>
      {renderedChars.map((char, i) => (
        <span
          key={i}
          className="inline-flex items-center justify-center min-w-[0.6em] px-1 bg-black/90 text-white rounded-[2px] shadow-sm overflow-hidden"
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </div>
  );
};

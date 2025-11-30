import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface AirportBoardProps {
  text: string;
  className?: string;
}

// The sequence of characters for the mechanical flipping effect.
// Order matters here to create the "sequential" feel.
const FLIP_SEQUENCE = " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,'-&?!/()";

export const AirportBoard = ({ text, className = "" }: AirportBoardProps) => {
  // We keep track of the currently displayed string array
  const [displayChars, setDisplayChars] = useState<string[]>([]);

  // Refs to manage the animation loop and targets without triggering re-renders
  const targetTextRef = useRef(text);
  const currentCharsRef = useRef<string[]>([]);
  const frameRef = useRef<number>(0);

  // Initialize state on mount
  useEffect(() => {
    // Pad initial state with spaces to match length
    const initial = Array(text.length).fill(" ");
    setDisplayChars(initial);
    currentCharsRef.current = initial;
  }, []);

  // Update target when prop changes
  useEffect(() => {
    targetTextRef.current = text;

    // Adjust current array length if text length changes
    if (currentCharsRef.current.length !== text.length) {
      const newChars = [...currentCharsRef.current];
      if (newChars.length < text.length) {
        // Pad with spaces if growing
        while (newChars.length < text.length) newChars.push(" ");
      } else {
        // Trim if shrinking
        newChars.length = text.length;
      }
      currentCharsRef.current = newChars;
      setDisplayChars(newChars);
    }
  }, [text]);

  useEffect(() => {
    const animate = () => {
      let changed = false;
      const target = targetTextRef.current;
      const current = currentCharsRef.current;
      const next = [...current];

      for (let i = 0; i < target.length; i++) {
        const charTarget = target[i];
        const charCurrent = current[i];

        // If this character is already correct, skip it
        if (charCurrent === charTarget) continue;

        // If we need to change this character
        changed = true;

        // Find current index in our sequence
        const currentIndex = FLIP_SEQUENCE.indexOf(charCurrent);
        const targetIndex = FLIP_SEQUENCE.indexOf(charTarget);

        // If current char isn't in our sequence (unexpected), snap to space or target
        if (currentIndex === -1) {
          next[i] = FLIP_SEQUENCE[0];
          continue;
        }

        // Calculate next character in sequence
        // We simply move to the next char in the list.
        // If we are at the end, we loop back to start.
        const nextIndex = (currentIndex + 1) % FLIP_SEQUENCE.length;
        next[i] = FLIP_SEQUENCE[nextIndex];
      }

      if (changed) {
        currentCharsRef.current = next;
        setDisplayChars(next);
        // Slower timeout for that "mechanical" tick feel (approx 60ms)
        setTimeout(() => {
          frameRef.current = requestAnimationFrame(animate);
        }, 50);
      }
    };

    // Start animation
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [text]); // Re-trigger animation loop when text goal changes

  return (
    <div className={cn("split-flap-board", className)} aria-label={text}>
      {displayChars.map((char, index) => (
        <span key={index} className="split-flap-char font-mono text-white" data-char={char}>
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </div>
  );
};

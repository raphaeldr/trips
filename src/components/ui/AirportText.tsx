import { useEffect, useState } from "react";

interface AirportTextProps {
  text: string;
  className?: string;
}

// Characters to cycle through during the animation
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789- ";

export const AirportText = ({ text, className = "" }: AirportTextProps) => {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    let iteration = 0;
    const intervalSpeed = 300; // Speed of character cycling in ms

    // We want the text to start scrambling immediately
    // If the text is shorter than current, we might want to pad it,
    // but for this simple effect, we'll just build up to the new text length.

    const interval = setInterval(() => {
      setDisplayText(() => {
        let result = "";

        for (let i = 0; i < text.length; i++) {
          // Logic: We settle characters from left to right.
          // Each character cycles for a bit (i) then settles.
          // '10' is a buffer so the first character scrambles for 10 frames before settling.
          if (iteration >= 10 + i) {
            result += text[i];
          } else {
            // Pick a random character
            result += CHARS[Math.floor(Math.random() * CHARS.length)];
          }
        }

        return result;
      });

      // Stop condition: once we've iterated enough for the last character to settle
      if (iteration >= 10 + text.length) {
        clearInterval(interval);
        setDisplayText(text); // Ensure exact final match
      }

      iteration += 1; // Increment iteration speed
    }, intervalSpeed);

    return () => clearInterval(interval);
  }, [text]);

  return <span className={className}>{displayText}</span>;
};

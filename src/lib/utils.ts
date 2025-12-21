import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "@/integrations/supabase/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves a media path to a full URL.
 * Handles both relative Supabase paths and absolute external URLs.
 */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  // Ultra-safe check: cast to string and look for substring
  const str = String(path);
  console.log('Resolving media URL:', str);

  if (str.includes("http")) {
    console.log('-> Detected as external');
    return str.trim();
  }

  console.log('-> Treating as Supabase storage path');
  return supabase.storage.from("photos").getPublicUrl(str.trim()).data.publicUrl;
}

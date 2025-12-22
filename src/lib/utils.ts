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
/**
 * Resolves a media path to a full URL.
 * Handles both relative Supabase paths and absolute external URLs.
 * Supports Supabase Image Transformations.
 */
interface ResolveOptions {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
}

export function resolveMediaUrl(path: string | null | undefined, options?: ResolveOptions): string | null {
  if (!path) return null;

  // Ultra-safe check: cast to string and look for substring
  const str = String(path);
  // console.log('Resolving media URL:', str); // Reduced logging spam

  if (str.includes("http")) {
    // console.log('-> Detected as external');
    return str.trim();
  }

  // console.log('-> Treating as Supabase storage path');

  if (options) {
    return supabase.storage.from("photos").getPublicUrl(str.trim(), {
      transform: {
        width: options.width,
        height: options.height,
        resize: options.resize || 'contain', // contain ensures aspect ratio is preserved
      },
    }).data.publicUrl;
  }

  return supabase.storage.from("photos").getPublicUrl(str.trim()).data.publicUrl;
}

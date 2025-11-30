import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { BottomNav } from "@/components/BottomNav";
import { MapEmbed } from "@/components/MapEmbed";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import type { Destination } from "@/types";
import { AirportBoard } from "@/components/ui/AirportBoard";

const Home = () => {
  const [textColor, setTextColor] = useState("text-white");
  // Fetch destinations for day counter
  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("*").order("arrival_date", {
        ascending: true,
      });
      if (error) throw error;
      return data;
    },
  });

  // Fetch trip settings for dynamic content
  const { data: tripSettings } = useQuery({
    queryKey: ["tripSettings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_settings").select("*").single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch latest photos for homepage
  const { data: latestPhotos } = useQuery({
    queryKey: ["latestPhotos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        // Removed explicit video exclusion
        .order("created_at", {
          ascending: false,
        })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  // Fetch hero image
  const { data: heroPhoto } = useQuery({
    queryKey: ["heroPhoto"],
    queryFn: async () => {
      const { data, error } = await supabase.from("photos").select("*").eq("is_hero", true).single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch latest blog posts
  const { data: featuredPosts } = useQuery({
    queryKey: ["latestBlogPosts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, destinations(*)")
        .eq("status", "published")
        .order("published_at", {
          ascending: false,
        })
        .limit(2);
      if (error) throw error;
      return data;
    },
  });

  // Fetch unique country count (minus start country)
  const { data: countryCount } = useQuery({
    queryKey: ["countryCount"],
    queryFn: async () => {
      const { data, error } = await supabase.from("destinations").select("country");

      if (error) throw error;

      const uniqueCountries = new Set(data.map((d) => d.country));
      // Subtract 1 for the start country (Luxembourg)
      return Math.max(0, uniqueCountries.size - 1);
    },
  });

  // Fetch total photo count
  const { data: photoCount } = useQuery({
    queryKey: ["photoCount"],
    queryFn: async () => {
      const { count, error } = await supabase.from("photos").select("*", {
        count: "exact",
        head: true,
      });
      if (error) throw error;
      return count || 0;
    },
  });

  // Analyze image brightness and adjust text color
  useEffect(() => {
    if (!heroPhoto) {
      setTextColor("text-white");
      return;
    }
    const img = new Image();
    img.crossOrigin = "Anonymous";

    // Check if it's a video or image
    const isVideo = heroPhoto.mime_type?.startsWith("video/") || heroPhoto.animated_path;
    const mediaUrl =
      isVideo && heroPhoto.animated_path
        ? supabase.storage.from("photos").getPublicUrl(heroPhoto.animated_path).data.publicUrl
        : supabase.storage.from("photos").getPublicUrl(heroPhoto.storage_path).data.publicUrl;

    if (isVideo) {
      // For video, we default to white text as it's hard to analyze video brightness client-side efficiently
      // without loading the video into a canvas. A dark overlay is usually sufficient.
      setTextColor("text-white");
      return;
    }

    img.src = mediaUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        // Sample center area of image (more relevant for text overlay)
        const sampleSize = 200;
        const x = (canvas.width - sampleSize) / 2;
        const y = (canvas.height - sampleSize) / 2;

        // Ensure coordinates are within bounds
        const safeX = Math.max(0, Math.min(x, canvas.width - 1));
        const safeY = Math.max(0, Math.min(y, canvas.height - 1));
        const safeWidth = Math.min(sampleSize, canvas.width - safeX);
        const safeHeight = Math.min(sampleSize, canvas.height - safeY);

        if (safeWidth <= 0 || safeHeight <= 0) return;

        const imageData = ctx.getImageData(safeX,
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const destinationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  country: z.string().min(1, "Country is required"),
  continent: z.string().min(1, "Continent is required"),
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  arrival_date: z.string().min(1, "Arrival date is required"),
  departure_date: z.string().optional(),
  description: z.string().optional(),
  is_current: z.boolean().default(false),
});

type DestinationFormData = z.infer<typeof destinationSchema>;

interface DestinationFormProps {
  onSuccess: () => void;
}

export const DestinationForm = ({ onSuccess }: DestinationFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<DestinationFormData>({
    resolver: zodResolver(destinationSchema),
    defaultValues: {
      is_current: false,
    }
  });

  const name = watch("name");
  const country = watch("country");

  const getContinent = (countryCode: string): string => {
    const continentMap: Record<string, string> = {
      // Europe
      'GB': 'Europe', 'FR': 'Europe', 'DE': 'Europe', 'IT': 'Europe', 'ES': 'Europe',
      'PT': 'Europe', 'NL': 'Europe', 'BE': 'Europe', 'CH': 'Europe', 'AT': 'Europe',
      'SE': 'Europe', 'NO': 'Europe', 'DK': 'Europe', 'FI': 'Europe', 'IE': 'Europe',
      'PL': 'Europe', 'CZ': 'Europe', 'HU': 'Europe', 'RO': 'Europe', 'GR': 'Europe',
      // Asia
      'JP': 'Asia', 'CN': 'Asia', 'KR': 'Asia', 'IN': 'Asia', 'TH': 'Asia',
      'VN': 'Asia', 'SG': 'Asia', 'MY': 'Asia', 'ID': 'Asia', 'PH': 'Asia',
      'TR': 'Asia', 'AE': 'Asia', 'SA': 'Asia', 'IL': 'Asia', 'KZ': 'Asia',
      // North America
      'US': 'North America', 'CA': 'North America', 'MX': 'North America',
      // South America
      'BR': 'South America', 'AR': 'South America', 'CL': 'South America',
      'PE': 'South America', 'CO': 'South America', 'EC': 'South America',
      // Africa
      'ZA': 'Africa', 'EG': 'Africa', 'MA': 'Africa', 'KE': 'Africa', 'TZ': 'Africa',
      // Oceania
      'AU': 'Oceania', 'NZ': 'Oceania', 'FJ': 'Oceania',
    };
    return continentMap[countryCode] || 'Unknown';
  };

  useEffect(() => {
    const geocodeLocation = async () => {
      if (!name || !country) return;

      setIsGeocoding(true);
      try {
        const { data: tokenData } = await supabase.functions.invoke('get-mapbox-token');
        const mapboxToken = tokenData?.token;

        if (!mapboxToken) {
          throw new Error("Mapbox token not available");
        }

        const query = encodeURIComponent(`${name}, ${country}`);
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&limit=1`
        );

        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const [longitude, latitude] = data.features[0].center;
          const context = data.features[0].context || [];

          // Find country code from context
          const countryContext = context.find((c: any) => c.id.startsWith('country'));
          const countryCode = countryContext?.short_code?.toUpperCase();

          setValue("latitude", latitude.toString());
          setValue("longitude", longitude.toString());

          if (countryCode) {
            setValue("continent", getContinent(countryCode));
          }

          toast.success("Location coordinates found!");
        } else {
          toast.error("Location not found. Please enter coordinates manually.");
        }
      } catch (error) {
        console.error("Geocoding error:", error);
        toast.error("Failed to geocode location");
      } finally {
        setIsGeocoding(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      geocodeLocation();
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [name, country, setValue]);

  const onSubmit = async (data: DestinationFormData) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('destinations').insert({
        name: data.name,
        country: data.country,
        continent: data.continent,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        arrival_date: data.arrival_date,
        departure_date: data.departure_date || null,
        description: data.description || null,
        is_current: data.is_current,
      });

      if (error) throw error;

      toast.success("Destination added successfully!");
      reset();
      onSuccess();
    } catch (error) {
      console.error('Error adding destination:', error);
      toast.error("Failed to add destination");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Location name</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="e.g., Tokyo"
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            {...register("country")}
            placeholder="e.g., Japan"
          />
          {errors.country && (
            <p className="text-sm text-destructive mt-1">{errors.country.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="continent">Continent {isGeocoding && "(auto-detecting...)"}</Label>
          <Input
            id="continent"
            {...register("continent")}
            placeholder="e.g., Asia"
            readOnly
            className="bg-muted"
          />
          {errors.continent && (
            <p className="text-sm text-destructive mt-1">{errors.continent.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="arrival_date">Arrival date</Label>
          <Input
            id="arrival_date"
            type="date"
            {...register("arrival_date")}
          />
          {errors.arrival_date && (
            <p className="text-sm text-destructive mt-1">{errors.arrival_date.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="departure_date">Departure date (optional)</Label>
          <Input
            id="departure_date"
            type="date"
            {...register("departure_date")}
          />
        </div>

        <div>
          <Label htmlFor="latitude">Latitude {isGeocoding && "(auto-detecting...)"}</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            {...register("latitude")}
            placeholder="e.g., 35.6762"
            readOnly
            className="bg-muted"
          />
          {errors.latitude && (
            <p className="text-sm text-destructive mt-1">{errors.latitude.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="longitude">Longitude {isGeocoding && "(auto-detecting...)"}</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            {...register("longitude")}
            placeholder="e.g., 139.6503"
            readOnly
            className="bg-muted"
          />
          {errors.longitude && (
            <p className="text-sm text-destructive mt-1">{errors.longitude.message}</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_current"
            {...register("is_current")}
          />
          <Label htmlFor="is_current">Current location</Label>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          {...register("description")}
          placeholder="Brief description of the destination..."
          rows={3}
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          "Add destination"
        )}
      </Button>
    </form>
  );
};

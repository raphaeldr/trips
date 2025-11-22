import { useState } from "react";
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
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<DestinationFormData>({
    resolver: zodResolver(destinationSchema),
    defaultValues: {
      is_current: false,
    }
  });

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
          <Label htmlFor="name">Location Name</Label>
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
          <Label htmlFor="continent">Continent</Label>
          <Input
            id="continent"
            {...register("continent")}
            placeholder="e.g., Asia"
          />
          {errors.continent && (
            <p className="text-sm text-destructive mt-1">{errors.continent.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="arrival_date">Arrival Date</Label>
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
          <Label htmlFor="departure_date">Departure Date (Optional)</Label>
          <Input
            id="departure_date"
            type="date"
            {...register("departure_date")}
          />
        </div>

        <div>
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            {...register("latitude")}
            placeholder="e.g., 35.6762"
          />
          {errors.latitude && (
            <p className="text-sm text-destructive mt-1">{errors.latitude.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            {...register("longitude")}
            placeholder="e.g., 139.6503"
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
          <Label htmlFor="is_current">Current Location</Label>
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
          "Add Destination"
        )}
      </Button>
    </form>
  );
};

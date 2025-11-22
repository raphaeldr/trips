import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, Eye } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { useQuery } from "@tanstack/react-query";

const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  excerpt: z.string().optional(),
  cover_image_url: z.string().optional(),
  meta_description: z.string().optional(),
  destination_id: z.string().optional(),
  status: z.enum(["draft", "published"]),
});

type BlogPostFormData = z.infer<typeof blogPostSchema>;

interface BlogPostFormProps {
  onSuccess: () => void;
  initialData?: any;
}

export const BlogPostForm = ({ onSuccess, initialData }: BlogPostFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState(initialData?.content || '');
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  const { data: destinations } = useQuery({
    queryKey: ["destinations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("arrival_date", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: initialData || {
      status: "draft",
    }
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    if (!initialData) {
      setValue("slug", generateSlug(title));
    }
  };

  const uploadCoverImage = async (file: File) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/covers/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('blog-media')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('blog-media')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const onSubmit = async (data: BlogPostFormData) => {
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let coverImageUrl = data.cover_image_url;
      
      if (coverImageFile) {
        coverImageUrl = await uploadCoverImage(coverImageFile);
      }

      const blogPostData = {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt || null,
        content: content as any,
        cover_image_url: coverImageUrl || null,
        meta_description: data.meta_description || null,
        destination_id: data.destination_id || null,
        status: data.status,
        user_id: user.id,
        published_at: data.status === 'published' ? new Date().toISOString() : null,
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from('blog_posts')
          .update(blogPostData)
          .eq('id', initialData.id);

        if (error) throw error;
        toast.success("Blog post updated successfully!");
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert([blogPostData]);

        if (error) throw error;
        toast.success("Blog post created successfully!");
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving blog post:', error);
      toast.error("Failed to save blog post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          {...register("title")}
          onChange={handleTitleChange}
          placeholder="My Amazing Journey"
        />
        {errors.title && (
          <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="slug">URL Slug</Label>
        <Input
          id="slug"
          {...register("slug")}
          placeholder="my-amazing-journey"
        />
        {errors.slug && (
          <p className="text-sm text-destructive mt-1">{errors.slug.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea
          id="excerpt"
          {...register("excerpt")}
          placeholder="A brief summary of your post..."
          rows={3}
        />
      </div>

      <div>
        <Label htmlFor="cover_image">Cover Image</Label>
        <Input
          id="cover_image"
          type="file"
          accept="image/*"
          onChange={(e) => setCoverImageFile(e.target.files?.[0] || null)}
        />
        {initialData?.cover_image_url && !coverImageFile && (
          <img 
            src={initialData.cover_image_url} 
            alt="Current cover" 
            className="mt-2 h-32 w-auto rounded-lg"
          />
        )}
      </div>

      <div>
        <Label htmlFor="destination">Link to Destination (Optional)</Label>
        <Select 
          onValueChange={(value) => setValue("destination_id", value === "none" ? "" : value)}
          defaultValue={initialData?.destination_id || "none"}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a destination" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No destination</SelectItem>
            {destinations?.map((dest) => (
              <SelectItem key={dest.id} value={dest.id}>
                {dest.name}, {dest.country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="meta_description">Meta Description (SEO)</Label>
        <Textarea
          id="meta_description"
          {...register("meta_description")}
          placeholder="SEO-friendly description..."
          rows={2}
        />
      </div>

      <div>
        <Label>Content</Label>
        <RichTextEditor content={content} onChange={setContent} />
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select 
          onValueChange={(value) => setValue("status", value as "draft" | "published")}
          defaultValue={watch("status")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          onClick={() => setValue("status", "draft")}
          variant="outline"
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </>
          )}
        </Button>

        <Button 
          type="submit" 
          disabled={isSubmitting}
          onClick={() => setValue("status", "published")}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Publish
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
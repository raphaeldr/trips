// DEPRECATED: Journal/blog feature, kept temporarily for cleanup safety
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { BookOpen, ChevronRight } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  published_at: string | null;
  excerpt: string | null;
  destinations: {
    name: string;
    country: string;
  } | null;
}

interface LatestStoriesProps {
  posts: BlogPost[] | undefined;
}

export const LatestStories = ({ posts }: LatestStoriesProps) => {
  if (!posts?.length) {
    return null;
  }

  return (
    <div className="mx-5 bg-card border border-border rounded-2xl p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Latest Stories
          </h3>
        </div>
        <Link
          to="/blog"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {posts.slice(0, 3).map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.slug}`}
            className="block group hover:bg-secondary/40 -mx-2 px-3 py-2 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span className="tabular-nums">
                {format(
                  new Date(post.published_at || new Date()),
                  "d MMM yyyy"
                )}
              </span>
              {post.destinations && (
                <>
                  <span className="text-border">•</span>
                  <span className="text-primary truncate">
                    {post.destinations.name}
                  </span>
                </>
              )}
            </div>
            <p className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
};

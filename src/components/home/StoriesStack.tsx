// DEPRECATED: Journal/blog feature, kept temporarily for cleanup safety
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, BookOpen } from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  published_at: string | null;
  excerpt: string | null;
  destinations?: {
    name: string;
    country: string;
  } | null;
}

interface StoriesStackProps {
  posts: BlogPost[] | undefined;
}

export const StoriesStack = ({ posts }: StoriesStackProps) => {
  if (!posts?.length) {
    return null;
  }

  const latestPost = posts[0];
  const otherPosts = posts.slice(1, 3);

  return (
    <section className="px-4 py-6">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="font-handwritten text-2xl text-foreground">From the journal</h2>
          <p className="text-sm text-muted-foreground">Stories from our trip</p>
        </div>
        <Link
          to="/blog"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          All stories <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Featured post card */}
      <Link
        to={`/blog/${latestPost.slug}`}
        className="block bg-card rounded-2xl p-4 shadow-card hover:shadow-elegant transition-all duration-300 mb-3"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>
                {latestPost.published_at
                  ? format(new Date(latestPost.published_at), "d MMMM yyyy")
                  : "Draft"}
              </span>
              {latestPost.destinations && (
                <>
                  <span>•</span>
                  <span>{latestPost.destinations.name}</span>
                </>
              )}
            </div>
            <h3 className="font-display font-semibold text-foreground line-clamp-2">
              {latestPost.title}
            </h3>
            {latestPost.excerpt && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {latestPost.excerpt}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Other posts - compact list */}
      {otherPosts.length > 0 && (
        <div className="space-y-2">
          {otherPosts.map((post) => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-primary/40" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                <p className="text-xs text-muted-foreground">
                  {post.published_at
                    ? format(new Date(post.published_at), "d MMM")
                    : "Draft"}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

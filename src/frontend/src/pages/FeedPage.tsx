import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import { MobileHeader } from "../components/TopNav";
import { useGetFeed } from "../hooks/useQueries";

function PostSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-4 space-y-3 card-glow">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-2.5 w-16 rounded" />
        </div>
      </div>
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
}

export default function FeedPage() {
  const [page, setPage] = useState(0);
  const {
    data: posts,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useGetFeed(page);

  const hasMore = posts?.length === 10;
  const hasPrev = page > 0;

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />

      {/* Islamic banner for desktop */}
      <div className="hidden md:block bg-islamic-dark py-3 px-4 mb-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-islamic-gold font-arabic text-lg">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <p className="text-white/60 text-xs mt-0.5">
            In the name of Allah, the Most Gracious, the Most Merciful
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Create post */}
        <CreatePost />

        {/* Feed header */}
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-foreground text-base">
            Family Feed
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-muted-foreground hover:text-islamic-green hover:bg-islamic-green/10 rounded-lg h-8 w-8 p-0"
          >
            <RefreshCw
              className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div data-ocid="feed.loading_state" className="space-y-4">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div
            data-ocid="feed.error_state"
            className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 text-center"
          >
            <p className="text-destructive font-semibold text-sm mb-2">
              Failed to load feed
            </p>
            <p className="text-muted-foreground text-xs mb-4">
              Please check your connection and try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && posts?.length === 0 && (
          <div
            data-ocid="feed.empty_state"
            className="bg-card rounded-2xl card-glow p-10 text-center"
          >
            <div className="w-16 h-16 rounded-2xl islamic-gradient flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🌙</span>
            </div>
            <h3 className="font-display font-bold text-foreground text-lg mb-2">
              No posts yet
            </h3>
            <p className="text-muted-foreground text-sm">
              Be the first to share something with the family!
            </p>
            <p className="text-islamic-green font-arabic text-base mt-3">
              جَزَاكَ اللَّهُ خَيْرًا
            </p>
          </div>
        )}

        {/* Posts list */}
        {!isLoading && !isError && posts && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post, i) => (
              <PostCard key={post.id} post={post} ocidIndex={i + 1} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && (posts?.length ?? 0) > 0 && (
          <div className="flex items-center justify-center gap-3 py-4">
            <Button
              variant="outline"
              size="sm"
              data-ocid="feed.pagination_prev"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={!hasPrev || isFetching}
              className="border-border hover:border-islamic-green hover:text-islamic-green gap-1.5 rounded-xl"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground font-medium">
              Page {page + 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              data-ocid="feed.pagination_next"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore || isFetching}
              className="border-border hover:border-islamic-green hover:text-islamic-green gap-1.5 rounded-xl"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {isFetching && !isLoading && (
          <div className="flex justify-center py-3">
            <Loader2 className="w-5 h-5 text-islamic-green animate-spin" />
          </div>
        )}

        {/* Footer */}
        <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-islamic-green transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </footer>
      </div>
    </div>
  );
}

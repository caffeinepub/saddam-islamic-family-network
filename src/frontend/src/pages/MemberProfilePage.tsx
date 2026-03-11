import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Principal } from "@icp-sdk/core/principal";
import { ArrowLeft, User } from "lucide-react";
import { motion } from "motion/react";
import PostCard from "../components/PostCard";
import { MobileHeader } from "../components/TopNav";
import { useGetUserPosts, useGetUserProfile } from "../hooks/useQueries";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface MemberProfilePageProps {
  principal: Principal;
  onBack: () => void;
}

export default function MemberProfilePage({
  principal,
  onBack,
}: MemberProfilePageProps) {
  const { data: profile, isLoading: profileLoading } =
    useGetUserProfile(principal);
  const { data: posts, isLoading: postsLoading } = useGetUserPosts(
    principal,
    0,
  );

  const username = profile?.username ?? `${principal.toString().slice(0, 8)}…`;

  let profilePhotoUrl: string | undefined;
  try {
    profilePhotoUrl = profile?.profilePhotoId?.getDirectURL();
  } catch {
    profilePhotoUrl = undefined;
  }

  let coverPhotoUrl: string | undefined;
  try {
    coverPhotoUrl = profile?.coverPhotoId?.getDirectURL();
  } catch {
    coverPhotoUrl = undefined;
  }

  return (
    <div
      data-ocid="member-profile.section"
      className="min-h-screen bg-background"
    >
      <MobileHeader />

      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <div className="pt-20 px-4 pb-2">
          <Button
            data-ocid="member-profile.back_button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2 text-muted-foreground hover:text-islamic-green hover:bg-islamic-green/10 rounded-xl font-medium -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Family
          </Button>
        </div>

        {/* Cover Photo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="relative w-full h-40 md:h-52 bg-islamic-dark overflow-hidden"
        >
          {profileLoading ? (
            <Skeleton className="w-full h-full" />
          ) : coverPhotoUrl ? (
            <img
              src={coverPhotoUrl}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full pattern-overlay opacity-80" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-islamic-dark/60 to-transparent" />
        </motion.div>

        {/* Profile info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="relative px-4 pb-4"
        >
          <div className="flex items-end justify-between -mt-12 mb-4">
            {/* Avatar */}
            <div className="relative">
              {profileLoading ? (
                <Skeleton className="w-24 h-24 rounded-full border-4 border-background" />
              ) : (
                <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt={username}
                      className="object-cover w-full h-full rounded-full"
                    />
                  ) : (
                    <AvatarFallback className="bg-islamic-green text-white text-2xl font-bold">
                      {getInitials(username)}
                    </AvatarFallback>
                  )}
                </Avatar>
              )}
            </div>
          </div>

          {/* Username & bio */}
          {profileLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-4 w-64 rounded" />
            </div>
          ) : (
            <div>
              <h1 className="font-display font-bold text-xl text-foreground">
                {username}
              </h1>
              {profile?.bio && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {profile.bio}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {principal.toString().slice(0, 16)}…
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Divider with Arabic text */}
        <div className="px-4 mb-4">
          <div className="bg-card rounded-xl py-2 px-4 text-center border border-border">
            <span className="text-xs font-arabic text-islamic-green">
              مَا شَاءَ اللَّهُ — الحمد لله
            </span>
          </div>
        </div>

        {/* User posts */}
        <div className="px-4 pb-8">
          <h2 className="font-display font-bold text-foreground text-base mb-4">
            {profileLoading ? "Posts" : `${username}'s Posts`}
          </h2>

          {postsLoading && (
            <div data-ocid="member-profile.loading_state" className="space-y-4">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="bg-card rounded-2xl p-4 space-y-3 card-glow"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full" />
                    <Skeleton className="h-3 w-28 rounded" />
                  </div>
                  <Skeleton className="h-4 w-full rounded" />
                  <Skeleton className="h-4 w-2/3 rounded" />
                </div>
              ))}
            </div>
          )}

          {!postsLoading && (posts?.length ?? 0) === 0 && (
            <motion.div
              data-ocid="member-profile.empty_state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-card rounded-2xl card-glow p-8 text-center"
            >
              <span className="text-3xl block mb-3">📝</span>
              <p className="text-muted-foreground text-sm">
                {username} hasn't posted anything yet.
              </p>
            </motion.div>
          )}

          {!postsLoading && posts && posts.length > 0 && (
            <motion.div
              className="space-y-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: {
                  transition: { staggerChildren: 0.07 },
                },
              }}
            >
              {posts.map((post, i) => (
                <motion.div
                  key={post.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <PostCard post={post} ocidIndex={i + 1} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

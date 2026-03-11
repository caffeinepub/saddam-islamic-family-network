import type { Principal } from "@icp-sdk/core/principal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import type { ExternalBlob } from "../backend";
import type { NotificationView, PostView, UserProfile } from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export interface FeedAuthor {
  principal: Principal;
  profile: UserProfile | null;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(user: Principal | undefined) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) throw new Error("Actor or user not available");
      return actor.getUserProfile(user);
    },
    enabled: !!actor && !actorFetching && !!user,
    staleTime: 60_000,
  });
}

export function useSaveUserProfile() {
  const { actor } = useActor();
  const actorRef = useRef(actor);
  actorRef.current = actor;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      const currentActor = actorRef.current;
      if (!currentActor) throw new Error("Actor not available");
      await currentActor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
      queryClient.invalidateQueries({ queryKey: ["feedAuthors"] });
    },
  });
}

// ─── Feed / Posts ─────────────────────────────────────────────────────────────

export function useGetFeed(page: number) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<PostView[]>({
    queryKey: ["feed", page],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFeed(BigInt(page), BigInt(10));
    },
    enabled: !!actor && !actorFetching,
    staleTime: 30_000,
  });
}

export function useGetUserPosts(user: Principal | undefined, page: number) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<PostView[]>({
    queryKey: ["userPosts", user?.toString(), page],
    queryFn: async () => {
      if (!actor || !user) return [];
      return actor.getUserPosts(user, BigInt(page), BigInt(10));
    },
    enabled: !!actor && !actorFetching && !!user,
    staleTime: 30_000,
  });
}

export function useCreatePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      content,
      imageBlobId,
    }: {
      content: string;
      imageBlobId: ExternalBlob | null;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.createPost(content, imageBlobId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useLikePost() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { identity } = useInternetIdentity();

  return useMutation({
    mutationFn: async ({
      postId,
      liked,
    }: {
      postId: string;
      liked: boolean;
    }) => {
      if (!actor) throw new Error("Actor not available");
      if (liked) {
        await actor.unlikePost(postId);
      } else {
        await actor.likePost(postId);
      }
    },
    onMutate: async ({ postId, liked }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["feed"] });
      const previousFeeds = queryClient.getQueriesData<PostView[]>({
        queryKey: ["feed"],
      });

      queryClient.setQueriesData<PostView[]>({ queryKey: ["feed"] }, (old) => {
        if (!old) return old;
        return old.map((post) => {
          if (post.id !== postId) return post;
          const principal = identity?.getPrincipal();
          if (!principal) return post;
          const likes = liked
            ? post.likes.filter((p) => p.toString() !== principal.toString())
            : [...post.likes, principal];
          return { ...post, likes };
        });
      });

      return { previousFeeds };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousFeeds) {
        for (const [queryKey, data] of context.previousFeeds) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
    }: {
      postId: string;
      content: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.addComment(postId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export function useReplyToComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      commentId,
      content,
    }: {
      postId: string;
      commentId: string;
      content: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      await actor.replyToComment(postId, commentId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

// ─── Feed Authors / Family Members ────────────────────────────────────────────

export function useGetFeedAuthors() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<FeedAuthor[]>({
    queryKey: ["feedAuthors"],
    queryFn: async () => {
      if (!actor) return [];

      // Fetch pages 0, 1, 2 in parallel
      const [page0, page1, page2] = await Promise.all([
        actor.getFeed(BigInt(0), BigInt(10)),
        actor.getFeed(BigInt(1), BigInt(10)),
        actor.getFeed(BigInt(2), BigInt(10)),
      ]);

      const allPosts = [...page0, ...page1, ...page2];

      // Extract unique author principals
      const seenPrincipals = new Map<string, Principal>();
      for (const post of allPosts) {
        const key = post.author.toString();
        if (!seenPrincipals.has(key)) {
          seenPrincipals.set(key, post.author);
        }
      }

      // Fetch all profiles in parallel
      const entries = Array.from(seenPrincipals.values());
      const profiles = await Promise.all(
        entries.map((principal) =>
          actor.getUserProfile(principal).catch(() => null),
        ),
      );

      return entries.map((principal, i) => ({
        principal,
        profile: profiles[i] ?? null,
      }));
    },
    enabled: !!actor && !actorFetching,
    staleTime: 60_000,
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function useGetMyNotifications() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<NotificationView[]>({
    queryKey: ["myNotifications"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMyNotifications();
    },
    enabled: !!actor && !actorFetching,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useMarkNotificationRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notifId: string) => {
      if (!actor) throw new Error("Actor not available");
      await actor.markNotificationRead(notifId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      await actor.markAllNotificationsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myNotifications"] });
    },
  });
}

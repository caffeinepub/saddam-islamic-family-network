import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Heart, MessageCircle, Reply, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { CommentView, PostView } from "../backend.d";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddComment,
  useGetUserProfile,
  useLikePost,
  useReplyToComment,
} from "../hooks/useQueries";

function formatTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const diff = Date.now() - ms;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ms).toLocaleDateString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface AuthorDisplayProps {
  principal: { toString(): string };
  size?: "sm" | "md";
}

function AuthorDisplay({ principal, size = "md" }: AuthorDisplayProps) {
  const { data: profile } = useGetUserProfile(
    principal as Parameters<typeof useGetUserProfile>[0],
  );
  const name = profile?.username ?? `${principal.toString().slice(0, 8)}…`;
  const avatarSize = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";

  let profilePhotoUrl: string | undefined;
  try {
    profilePhotoUrl = profile?.profilePhotoId?.getDirectURL();
  } catch {
    profilePhotoUrl = undefined;
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar
        className={`${avatarSize} border-2 border-islamic-green/20 flex-shrink-0`}
      >
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt={name}
            className="object-cover w-full h-full rounded-full"
          />
        ) : (
          <AvatarFallback className="bg-islamic-green text-white font-semibold text-xs">
            {getInitials(name)}
          </AvatarFallback>
        )}
      </Avatar>
      <span
        className={`font-semibold text-foreground ${size === "sm" ? "text-xs" : "text-sm"}`}
      >
        {name}
      </span>
    </div>
  );
}

interface CommentItemProps {
  comment: CommentView;
  postId: string;
  depth?: number;
  ocidIndex?: number;
}

function CommentItem({
  comment,
  postId,
  depth = 0,
  ocidIndex,
}: CommentItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const replyMutation = useReplyToComment();
  const { identity } = useInternetIdentity();

  const handleReply = async () => {
    if (!identity) {
      toast.error("Please log in to reply");
      return;
    }
    if (!replyText.trim()) return;
    try {
      await replyMutation.mutateAsync({
        postId,
        commentId: comment.id,
        content: replyText.trim(),
      });
      setReplyText("");
      setShowReplyInput(false);
    } catch {
      toast.error("Failed to send reply");
    }
  };

  return (
    <div
      className={`${depth > 0 ? "ml-8 border-l-2 border-islamic-green/15 pl-3" : ""}`}
    >
      <div className="flex gap-2 py-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <AuthorDisplay principal={comment.author} size="sm" />
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {formatTime(comment.createdTimestamp)}
            </span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {comment.content}
          </p>
          {depth === 0 && (
            <button
              type="button"
              onClick={() => setShowReplyInput(!showReplyInput)}
              className="mt-1 text-xs text-islamic-green hover:text-islamic-green/70 flex items-center gap-1 font-medium transition-colors"
            >
              <Reply className="w-3 h-3" />
              Reply
            </button>
          )}
        </div>
      </div>

      {showReplyInput && (
        <div className="ml-2 mb-2 flex gap-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply…"
            className="h-14 text-sm resize-none border-islamic-green/30 focus-visible:ring-islamic-green"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleReply();
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleReply}
            disabled={replyMutation.isPending || !replyText.trim()}
            className="self-end bg-islamic-green text-white hover:opacity-90 h-8 w-8 p-0 rounded-lg"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      )}

      {comment.replies.map((reply, i) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          postId={postId}
          depth={depth + 1}
          ocidIndex={ocidIndex ? ocidIndex * 10 + i : i}
        />
      ))}
    </div>
  );
}

interface PostCardProps {
  post: PostView;
  ocidIndex: number;
}

export default function PostCard({ post, ocidIndex }: PostCardProps) {
  const { identity } = useInternetIdentity();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const likeMutation = useLikePost();
  const commentMutation = useAddComment();

  const userPrincipal = identity?.getPrincipal();
  const isLiked = userPrincipal
    ? post.likes.some((p) => p.toString() === userPrincipal.toString())
    : false;
  const likeCount = post.likes.length;

  let postImageUrl: string | undefined;
  try {
    postImageUrl = post.imageBlobId?.getDirectURL();
  } catch {
    postImageUrl = undefined;
  }

  const handleLike = async () => {
    if (!identity) {
      toast.error("Please log in to like posts");
      return;
    }
    try {
      await likeMutation.mutateAsync({ postId: post.id, liked: isLiked });
    } catch {
      toast.error("Failed to update like");
    }
  };

  const handleComment = async () => {
    if (!identity) {
      toast.error("Please log in to comment");
      return;
    }
    if (!commentText.trim()) return;
    try {
      await commentMutation.mutateAsync({
        postId: post.id,
        content: commentText.trim(),
      });
      setCommentText("");
    } catch {
      toast.error("Failed to add comment");
    }
  };

  return (
    <article
      data-ocid={`feed.item.${ocidIndex}`}
      className="bg-card rounded-2xl card-glow overflow-hidden transition-all duration-200 card-glow-hover"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <AuthorDisplay principal={post.author} />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatTime(post.createdTimestamp)}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Post Image */}
      {postImageUrl && (
        <div className="mx-4 mb-3 rounded-xl overflow-hidden">
          <img
            src={postImageUrl}
            alt="Post"
            className="w-full max-h-96 object-cover"
            loading="lazy"
          />
        </div>
      )}

      <Separator className="mx-4 opacity-40" />

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          data-ocid="post.like_button"
          onClick={handleLike}
          disabled={likeMutation.isPending}
          className={`gap-2 text-sm font-medium rounded-lg transition-colors ${
            isLiked
              ? "text-red-500 hover:bg-red-50"
              : "text-muted-foreground hover:text-red-400 hover:bg-red-50"
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500" : ""}`} />
          <span>{likeCount}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          data-ocid="post.comment_toggle_button"
          onClick={() => setShowComments(!showComments)}
          className="gap-2 text-sm font-medium text-muted-foreground hover:text-islamic-green hover:bg-islamic-green/10 rounded-lg transition-colors"
        >
          <MessageCircle
            className={`w-4 h-4 ${showComments ? "fill-islamic-green/20" : ""}`}
          />
          <span>{post.comments.length}</span>
        </Button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-border/50 px-4 py-3 bg-muted/30">
          {/* Add comment input */}
          <div className="flex gap-2 mb-3">
            <Textarea
              data-ocid="post.comment_input"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment… (Enter to send)"
              className="h-12 text-sm resize-none border-border focus-visible:ring-islamic-green bg-card"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleComment();
                }
              }}
            />
            <Button
              data-ocid="post.comment_submit_button"
              size="sm"
              onClick={handleComment}
              disabled={commentMutation.isPending || !commentText.trim()}
              className="self-end bg-islamic-green text-white hover:opacity-90 h-9 w-9 p-0 rounded-xl flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {/* Comments list */}
          <div className="space-y-1">
            {post.comments.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                No comments yet. Be the first! 💬
              </p>
            ) : (
              post.comments.map((comment, i) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  postId={post.id}
                  ocidIndex={i + 1}
                />
              ))
            )}
          </div>
        </div>
      )}
    </article>
  );
}

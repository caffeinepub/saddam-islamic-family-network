import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Image, Loader2, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { useCreatePost } from "../hooks/useQueries";
import { useGetCallerUserProfile } from "../hooks/useQueries";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function CreatePost() {
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();
  const { data: profile } = useGetCallerUserProfile();

  const username = profile?.username ?? "You";

  let profilePhotoUrl: string | undefined;
  try {
    profilePhotoUrl = profile?.profilePhotoId?.getDirectURL();
  } catch {
    profilePhotoUrl = undefined;
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageFile) return;

    try {
      let imageBlobId: ExternalBlob | null = null;
      if (imageFile) {
        const bytes = new Uint8Array(await imageFile.arrayBuffer());
        imageBlobId = ExternalBlob.fromBytes(bytes).withUploadProgress(
          (pct) => {
            setUploadProgress(pct);
          },
        );
      }

      await createPost.mutateAsync({ content: content.trim(), imageBlobId });
      setContent("");
      handleRemoveImage();
      setUploadProgress(0);
      toast.success("Post shared with your family! 🌙");
    } catch {
      toast.error("Failed to create post. Please try again.");
      setUploadProgress(0);
    }
  };

  const isSubmitting = createPost.isPending;

  return (
    <div className="bg-card rounded-2xl card-glow p-4">
      {/* Arabic greeting banner */}
      <div className="text-center mb-3">
        <span className="text-xs font-arabic text-islamic-green/70">
          اللَّهُمَّ بَارِكْ فِي هَذِهِ الْأُسْرَة
        </span>
      </div>

      <div className="flex gap-3">
        <Avatar className="w-10 h-10 border-2 border-islamic-green/20 flex-shrink-0">
          {profilePhotoUrl ? (
            <img
              src={profilePhotoUrl}
              alt={username}
              className="object-cover w-full h-full rounded-full"
            />
          ) : (
            <AvatarFallback className="bg-islamic-green text-white font-semibold text-sm">
              {getInitials(username)}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="flex-1 space-y-3">
          <Textarea
            data-ocid="feed.create_post_input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share with your family… سُبْحَانَ اللَّه"
            className="min-h-[80px] resize-none border-border focus-visible:ring-islamic-green bg-background rounded-xl text-sm leading-relaxed"
            disabled={isSubmitting}
          />

          {/* Image preview */}
          {imagePreview && (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-48 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Upload progress */}
          {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-islamic-green h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
                disabled={isSubmitting}
              />
              <Button
                variant="ghost"
                size="sm"
                data-ocid="feed.post_image_upload_button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="text-muted-foreground hover:text-islamic-green hover:bg-islamic-green/10 gap-1.5 text-xs font-medium rounded-lg"
              >
                <Image className="w-4 h-4" />
                Photo
              </Button>
            </div>

            <Button
              data-ocid="feed.submit_button"
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() && !imageFile)}
              className="bg-islamic-green text-white hover:opacity-90 gap-2 text-sm font-semibold rounded-xl px-5 h-9"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Posting…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Post
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

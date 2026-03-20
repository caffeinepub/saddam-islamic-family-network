import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  ChevronRight,
  Edit2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { ExternalBlob } from "../backend";
import PostCard from "../components/PostCard";
import { MobileHeader } from "../components/TopNav";
import { useEmailAuth } from "../hooks/useEmailAuth";
import {
  useGetCallerUserProfile,
  useGetUserPosts,
  useSaveUserProfile,
} from "../hooks/useQueries";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface ProfilePageProps {
  setCurrentPage: (page: Page) => void;
  isAnyAdmin: boolean;
}

export default function ProfilePage({
  setCurrentPage,
  isAnyAdmin,
}: ProfilePageProps) {
  const { identity, clear } = useEmailAuth();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } =
    useGetCallerUserProfile();
  const [page] = useState(0);
  const { data: posts, isLoading: postsLoading } = useGetUserPosts(
    identity?.getPrincipal(),
    page,
  );

  const [editOpen, setEditOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editBio, setEditBio] = useState("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(
    null,
  );
  const [coverPhotoFile, setCoverPhotoFile] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string | null>(
    null,
  );
  const [profileUploadPct, setProfileUploadPct] = useState(0);
  const [coverUploadPct, setCoverUploadPct] = useState(0);

  const saveProfile = useSaveUserProfile();

  const username = profile?.username ?? "Family Member";

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

  const openEdit = () => {
    setEditUsername(profile?.username ?? "");
    setEditBio(profile?.bio ?? "");
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
    setCoverPhotoFile(null);
    setCoverPhotoPreview(null);
    setEditOpen(true);
  };

  const handleProfilePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photo must be under 5MB");
      return;
    }
    setProfilePhotoFile(file);
    setProfilePhotoPreview(URL.createObjectURL(file));
  };

  const handleCoverPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Cover photo must be under 10MB");
      return;
    }
    setCoverPhotoFile(file);
    setCoverPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      let newProfilePhotoId: ExternalBlob | undefined = undefined;
      let newCoverPhotoId: ExternalBlob | undefined = undefined;

      if (!profilePhotoFile && profile?.profilePhotoId) {
        try {
          const url = profile.profilePhotoId.getDirectURL();
          newProfilePhotoId = ExternalBlob.fromURL(url);
        } catch {
          newProfilePhotoId = undefined;
        }
      }

      if (!coverPhotoFile && profile?.coverPhotoId) {
        try {
          const url = profile.coverPhotoId.getDirectURL();
          newCoverPhotoId = ExternalBlob.fromURL(url);
        } catch {
          newCoverPhotoId = undefined;
        }
      }

      if (profilePhotoFile) {
        const bytes = new Uint8Array(await profilePhotoFile.arrayBuffer());
        newProfilePhotoId = ExternalBlob.fromBytes(bytes).withUploadProgress(
          (pct) => {
            setProfileUploadPct(pct);
          },
        );
      }

      if (coverPhotoFile) {
        const bytes = new Uint8Array(await coverPhotoFile.arrayBuffer());
        newCoverPhotoId = ExternalBlob.fromBytes(bytes).withUploadProgress(
          (pct) => {
            setCoverUploadPct(pct);
          },
        );
      }

      await saveProfile.mutateAsync({
        username: editUsername.trim(),
        bio: editBio.trim(),
        profilePhotoId: newProfilePhotoId,
        coverPhotoId: newCoverPhotoId,
      });

      setEditOpen(false);
      setProfileUploadPct(0);
      setCoverUploadPct(0);
      toast.success("Profile updated! ✨");
    } catch (err) {
      console.error("Profile save error:", err);
      toast.error("Failed to save profile");
      setProfileUploadPct(0);
      setCoverUploadPct(0);
    }
  };

  const handleLogout = () => {
    clear();
    queryClient.clear();
  };

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader />

      <div className="max-w-2xl mx-auto">
        {/* Cover Photo */}
        <div className="relative w-full h-40 md:h-52 bg-islamic-dark overflow-hidden">
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
        </div>

        {/* Profile info */}
        <div className="relative px-4 pb-4">
          <div className="flex items-end justify-between -mt-12 mb-4">
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

            <Button
              data-ocid="profile.edit_button"
              onClick={openEdit}
              variant="outline"
              size="sm"
              className="border-border hover:border-islamic-green hover:text-islamic-green gap-2 rounded-xl font-semibold"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </Button>
          </div>

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
            </div>
          )}
        </div>

        {/* Quick Actions Menu */}
        <div className="px-4 mb-6">
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-4 py-2 border-b border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Account Options
              </span>
            </div>

            {/* Admin Dashboard - only for admins */}
            {isAnyAdmin && (
              <button
                type="button"
                data-ocid="profile.admin_dashboard_button"
                onClick={() => setCurrentPage("admin-dashboard")}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-islamic-green/10 transition-colors border-b border-border"
              >
                <div className="w-9 h-9 rounded-full bg-islamic-green/20 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-5 h-5 text-islamic-green" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">
                    Admin Dashboard
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Manage family members & requests
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}

            {/* App Settings */}
            <button
              type="button"
              data-ocid="profile.settings_button"
              onClick={() => setSettingsOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors border-b border-border"
            >
              <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">
                  App Settings
                </p>
                <p className="text-xs text-muted-foreground">
                  Theme, notifications & more
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            {/* Logout */}
            <button
              type="button"
              data-ocid="profile.logout_button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-500/10 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-red-500">Logout</p>
                <p className="text-xs text-muted-foreground">
                  Sign out of your account
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="bg-card rounded-xl py-2 px-4 text-center border border-border">
            <span className="text-xs font-arabic text-islamic-green">
              مَا شَاءَ اللَّهُ — الحمد لله
            </span>
          </div>
        </div>

        <div className="px-4 pb-8">
          <h2 className="font-display font-bold text-foreground text-base mb-4">
            My Posts
          </h2>

          {postsLoading && (
            <div className="space-y-4">
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
            <div className="bg-card rounded-2xl card-glow p-8 text-center">
              <span className="text-3xl block mb-3">📝</span>
              <p className="text-muted-foreground text-sm">
                You haven't posted anything yet. Share something with the
                family!
              </p>
            </div>
          )}

          {!postsLoading && posts && posts.length > 0 && (
            <div className="space-y-4">
              {posts.map((post, i) => (
                <PostCard key={post.id} post={post} ocidIndex={i + 1} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent
          data-ocid="profile.edit_dialog"
          className="bg-card border-border max-w-md mx-4 rounded-2xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-foreground">
              Edit Profile
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Profile Photo
              </Label>
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-border">
                  {profilePhotoPreview ? (
                    <img
                      src={profilePhotoPreview}
                      alt="Preview"
                      className="object-cover w-full h-full rounded-full"
                    />
                  ) : profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt={username}
                      className="object-cover w-full h-full rounded-full"
                    />
                  ) : (
                    <AvatarFallback className="bg-islamic-green text-white font-bold text-lg">
                      {getInitials(editUsername || username)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <label
                    htmlFor="profile-photo-upload"
                    className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-islamic-green hover:text-islamic-green/70 border border-islamic-green/30 rounded-lg px-3 py-1.5 hover:bg-islamic-green/5 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Change Photo
                  </label>
                  <input
                    id="profile-photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePhotoSelect}
                  />
                  {profileUploadPct > 0 && profileUploadPct < 100 && (
                    <div className="mt-1 w-full bg-muted rounded-full h-1">
                      <div
                        className="bg-islamic-green h-1 rounded-full transition-all"
                        style={{ width: `${profileUploadPct}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Cover Photo
              </Label>
              <div className="relative rounded-xl overflow-hidden border border-border h-24 bg-muted">
                {coverPhotoPreview ? (
                  <img
                    src={coverPhotoPreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                ) : coverPhotoUrl ? (
                  <img
                    src={coverPhotoUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full pattern-overlay opacity-60" />
                )}
                <label
                  htmlFor="cover-photo-upload"
                  className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30 hover:bg-black/40 transition-colors"
                >
                  <span className="text-white text-xs font-medium flex items-center gap-1.5">
                    <Camera className="w-4 h-4" />
                    Change Cover
                  </span>
                </label>
                <input
                  id="cover-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleCoverPhotoSelect}
                />
              </div>
              {coverUploadPct > 0 && coverUploadPct < 100 && (
                <div className="w-full bg-muted rounded-full h-1">
                  <div
                    className="bg-islamic-gold h-1 rounded-full transition-all"
                    style={{ width: `${coverUploadPct}%` }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="edit-username"
                className="text-sm font-medium text-foreground"
              >
                Name *
              </Label>
              <Input
                id="edit-username"
                data-ocid="profile.username_input"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Your name"
                className="border-border focus-visible:ring-islamic-green"
                maxLength={50}
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="edit-bio"
                className="text-sm font-medium text-foreground"
              >
                Bio
              </Label>
              <Textarea
                id="edit-bio"
                data-ocid="profile.bio_textarea"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell the family about yourself…"
                className="resize-none h-20 border-border focus-visible:ring-islamic-green"
                maxLength={200}
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                data-ocid="profile.cancel_button"
                onClick={() => setEditOpen(false)}
                disabled={saveProfile.isPending}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="profile.save_button"
                disabled={saveProfile.isPending || !editUsername.trim()}
                className="bg-islamic-green text-white hover:opacity-90 rounded-xl font-semibold gap-2"
              >
                {saveProfile.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* App Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-card border-border max-w-md mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-foreground">
              App Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Theme</p>
              <p>
                Use the moon/sun icon in the top bar to switch between Default,
                Islamic, and Dark themes.
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Privacy</p>
              <p>
                Your posts and messages are automatically deleted after 30 days
                for privacy.
              </p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">About SIFN</p>
              <p>
                Saddam Islamic Family Network v1.0 - A private space for family
                to connect in faith.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setSettingsOpen(false)}
              className="bg-islamic-green text-white rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

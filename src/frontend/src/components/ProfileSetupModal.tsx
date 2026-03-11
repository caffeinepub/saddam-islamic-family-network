import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSaveUserProfile } from "../hooks/useQueries";

export default function ProfileSetupModal() {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const saveProfile = useSaveUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("Please enter your name");
      return;
    }
    try {
      await saveProfile.mutateAsync({
        username: username.trim(),
        bio: bio.trim(),
      });
      toast.success("Welcome to the family! 🌙");
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
  };

  return (
    <Dialog open>
      <DialogContent
        data-ocid="profile.dialog"
        className="bg-card border-border max-w-md mx-4 rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-full islamic-gradient flex items-center justify-center">
              <Star className="w-8 h-8 text-islamic-gold fill-islamic-gold" />
            </div>
          </div>
          <div className="text-center text-sm font-arabic text-islamic-green mb-1">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </div>
          <DialogTitle className="text-xl font-display font-bold text-foreground">
            Welcome to SIFN!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Let your family know who you are. Set up your profile to get
            started.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="setup-username"
              className="text-sm font-medium text-foreground"
            >
              Your Name *
            </Label>
            <Input
              id="setup-username"
              data-ocid="profile.username_input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Ahmad Khan"
              className="border-border focus-visible:ring-islamic-green"
              maxLength={50}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="setup-bio"
              className="text-sm font-medium text-foreground"
            >
              About You (optional)
            </Label>
            <Textarea
              id="setup-bio"
              data-ocid="profile.bio_textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A brief introduction…"
              className="border-border focus-visible:ring-islamic-green resize-none h-20"
              maxLength={200}
            />
          </div>

          <Button
            type="submit"
            data-ocid="profile.save_button"
            disabled={saveProfile.isPending || !username.trim()}
            className="w-full bg-islamic-green text-white hover:opacity-90 rounded-xl font-semibold"
          >
            {saveProfile.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up…
              </>
            ) : (
              "Join the Family"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

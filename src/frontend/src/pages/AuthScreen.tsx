import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Camera,
  Eye,
  EyeOff,
  Loader2,
  Star,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import { createActorWithConfig } from "../config";
import { deriveIdentity, useEmailAuth } from "../hooks/useEmailAuth";
import { getSecretParameter } from "../utils/urlParams";

const RELATIONS = [
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Son",
  "Daughter",
  "Aunty",
  "Uncle",
  "Cousin",
  "Custom",
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isDuplicateEmailError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("already registered") || msg.includes("already registered hai")
  );
}

export interface AuthScreenProps {
  initialTab?: "signin" | "signup";
}

type AuthView = "signin" | "signup" | "forgot";

export default function AuthScreen({ initialTab = "signin" }: AuthScreenProps) {
  const { login, isLoggingIn } = useEmailAuth();
  const [tab, setTab] = useState<"signin" | "signup">(initialTab);
  const [view, setView] = useState<AuthView>(
    initialTab === "signup" ? "signup" : "signin",
  );

  // Sign In fields
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siShowPass, setSiShowPass] = useState(false);

  // Forgot Password fields
  const [fpEmail, setFpEmail] = useState("");
  const [fpNewPassword, setFpNewPassword] = useState("");
  const [fpConfirmPassword, setFpConfirmPassword] = useState("");
  const [fpShowNew, setFpShowNew] = useState(false);
  const [fpShowConfirm, setFpShowConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Sign Up fields
  const [suPhoto, setSuPhoto] = useState<string | null>(null);
  const [suPhotoFile, setSuPhotoFile] = useState<File | null>(null);
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suRelation, setSuRelation] = useState("");
  const [suCustomRelation, setSuCustomRelation] = useState("");
  const [suAge, setSuAge] = useState("");
  const [suShowPass, setSuShowPass] = useState(false);
  const [suShowConfirm, setSuShowConfirm] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusy = isLoggingIn || isSigningUp || isResetting;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSuPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSuPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSignIn = async () => {
    if (!siEmail.trim()) {
      toast.error("Email enter karein");
      return;
    }
    if (!siPassword) {
      toast.error("Password enter karein");
      return;
    }

    // Check if email is registered before attempting login
    try {
      const checkActor = await createActorWithConfig();
      const exists = await checkActor.emailExists(siEmail.trim().toLowerCase());
      if (!exists) {
        toast.error("Ye email registered nahi hai. Pehle Sign Up karein.", {
          duration: 5000,
        });
        return;
      }
    } catch {
      // If check fails, proceed with login attempt anyway
    }

    const ok = await login(siEmail.trim(), siPassword);
    if (!ok) {
      toast.error(
        "Password incorrect hai. Sahi password dalein ya 'Forgot Password?' use karein.",
        { duration: 5000 },
      );
    }
  };

  const handleForgotPassword = () => {
    // Pre-fill email from sign-in form if available
    if (siEmail.trim()) setFpEmail(siEmail.trim());
    setView("forgot");
  };

  const handleResetPassword = async () => {
    if (!fpEmail.trim() || !isValidEmail(fpEmail)) {
      toast.error("Valid email enter karein");
      return;
    }
    if (!fpNewPassword || fpNewPassword.length < 6) {
      toast.error("Password kam se kam 6 characters ka hona chahiye");
      return;
    }
    if (fpNewPassword !== fpConfirmPassword) {
      toast.error("Passwords match nahi kar rahe");
      return;
    }

    setIsResetting(true);
    try {
      // First verify email exists
      const checkActor = await createActorWithConfig();
      const exists = await checkActor.emailExists(fpEmail.trim().toLowerCase());
      if (!exists) {
        toast.error("Ye email registered nahi hai. Pehle Sign Up karein.", {
          duration: 5000,
        });
        setIsResetting(false);
        return;
      }

      // Derive new identity from email + new password
      const newId = await deriveIdentity(fpEmail.trim(), fpNewPassword);
      const adminToken = getSecretParameter("caffeineAdminToken") || "";
      const newActor = await createActorWithConfig({
        agentOptions: { identity: newId },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (newActor as any)._initializeAccessControlWithSecret(adminToken);

      // Transfer profile data to new principal
      await newActor.resetPasswordForEmail(fpEmail.trim().toLowerCase());

      toast.success("Password change ho gaya, ab login karein", {
        duration: 6000,
      });

      // Auto-fill sign-in and go back
      setSiEmail(fpEmail.trim());
      setSiPassword("");
      setFpEmail("");
      setFpNewPassword("");
      setFpConfirmPassword("");
      setView("signin");
      setTab("signin");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Password reset failed: ${msg}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSignUp = async () => {
    console.log("[SignUp] Create Account button clicked");

    if (!suPhoto || !suPhotoFile) {
      toast.error("Please upload profile photo");
      return;
    }
    if (!suName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!suEmail.trim() || !isValidEmail(suEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!suPassword) {
      toast.error("Please enter a password");
      return;
    }
    if (suPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (suPassword !== suConfirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (!suRelation) {
      toast.error("Please select your relation");
      return;
    }
    const relation =
      suRelation === "Custom" ? suCustomRelation.trim() : suRelation;
    if (!relation) {
      toast.error("Please enter your custom relation");
      return;
    }
    if (!suAge || Number.isNaN(Number(suAge)) || Number(suAge) < 1) {
      toast.error("Please enter a valid age");
      return;
    }

    console.log("[SignUp] Validation passed, saving to backend...");
    setIsSigningUp(true);

    try {
      const id = await deriveIdentity(suEmail.trim(), suPassword);
      console.log("[SignUp] Identity derived:", id.getPrincipal().toString());

      const actor = await createActorWithConfig({
        agentOptions: { identity: id },
      });
      const adminToken = getSecretParameter("caffeineAdminToken") || "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (actor as any)._initializeAccessControlWithSecret(adminToken);
      console.log("[SignUp] Actor created");

      try {
        await actor.saveCallerEmail(suEmail.trim());
        console.log("[SignUp] Email saved");
      } catch (emailErr) {
        if (isDuplicateEmailError(emailErr)) {
          toast.error("Ye email already registered hai, please login karein", {
            duration: 6000,
          });
          setTab("signin");
          setView("signin");
          setSiEmail(suEmail.trim());
        } else {
          throw emailErr;
        }
        return;
      }

      let profilePhotoId: ExternalBlob | undefined = undefined;
      try {
        const bytes = new Uint8Array(await suPhotoFile.arrayBuffer());
        profilePhotoId = ExternalBlob.fromBytes(bytes);
        console.log("[SignUp] Photo prepared for upload");
      } catch (photoErr) {
        console.warn("[SignUp] Photo upload prep failed:", photoErr);
      }

      const bio = `Relation: ${relation} | Age: ${suAge}`;
      await actor.saveCallerUserProfile({
        username: suName.trim(),
        bio,
        profilePhotoId,
        coverPhotoId: undefined,
      });
      console.log("[SignUp] Profile saved with photo");

      toast.success(
        "Aapka account review ke liye bhej diya gaya hai! Admin approve karne ke baad aap login kar sakte hain.",
        { duration: 6000 },
      );

      setSuPhoto(null);
      setSuPhotoFile(null);
      setSuName("");
      setSuEmail("");
      setSuPassword("");
      setSuConfirm("");
      setSuRelation("");
      setSuCustomRelation("");
      setSuAge("");

      setTab("signin");
      setView("signin");
      setSiEmail(suEmail.trim());
    } catch (err) {
      console.error("[SignUp] Error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Account creation failed: ${msg}`);
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #0a2e1a 0%, #1a4a2e 50%, #0d3520 100%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-amber-400 font-arabic text-lg leading-relaxed mb-1">
            بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
          </p>
          <p className="text-white/50 text-xs mb-4">
            In the name of Allah, the Most Gracious, the Most Merciful
          </p>
          <h1 className="text-white font-bold text-2xl">
            Saddam Islamic{" "}
            <span className="text-amber-400">Family Network</span>
          </h1>
          <p className="text-white/50 text-xs mt-1">
            A private space for family to connect in faith
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 shadow-2xl"
          style={{
            background: "rgba(10,46,26,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(34,197,94,0.2)",
          }}
        >
          {/* FORGOT PASSWORD VIEW */}
          {view === "forgot" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setView("signin");
                    setTab("signin");
                  }}
                  className="text-white/60 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-white font-bold text-base">
                  Password Reset
                </h2>
              </div>

              <p className="text-white/50 text-xs leading-relaxed">
                Apna registered email aur naya password dalein.
              </p>

              {/* Email */}
              <div className="space-y-1.5">
                <Label className="text-white/80 text-sm font-medium">
                  Email
                </Label>
                <Input
                  type="email"
                  placeholder="Apna email dalein"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  className="h-11 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500"
                />
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <Label className="text-white/80 text-sm font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    type={fpShowNew ? "text" : "password"}
                    placeholder="Naya password (min 6 chars)"
                    value={fpNewPassword}
                    onChange={(e) => setFpNewPassword(e.target.value)}
                    className="h-11 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setFpShowNew(!fpShowNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {fpShowNew ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label className="text-white/80 text-sm font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    type={fpShowConfirm ? "text" : "password"}
                    placeholder="Password dobara dalein"
                    value={fpConfirmPassword}
                    onChange={(e) => setFpConfirmPassword(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleResetPassword()
                    }
                    className="h-11 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setFpShowConfirm(!fpShowConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {fpShowConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {fpConfirmPassword && fpNewPassword !== fpConfirmPassword && (
                  <p className="text-red-400 text-xs">
                    Passwords match nahi kar rahe
                  </p>
                )}
              </div>

              <Button
                type="button"
                onClick={handleResetPassword}
                disabled={isBusy}
                className="w-full h-11 rounded-xl font-bold text-base gap-2"
                style={{
                  background: "linear-gradient(135deg, #16a34a, #15803d)",
                  color: "white",
                }}
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Reset ho raha
                    hai...
                  </>
                ) : (
                  "Password Change Karein"
                )}
              </Button>
            </div>
          )}

          {/* SIGN IN / SIGN UP TABS */}
          {view !== "forgot" && (
            <Tabs
              value={tab}
              onValueChange={(v) => {
                const newTab = v as "signin" | "signup";
                setTab(newTab);
                setView(newTab);
              }}
            >
              <TabsList
                className="w-full mb-5 p-1 rounded-xl"
                style={{ background: "rgba(255,255,255,0.07)" }}
              >
                <TabsTrigger
                  value="signin"
                  data-ocid="auth.signin_tab"
                  className="flex-1 rounded-lg text-sm font-semibold data-[state=active]:bg-green-700 data-[state=active]:text-white text-white/60"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  data-ocid="auth.signup_tab"
                  className="flex-1 rounded-lg text-sm font-semibold data-[state=active]:bg-green-700 data-[state=active]:text-white text-white/60"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* SIGN IN */}
              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-white/80 text-sm font-medium">
                    Email
                  </Label>
                  <Input
                    data-ocid="auth.signin_email_input"
                    type="email"
                    placeholder="Enter your email"
                    value={siEmail}
                    onChange={(e) => setSiEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                    className="h-11 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/80 text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      data-ocid="auth.signin_password_input"
                      type={siShowPass ? "text" : "password"}
                      placeholder="Enter your password"
                      value={siPassword}
                      onChange={(e) => setSiPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                      className="h-11 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setSiShowPass(!siShowPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                    >
                      {siShowPass ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    data-ocid="auth.forgot_password_button"
                    onClick={handleForgotPassword}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                <Button
                  data-ocid="auth.signin_submit_button"
                  onClick={handleSignIn}
                  disabled={isBusy}
                  className="w-full h-11 rounded-xl font-bold text-base gap-2"
                  style={{
                    background: "linear-gradient(135deg, #16a34a, #15803d)",
                    color: "white",
                  }}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />{" "}
                      Sign In
                    </>
                  )}
                </Button>
              </TabsContent>

              {/* SIGN UP */}
              <TabsContent value="signup" className="space-y-3">
                {/* Profile Photo - REQUIRED */}
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    data-ocid="auth.photo_upload_button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed transition-colors ${
                      suPhoto
                        ? "border-green-500"
                        : "border-red-400/70 hover:border-green-400"
                    }`}
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  >
                    {suPhoto ? (
                      <img
                        src={suPhoto}
                        alt="profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Camera className="w-6 h-6 text-red-400" />
                        <span className="text-xs text-red-300">Required</span>
                      </div>
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    data-ocid="auth.photo_dropzone"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  {!suPhoto ? (
                    <p className="text-red-400 text-xs font-medium">
                      * Profile photo is required
                    </p>
                  ) : (
                    <p className="text-green-400 text-xs">Photo uploaded ✓</p>
                  )}
                </div>

                {/* Full Name */}
                <div className="space-y-1">
                  <Label className="text-white/80 text-sm font-medium">
                    Full Name *
                  </Label>
                  <Input
                    data-ocid="auth.signup_name_input"
                    placeholder="Enter your full name"
                    value={suName}
                    onChange={(e) => setSuName(e.target.value)}
                    className="h-10 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <Label className="text-white/80 text-sm font-medium">
                    Email *
                  </Label>
                  <Input
                    data-ocid="auth.signup_email_input"
                    type="email"
                    placeholder="Enter your email"
                    value={suEmail}
                    onChange={(e) => setSuEmail(e.target.value)}
                    className="h-10 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1">
                  <Label className="text-white/80 text-sm font-medium">
                    Password *
                  </Label>
                  <div className="relative">
                    <Input
                      data-ocid="auth.signup_password_input"
                      type={suShowPass ? "text" : "password"}
                      placeholder="Create a password (min 6 chars)"
                      value={suPassword}
                      onChange={(e) => setSuPassword(e.target.value)}
                      className="h-10 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setSuShowPass(!suShowPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                    >
                      {suShowPass ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <Label className="text-white/80 text-sm font-medium">
                    Confirm Password *
                  </Label>
                  <div className="relative">
                    <Input
                      data-ocid="auth.signup_confirm_password_input"
                      type={suShowConfirm ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={suConfirm}
                      onChange={(e) => setSuConfirm(e.target.value)}
                      className="h-10 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setSuShowConfirm(!suShowConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                    >
                      {suShowConfirm ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {suConfirm && suPassword !== suConfirm && (
                    <p
                      className="text-red-400 text-xs"
                      data-ocid="auth.signup_confirm_password_error"
                    >
                      Passwords do not match
                    </p>
                  )}
                </div>

                {/* Relation */}
                <div className="space-y-1">
                  <Label className="text-white/80 text-sm font-medium">
                    Relation *
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {RELATIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        data-ocid={`auth.relation_${r.toLowerCase()}_toggle`}
                        onClick={() => setSuRelation(r)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          suRelation === r
                            ? "bg-green-600 border-green-500 text-white"
                            : "border-green-800/40 text-white/50 hover:border-green-500/60 hover:text-white/80"
                        } bg-transparent`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {suRelation === "Custom" && (
                    <Input
                      data-ocid="auth.signup_custom_relation_input"
                      placeholder="Enter your relation"
                      value={suCustomRelation}
                      onChange={(e) => setSuCustomRelation(e.target.value)}
                      className="h-9 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500 mt-1.5"
                    />
                  )}
                </div>

                {/* Age */}
                <div className="space-y-1">
                  <Label className="text-white/80 text-sm font-medium">
                    Age *
                  </Label>
                  <Input
                    data-ocid="auth.signup_age_input"
                    type="number"
                    placeholder="Enter your age"
                    value={suAge}
                    onChange={(e) => setSuAge(e.target.value)}
                    min={1}
                    max={120}
                    className="h-10 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500"
                  />
                </div>

                <Button
                  data-ocid="auth.signup_submit_button"
                  type="button"
                  onClick={handleSignUp}
                  disabled={isBusy}
                  className="w-full h-11 rounded-xl font-bold text-base gap-2 mt-2"
                  style={{
                    background: "linear-gradient(135deg, #16a34a, #15803d)",
                    color: "white",
                  }}
                >
                  {isSigningUp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating
                      Account...
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" /> Create Account
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </motion.div>
    </div>
  );
}

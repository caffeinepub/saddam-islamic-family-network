import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Eye, EyeOff, Loader2, Star, User } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const RELATIONS = [
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Son",
  "Daughter",
  "Custom",
];

export default function AuthScreen() {
  const { login, isLoggingIn, isLoginError, loginError } =
    useInternetIdentity();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  // Sign In fields
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siShowPass, setSiShowPass] = useState(false);

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSuPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSuPhoto(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSignIn = () => {
    if (!siEmail.trim()) {
      toast.error("Please enter your email");
      return;
    }
    if (!siPassword) {
      toast.error("Please enter your password");
      return;
    }
    try {
      login();
    } catch {
      toast.error("Login failed. Please try again.");
    }
  };

  const handleSignUp = () => {
    if (!suName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!suEmail.trim()) {
      toast.error("Please enter your email");
      return;
    }
    if (!suPassword) {
      toast.error("Please enter a password");
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
    // Store signup data so App.tsx can auto-save profile after auth
    const signupData = {
      username: suName.trim(),
      email: suEmail.trim(),
      relation,
      age: suAge,
      photoDataUrl: suPhoto ?? null,
    };
    localStorage.setItem("pendingSignupData", JSON.stringify(signupData));
    if (suPhotoFile) {
      // Store photo as base64 for later upload
      localStorage.setItem("pendingSignupPhoto", suPhoto ?? "");
    }
    try {
      login();
    } catch {
      toast.error("Account creation failed. Please try again.");
    }
  };

  const handleForgotPassword = () => {
    toast.info(
      "Password recovery: Please use Internet Identity to manage your account security.",
      { duration: 4000 },
    );
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
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "signin" | "signup")}
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

              {isLoginError && loginError && (
                <div
                  data-ocid="auth.login_error_state"
                  className="bg-red-900/30 border border-red-500/30 rounded-xl p-3"
                >
                  <p className="text-red-400 text-xs">{loginError.message}</p>
                </div>
              )}

              <Button
                data-ocid="auth.signin_submit_button"
                onClick={handleSignIn}
                disabled={isLoggingIn}
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
              {/* Profile Photo */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  data-ocid="auth.photo_upload_button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-green-500/50 hover:border-green-400 transition-colors"
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
                      <Camera className="w-6 h-6 text-green-400" />
                      <span className="text-xs text-white/40">Photo</span>
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
                {!suPhoto && (
                  <p className="text-white/40 text-xs">
                    Tap to upload profile photo
                  </p>
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
                    placeholder="Create a password"
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
                  <p className="text-red-400 text-xs">Passwords do not match</p>
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
                      }`}
                      style={{
                        background:
                          suRelation === r
                            ? undefined
                            : "rgba(255,255,255,0.04)",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {suRelation === "Custom" && (
                  <Input
                    data-ocid="auth.signup_custom_relation_input"
                    placeholder="Type your relation..."
                    value={suCustomRelation}
                    onChange={(e) => setSuCustomRelation(e.target.value)}
                    className="mt-2 h-9 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500"
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
                  min={1}
                  max={120}
                  onChange={(e) => setSuAge(e.target.value)}
                  className="h-10 rounded-xl border-green-800/50 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-green-500"
                />
              </div>

              {isLoginError && loginError && (
                <div
                  data-ocid="auth.signup_error_state"
                  className="bg-red-900/30 border border-red-500/30 rounded-xl p-3"
                >
                  <p className="text-red-400 text-xs">{loginError.message}</p>
                </div>
              )}

              <Button
                data-ocid="auth.signup_submit_button"
                onClick={handleSignUp}
                disabled={isLoggingIn}
                className="w-full h-11 rounded-xl font-bold text-base gap-2 mt-1"
                style={{
                  background: "linear-gradient(135deg, #16a34a, #15803d)",
                  color: "white",
                }}
              >
                {isLoggingIn ? (
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
        </div>

        {/* Footer */}
        <p className="text-center text-white/30 text-xs mt-4">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/50 transition-colors"
          >
            Built with ❤️ using caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}

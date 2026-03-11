import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, Loader2, Shield, Star, Users } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

const FEATURES = [
  {
    icon: Users,
    title: "Family Network",
    desc: "Connect with up to 90 family members in a private space",
  },
  {
    icon: Heart,
    title: "Islamic Content",
    desc: "Share duas, Quran verses, and blessed moments",
  },
  {
    icon: Shield,
    title: "Private & Secure",
    desc: "Your family's conversations stay within your circle",
  },
];

export default function AuthScreen() {
  const { login, isLoggingIn, isLoginError, loginError } =
    useInternetIdentity();
  const [tab, setTab] = useState<"login" | "signup">("login");

  // Both login and signup use Internet Identity — same flow
  const handleAuth = () => {
    try {
      login();
    } catch (_err) {
      toast.error("Login failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left panel: Branding */}
      <div className="relative flex-1 pattern-overlay flex flex-col items-center justify-center p-8 min-h-[280px] md:min-h-screen">
        <div className="absolute inset-0 bg-islamic-dark/75 backdrop-blur-[2px]" />
        <div className="relative z-10 text-center max-w-sm">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <img
              src="/assets/generated/sifn-logo-transparent.dim_200x200.png"
              alt="SIFN Logo"
              className="w-20 h-20 rounded-full border-4 border-islamic-gold/60 shadow-gold mx-auto mb-4 object-cover"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="space-y-2"
          >
            <p className="text-islamic-gold font-arabic text-2xl leading-relaxed">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
            <p className="text-white/70 text-xs">
              In the name of Allah, the Most Gracious, the Most Merciful
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-4"
          >
            <h1 className="text-white font-display font-bold text-2xl leading-tight">
              Saddam Islamic
              <br />
              <span className="text-islamic-gold">Family Network</span>
            </h1>
            <p className="text-white/60 text-sm mt-2">
              A private space for family to connect, share, and grow together in
              faith.
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-6 space-y-3 hidden md:block"
          >
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-islamic-gold/20 border border-islamic-gold/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-islamic-gold" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">{title}</p>
                  <p className="text-white/55 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right panel: Auth form */}
      <div className="flex-1 flex items-center justify-center bg-background p-6 md:max-w-md">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-sm space-y-6"
        >
          {/* Mobile logo */}
          <div className="text-center md:hidden">
            <h2 className="font-display font-bold text-xl text-foreground">
              Saddam Islamic Family Network
            </h2>
            <p className="text-islamic-green font-arabic text-sm mt-1">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          </div>

          <div className="hidden md:block">
            <h2 className="font-display font-bold text-2xl text-foreground">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Sign in to your family account
            </p>
          </div>

          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "login" | "signup")}
          >
            <TabsList className="w-full bg-muted rounded-xl p-1">
              <TabsTrigger
                value="login"
                data-ocid="auth.login_tab"
                className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm font-medium text-sm"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                data-ocid="auth.signup_tab"
                className="flex-1 rounded-lg data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm font-medium text-sm"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="login-username"
                  className="text-sm font-medium text-foreground"
                >
                  Username / Email
                </Label>
                <Input
                  id="login-username"
                  data-ocid="auth.login_input"
                  type="text"
                  placeholder="Enter your username or email"
                  className="border-border focus-visible:ring-islamic-green rounded-xl h-11"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Authentication uses Internet Identity — no password needed
                </p>
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="login-password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </Label>
                <Input
                  id="login-password"
                  data-ocid="auth.password_input"
                  type="password"
                  placeholder="••••••••"
                  className="border-border focus-visible:ring-islamic-green rounded-xl h-11"
                  disabled
                />
              </div>

              {isLoginError && loginError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                  <p className="text-destructive text-xs">
                    {loginError.message}
                  </p>
                </div>
              )}

              <Button
                data-ocid="auth.submit_button"
                onClick={handleAuth}
                disabled={isLoggingIn}
                className="w-full bg-islamic-green text-white hover:opacity-90 rounded-xl font-semibold h-11 gap-2 text-base"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 fill-islamic-gold text-islamic-gold" />
                    Sign In
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Secured by{" "}
                <span className="text-islamic-green font-semibold">
                  Internet Identity
                </span>{" "}
                — no passwords stored
              </p>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-5">
              <div className="bg-accent/30 border border-border rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-islamic-green flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Secure & Private
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create your account using Internet Identity — no email or
                      password required. Your data stays private.
                    </p>
                  </div>
                </div>
              </div>

              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-islamic-green/10 border border-islamic-green/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-islamic-green" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      {title}
                    </p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}

              {isLoginError && loginError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3">
                  <p className="text-destructive text-xs">
                    {loginError.message}
                  </p>
                </div>
              )}

              <Button
                data-ocid="auth.submit_button"
                onClick={handleAuth}
                disabled={isLoggingIn}
                className="w-full bg-islamic-green text-white hover:opacity-90 rounded-xl font-semibold h-11 gap-2 text-base mt-2"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating
                    account…
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 fill-islamic-gold text-islamic-gold" />
                    Create Account
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By joining you agree to keep the space respectful and Islamic
              </p>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <footer className="pt-4 border-t border-border text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-islamic-green transition-colors"
            >
              Built with ❤️ using caffeine.ai
            </a>
          </footer>
        </motion.div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/Card";
import { AlertBanner } from "@/components/AlertBanner";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, LogIn, UserPlus, Loader2, Sparkles, Github, Chrome } from "lucide-react";
import Link from "next/link";
import { signInWithGoogle } from "@/utils/auth";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "safe" | "danger" | "warning"; title: string; message: string } | null>(null);
  
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
            },
          },
        });
        if (error) throw error;
        setAlert({
          type: "safe",
          title: "Check your email",
          message: "We've sent you a confirmation link to complete your signup.",
        });
      }
    } catch (error: any) {
      setAlert({
        type: "danger",
        title: isLogin ? "Login Failed" : "Signup Failed",
        message: error.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Google login error:", error.message);
      setAlert({
        type: "danger",
        title: "OAuth Error",
        message: error.message || "Failed to sign in with Google.",
      });
    }
  };

  const handleOAuth = async (provider: "github") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
      });
      if (error) throw error;
    } catch (error: any) {
      setAlert({
        type: "danger",
        title: "OAuth Error",
        message: error.message || `Failed to sign in with ${provider}.`,
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background overflow-hidden">
      {/* Left Side - Visuals */}
      <div className="hidden md:flex flex-1 relative bg-primary/5 items-center justify-center p-12">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent opacity-50" />
        <div className="relative z-10 max-w-lg space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center text-primary border border-primary/20 shadow-2xl shadow-primary/20"
          >
            <Sparkles className="w-10 h-10" />
          </motion.div>
          
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight leading-tight">
              Control Your <span className="text-primary">Financial</span> Destiny.
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Experience the next generation of financial behavior control. Predict risks, prevent overspending, and grow your wealth with AI.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Anti-Gravity UI", desc: "Fluid animations" },
              { label: "AI Insights", desc: "Predictive power" },
              { label: "Smart Controls", desc: "Prevent mistakes" },
              { label: "Bank Level", desc: "Secure & private" },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="p-4 rounded-2xl bg-card/30 border border-border/30"
              >
                <div className="font-semibold text-foreground">{feature.label}</div>
                <div className="text-xs text-muted-foreground">{feature.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-12 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="md:hidden text-center space-y-2 mb-8">
            <h2 className="text-3xl font-bold text-primary">Financial Controller</h2>
            <p className="text-muted-foreground">Smart Financial Brain</p>
          </div>

          <Card className="p-8 space-y-6 relative border-border/40">
            <div className="flex bg-muted p-1 rounded-xl mb-2">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  isLogin ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  !isLogin ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Signup
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {isLogin ? "Welcome back" : "Create an account"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Enter your credentials to access your brain." : "Start your financial transformation today."}
              </p>
            </div>

            {alert && (
              <AlertBanner
                type={alert.type}
                title={alert.title}
                description={alert.message}
              />
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    <div className="relative">
                      <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                      <input
                        type="text"
                        id="name"
                        placeholder=" "
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={!isLogin}
                        className="peer w-full bg-background border border-border/50 rounded-xl pt-6 pb-2 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all leading-relaxed"
                      />
                      <label
                        htmlFor="name"
                        className="absolute left-11 top-4 text-sm text-muted-foreground transition-all 
                                   peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base 
                                   peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary"
                      >
                        Full Name
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <input
                    type="email"
                    id="email"
                    placeholder=" "
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="peer w-full bg-background border border-border/50 rounded-xl pt-6 pb-2 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all leading-relaxed"
                  />
                  <label
                    htmlFor="email"
                    className="absolute left-11 top-4 text-sm text-muted-foreground transition-all 
                               peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base 
                               peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary"
                  >
                    Email Address
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <input
                    type="password"
                    id="password"
                    placeholder=" "
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="peer w-full bg-background border border-border/50 rounded-xl pt-6 pb-2 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all leading-relaxed"
                  />
                  <label
                    htmlFor="password"
                    className="absolute left-11 top-4 text-sm text-muted-foreground transition-all 
                               peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base 
                               peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary"
                  >
                    Password
                  </label>
                  {isLogin && (
                    <Link 
                      href="/forgot-password" 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-primary hover:underline font-medium z-20"
                    >
                      Forgot?
                    </Link>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isLogin ? (
                  <>
                    <LogIn className="w-5 h-5" /> Sign In
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" /> Create Account
                  </>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleGoogleLogin}
                className="flex items-center justify-center gap-2 py-2.5 border border-border/50 rounded-xl hover:bg-muted/50 transition-all text-sm font-medium"
              >
                <Chrome className="w-4 h-4" /> Google
              </button>
              <button
                onClick={() => handleOAuth("github")}
                className="flex items-center justify-center gap-2 py-2.5 border border-border/50 rounded-xl hover:bg-muted/50 transition-all text-sm font-medium"
              >
                <Github className="w-4 h-4" /> Github
              </button>
            </div>
          </Card>

          <p className="text-center text-xs text-muted-foreground px-8">
            By continuing, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
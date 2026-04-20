"use client";

import { useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import { motion } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Loader2, Shield, Eye, EyeOff } from "lucide-react";
import { useFinancial } from "@/context/FinancialContext";

export default function AuthPage() {
  const { setUser, completeOnboarding } = useFinancial();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !name) {
      alert("Please fill all fields");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (data?.user) {
      // store extra user data
      await supabase.from("users").insert([
        {
          auth_id: data.user.id,
          email: data.user.email,
          name: name,
        },
      ]);
    }

    alert("Signup successful");
    setUser({ name, monthlyIncome: 0 }); // Default income
    completeOnboarding();
    window.location.href = "/";
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please fill all fields");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      alert("Login successful");
      
      // Fetch user name if available
      try {
        const { data: userData } = await supabase
          .from("users")
          .select("name")
          .eq("auth_id", data.user?.id)
          .single();
        
        setUser({ name: userData?.name || "User", monthlyIncome: 0 });
      } catch (err) {
        console.error("Error fetching user data:", err);
        setUser({ name: "User", monthlyIncome: 0 });
      }
      
      completeOnboarding();
      window.location.href = "/";
    }
  };

  const isFormValid = email && password && (authMode === "login" || name);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card rounded-2xl border border-white/10 p-8 shadow-2xl z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-blue-500/15 to-purple-500/15 text-primary mb-4 shadow-[0_0_25px_rgba(59,130,246,0.15)]">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-center">
            {authMode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5 text-center">
            {authMode === "signup" 
              ? "Start controlling your financial behavior today" 
              : "Access your financial brain"}
          </p>
        </div>

        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex rounded-xl bg-muted/50 p-1 mb-6">
            <button 
              onClick={() => setAuthMode("login")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === "login" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Login
            </button>
            <button 
              onClick={() => setAuthMode("signup")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === "signup" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Sign Up
            </button>
          </div>

          {authMode === "signup" && (
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <User className="w-4 h-4" />
              </div>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-background/50 border border-border/50 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          )}

          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
              <Mail className="w-4 h-4" />
            </div>
            <input 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              type="email"
              className="w-full bg-background/50 border border-border/50 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
              <Lock className="w-4 h-4" />
            </div>
            <input 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              className="w-full bg-background/50 border border-border/50 rounded-xl pl-11 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button 
            onClick={authMode === "signup" ? handleSignup : handleLogin}
            disabled={loading || !isFormValid}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {authMode === "signup" ? "Sign Up" : "Login"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-4 text-center">
            <button 
              onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {authMode === "login" 
                ? "Don't have an account? Sign Up" 
                : "Already have an account? Login"}
            </button>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-2">
          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-widest">
            <Shield className="w-3 h-3 text-success" /> Bank-grade security
          </p>
        </div>
      </motion.div>
    </div>
  );
}

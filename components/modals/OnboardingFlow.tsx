"use client";

import { useState, useRef, useEffect } from "react";
import { useFinancial } from "@/context/FinancialContext";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, Lock, ArrowRight, CheckCircle2, Shield, User, Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { CurrencyInput } from "@/components/CurrencyInput";

const GOOGLE_SVG = (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.07 5.07 0 0 1-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// ── Helpers ──
function getInitials(n: string) {
  const p = n.trim().split(/\s+/);
  if (!p[0]) return "?";
  if (p.length === 1) return p[0][0].toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function validateEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function validatePhone(v: string) { return /^\d{10}$/.test(v.replace(/\D/g, "")); }

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return phone.startsWith("+") ? phone : `+${digits}`;
}

function maskIdentifier(id: string, isEmail: boolean) {
  if (isEmail) {
    const [local, domain] = id.split("@");
    if (!local || !domain) return id;
    return `${local.slice(0, 3)}***@${domain}`;
  }
  const digits = id.replace(/\D/g, "");
  return `+91 ******${digits.slice(-4)}`;
}

// ── Upsert user into Supabase "users" table ──
async function upsertUserRecord(userId: string, email: string) {
  try {
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", userId)
      .single();

    if (!existingUser) {
      await supabase.from("users").insert([
        {
          auth_id: userId,
          email: email,
          name: email.split("@")[0],
        },
      ]);
      console.log("New user record created in DB");
    }
  } catch (err) {
    console.warn("Could not upsert user record:", err);
  }
}

// ── Component ──
export function OnboardingFlow() {
  const { state, setUser, setBalance, completeOnboarding, dispatch } = useFinancial();

  // Flow state
  const [step, setStep] = useState(0); // 0=auth, 1=profile, 2=financial
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [loginType, setLoginType] = useState<"email" | "phone">("email");
  const [otpSent, setOtpSent] = useState(false);

  // Field state
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [balance, setBalanceVal] = useState("");

  // UI state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  if (state.onboarded) return null;

  // ── Handlers ──

  const handleSendOtp = async () => {
    setError("");
    const val = identifier.trim();
    if (!val) { setError(`Please enter your ${loginType}`); return; }

    const isValid = loginType === "email" ? validateEmail(val) : validatePhone(val);
    if (!isValid) { setError(`Please enter a valid ${loginType}`); return; }

    setLoading(true);
    try {
      const formattedId = loginType === "email" ? val : formatPhone(val);
      console.log(`Attempting to send OTP to ${loginType}:`, formattedId, "Mode:", authMode);

      // We use shouldCreateUser: true for both to avoid "User not found" errors.
      const { error } = await supabase.auth.signInWithOtp(
        loginType === "email"
          ? { email: formattedId, options: { shouldCreateUser: true } }
          : { phone: formattedId, options: { shouldCreateUser: true } }
      );

      if (error) {
        console.error("Supabase OTP Error:", error);
        throw error;
      }

      console.log("OTP sent successfully!");
      setOtpSent(true);
      setResendCooldown(30);
    } catch (err: any) {
      console.error("Catch Error during OTP Send:", err);
      if (err.name === 'AuthRetryableFetchError') {
        setError("Network error: Could not reach Supabase. Please check your internet connection or disable any ad-blockers.");
      } else {
        setError(err.message || "Failed to send OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Enter 6-digit code"); return; }

    setLoading(true);
    setError("");
    try {
      const val = identifier.trim();
      const formattedId = loginType === "email" ? val : formatPhone(val);

      const verifyType = loginType === "email"
        ? (authMode === "signup" ? "signup" : "email")
        : "sms";

      const { data, error } = await supabase.auth.verifyOtp(
        loginType === "email"
          ? { email: formattedId, token: code, type: verifyType as any }
          : { phone: formattedId, token: code, type: "sms" }
      );

      if (error) throw error;

      if (data.user) {
        await upsertUserRecord(data.user.id, data.user.email || identifier);
        const userName = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "User";
        setName(userName);
      }

      setOtpSent(false);
      setStep(1);
    } catch (err: any) {
      setError(err.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err: any) {
      setGoogleLoading(false);
      setError(err.message || "Failed to connect with Google.");
    }
  };

  const handleFinish = async () => {
    setFinishing(true);
    const finalName = name.trim() || "User";
    try {
      await supabase.auth.updateUser({ data: { full_name: finalName } });
      setFinished(true);
      setTimeout(() => {
        setUser({ name: finalName, monthlyIncome: Number(income) || 50000 });
        setBalance(Number(balance) || 100000);
        completeOnboarding();
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
      setFinishing(false);
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    if (val && !/^\d$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleSkip = () => {
    setUser({ name: "Demo User", monthlyIncome: 80000 });
    setBalance(200000);
    completeOnboarding();
  };

  // ── UI Content ──

  const progressPct = ((step + 1) / 3) * 100;
  const stepLabel = `Step ${step + 1} of 3`;

  if (otpSent) {
    return (
      <Shell progressPct={33} stepLabel="Verify OTP">
        <StepIcon icon={<KeyRound className="w-7 h-7" />} />
        <h1 className="text-2xl md:text-3xl font-bold text-center tracking-tight">Enter verification code</h1>
        <p className="text-muted-foreground text-center mt-1.5 text-sm">Sent to <span className="text-foreground font-medium">{maskIdentifier(identifier, loginType === "email")}</span></p>
        <div className="flex justify-center gap-2.5 mt-8">
          {otp.map((d, i) => (
            <input key={i} ref={el => { otpRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1}
              value={d} onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => e.key === "Backspace" && !otp[i] && i > 0 && otpRefs.current[i - 1]?.focus()}
              className={`w-11 h-13 md:w-12 md:h-14 text-center text-xl font-bold rounded-xl border ${d ? "border-primary bg-primary/5" : "border-border"} bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
            />
          ))}
        </div>
        {error && <p className="text-danger text-sm mt-4 text-center bg-danger/10 py-2 rounded-lg border border-danger/20">{error}</p>}
        <button onClick={handleVerifyOtp} disabled={loading || otp.join("").length < 6}
          className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify & Continue <ArrowRight className="w-4 h-4" /></>}
        </button>
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => { setOtpSent(false); setOtp(["", "", "", "", "", ""]); setError(""); }} className="text-xs text-muted-foreground hover:text-primary transition-colors">← Back</button>
          <button onClick={handleSendOtp} disabled={resendCooldown > 0} className="text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-40">{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}</button>
        </div>
      </Shell>
    );
  }

  const authContent = (
    <div className="space-y-4">
      <div className="flex rounded-xl bg-muted/50 p-1 mb-2">
        {(["signup", "login"] as const).map(m => (
          <button key={m} onClick={() => { setAuthMode(m); setError(""); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {m === "signup" ? "Sign Up" : "Login"}
          </button>
        ))}
      </div>

      {authMode === "signup" && (
        <div className="relative group">
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${name ? "text-primary" : "text-muted-foreground"}`}>
            <User className="w-4 h-4" />
          </div>
          <input type="text" value={name} onChange={e => { setName(e.target.value); setError(""); }}
            className={`w-full bg-background/80 border ${error && !name ? "border-danger" : "border-border/60"} rounded-xl pl-11 pr-4 pt-5 pb-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-transparent transition-all`}
          />
          <label className={`absolute left-11 transition-all duration-200 pointer-events-none ${name ? "top-1.5 text-[10px] text-primary font-medium" : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"}`}>
            Full Name
          </label>
        </div>
      )}

      <div className="flex gap-4 border-b border-border/40 mb-2">
        {(["email", "phone"] as const).map(t => (
          <button key={t} onClick={() => { setLoginType(t); setIdentifier(""); setError(""); }}
            className={`pb-2 text-sm font-medium capitalize transition-all border-b-2 ${loginType === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="relative group">
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${identifier ? "text-primary" : "text-muted-foreground"}`}>
          {loginType === "email" ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
        </div>
        <input type="text" value={identifier} onChange={e => { setIdentifier(e.target.value); setError(""); }}
          className={`w-full bg-background/80 border ${error && !identifier ? "border-danger" : "border-border/60"} rounded-xl pl-11 pr-4 pt-5 pb-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-transparent transition-all`}
        />
        <label className={`absolute left-11 transition-all duration-200 pointer-events-none ${identifier ? "top-1.5 text-[10px] text-primary font-medium" : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"}`}>
          {loginType === "email" ? "Email Address" : "Phone Number"}
        </label>
      </div>
      <button onClick={handleSendOtp} disabled={loading || !identifier.trim()}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <>Send OTP <ArrowRight className="w-4 h-4" /></>}
      </button>
      <div className="relative py-3">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
        <div className="relative flex justify-center"><span className="bg-background px-3 text-[10px] text-muted-foreground uppercase tracking-widest">Or</span></div>
      </div>
      <button onClick={handleGoogleLogin} disabled={googleLoading}
        className="w-full py-3.5 rounded-xl border border-border/60 hover:bg-white/5 transition-all font-medium flex items-center justify-center gap-3 disabled:opacity-60">
        {googleLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : GOOGLE_SVG}
        {googleLoading ? "Redirecting..." : "Continue with Google"}
      </button>
      <div className="pt-3 flex flex-col items-center gap-1.5">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Lock className="w-3 h-3 text-success" /> Bank-grade security</p>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Shield className="w-3 h-3 text-success" /> Your data is encrypted & never shared</p>
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        <button onClick={handleSkip} className="text-[11px] text-muted-foreground/60 hover:text-primary transition-colors underline underline-offset-2">Skip & explore demo</button>
      </div>
    </div>
  );

  const profileContent = (
    <div className="space-y-5">
      <div className="relative group">
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${name ? "text-primary" : "text-muted-foreground"}`}>
          <User className="w-4 h-4" />
        </div>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          className={`w-full bg-background/80 border ${error ? "border-danger" : "border-border/60"} rounded-xl pl-11 pr-4 pt-5 pb-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-transparent transition-all`}
        />
        <label className={`absolute left-11 transition-all duration-200 pointer-events-none ${name ? "top-1.5 text-[10px] text-primary font-medium" : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"}`}>
          Your Full Name
        </label>
      </div>
      <div className="p-4 rounded-xl border border-white/10 bg-gradient-to-br from-blue-500/5 to-purple-500/5 backdrop-blur-sm">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mb-3">Dashboard Preview</p>
        <div className="flex items-center gap-3">
          <motion.div key={getInitials(name)} initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}
            className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/30 shrink-0">
            {getInitials(name)}
          </motion.div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{name || "Your Name"}</p>
            <p className="text-[10px] text-primary">Your financial dashboard identity</p>
          </div>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-xl border border-border/60 hover:bg-white/5 transition-colors font-medium text-sm">Back</button>
        <button onClick={() => { if (!name.trim()) { setError("Please enter your name"); return; } setError(""); setStep(2); }}
          className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.98] text-sm">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const financialContent = (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest ml-1">Monthly Income</label>
        <CurrencyInput value={income} onChange={setIncome} placeholder="50,000" large />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest ml-1">Current Bank Balance</label>
        <CurrencyInput value={balance} onChange={setBalanceVal} placeholder="1,00,000" large />
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={() => setStep(1)} disabled={finishing} className="flex-1 py-3 rounded-xl border border-border/60 hover:bg-white/5 transition-colors font-medium text-sm disabled:opacity-50">Back</button>
        <button onClick={handleFinish} disabled={finishing}
          className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-80 text-sm">
          {finishing ? (finished ? <><CheckCircle2 className="w-5 h-5" /> Welcome!</> : <><Loader2 className="w-5 h-5 animate-spin" /> Setting up...</>) : <>Get Started <CheckCircle2 className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  );

  const stepConfigs = [
    { icon: <Lock className="w-7 h-7" />, title: "Welcome to Financial Controller", subtitle: "Secure your financial life in seconds", content: authContent },
    { icon: <User className="w-7 h-7" />, title: name ? `Nice to meet you, ${name.split(" ")[0]} 👋` : "What should we call you?", subtitle: "Let's personalize your dashboard", content: profileContent },
    { icon: <Shield className="w-7 h-7" />, title: "Set your baselines", subtitle: "This helps us calculate your real affordability", content: financialContent },
  ];

  const current = stepConfigs[step];

  return (
    <Shell progressPct={progressPct} stepLabel={stepLabel}>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25, ease: "easeOut" }}>
          <StepIcon icon={current.icon} />
          <h1 className="text-2xl md:text-3xl font-bold text-center tracking-tight">{current.title}</h1>
          <p className="text-muted-foreground text-center mt-1.5 text-sm">{current.subtitle}</p>
          <motion.div className="mt-6" animate={error ? { x: [-4, 4, -4, 4, 0] } : {}} transition={{ duration: 0.3 }}>
            {current.content}
            {error && <p className="text-danger text-xs mt-3 text-center bg-danger/10 py-2 rounded-lg border border-danger/20">{error}</p>}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Shell>
  );
}

function Shell({ children, progressPct, stepLabel }: { children: React.ReactNode; progressPct: number; stepLabel: string }) {
  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background" />
      <div className="min-h-[100dvh] flex flex-col items-center px-4 py-6 pb-28">
        <div className="w-full max-w-md mb-8">
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
          </div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest text-center mt-2">{stepLabel}</p>
        </div>
        <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/20">
          {children}
        </div>
      </div>
    </div>
  );
}

function StepIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center mb-5">
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
        className="p-3 rounded-2xl bg-gradient-to-tr from-blue-500/15 to-purple-500/15 text-primary shadow-[0_0_25px_rgba(59,130,246,0.15)]">
        {icon}
      </motion.div>
    </div>
  );
}

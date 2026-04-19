"use client";

import { useState, useRef, useEffect } from "react";
import { useFinancial } from "@/context/FinancialContext";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Phone, Lock, ArrowRight, CheckCircle2, Shield, User, Loader2, Eye, EyeOff, KeyRound } from "lucide-react";
import { CurrencyInput } from "@/components/CurrencyInput";
import { generateId, todayISO } from "@/utils/helpers";
import { DEFAULT_CATEGORIES, FinancialState } from "@/types";

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
function validatePhone(v: string) { return /^\d{10}$/.test(v.replace(/\s/g, "")); }

function getPastDate(daysAgo: number) {
  return new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0];
}

function getDemoState(): FinancialState {
  return {
    user: { name: "Dhruv Jain", monthlyIncome: 120000, isDemo: true },
    balance: 275000,
    transactions: [
      // Food
      { id: generateId(), type: "expense", amount: 450, category: "Food", date: getPastDate(0), description: "Zomato" },
      { id: generateId(), type: "expense", amount: 320, category: "Food", date: getPastDate(1), description: "Swiggy" },
      { id: generateId(), type: "expense", amount: 150, category: "Food", date: getPastDate(2), description: "Momos" },
      { id: generateId(), type: "expense", amount: 600, category: "Food", date: getPastDate(3), description: "Cafe" },
      
      // Transport
      { id: generateId(), type: "expense", amount: 120, category: "Transport", date: getPastDate(1), description: "Rapido" },
      { id: generateId(), type: "expense", amount: 250, category: "Transport", date: getPastDate(2), description: "Uber" },
      { id: generateId(), type: "expense", amount: 2000, category: "Transport", date: getPastDate(5), description: "Petrol" },
      
      // Shopping
      { id: generateId(), type: "expense", amount: 2000, category: "Shopping", date: getPastDate(3), description: "Amazon" },
      { id: generateId(), type: "expense", amount: 1500, category: "Shopping", date: getPastDate(6), description: "Myntra" },
      { id: generateId(), type: "expense", amount: 3000, category: "Shopping", date: getPastDate(8), description: "Flipkart" },
      
      // Bills
      { id: generateId(), type: "expense", amount: 2500, category: "Utilities", date: getPastDate(10), description: "Electricity" },
      { id: generateId(), type: "expense", amount: 799, category: "Utilities", date: getPastDate(11), description: "Jio" },
      { id: generateId(), type: "expense", amount: 15000, category: "Housing", date: getPastDate(15), description: "Rent" },
      
      // Entertainment
      { id: generateId(), type: "expense", amount: 499, category: "Entertainment", date: getPastDate(4), description: "Netflix" },
      { id: generateId(), type: "expense", amount: 199, category: "Entertainment", date: getPastDate(7), description: "Spotify" },
      
      // Other
      { id: generateId(), type: "expense", amount: 1200, category: "Healthcare", date: getPastDate(9), description: "Gym" },
      { id: generateId(), type: "expense", amount: 800, category: "Healthcare", date: getPastDate(12), description: "Doctor" },
    ],
    cards: [
      { id: generateId(), name: "HDFC Card", network: "visa", limit: 100000, used: 35000 },
      { id: generateId(), name: "ICICI Card", network: "mastercard", limit: 200000, used: 90000 },
    ],
    loans: [],
    budgets: [],
    goals: [
      { id: generateId(), title: "Buy Car", targetAmount: 500000, savedAmount: 200000, deadline: getPastDate(-180) },
      { id: generateId(), title: "Emergency Fund", targetAmount: 300000, savedAmount: 120000, deadline: getPastDate(-365) },
      { id: generateId(), title: "Travel Fund", targetAmount: 150000, savedAmount: 40000, deadline: getPastDate(-90) }
    ],
    categories: DEFAULT_CATEGORIES,
    onboarded: true,
    theme: "dark",
    customMappings: {}
  };
}

// ── Component ──
export function OnboardingFlow() {
  const { state, setUser, setBalance, completeOnboarding, dispatch } = useFinancial();

  // Flow state
  const [step, setStep] = useState(0); // 0=auth, 1=profile, 2=financial
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [loginMethod, setLoginMethod] = useState<"otp" | "password">("otp");
  const [otpSent, setOtpSent] = useState(false);

  // Field state
  const [loginId, setLoginId] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [balance, setBalanceVal] = useState("");

  // UI state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  if (state.onboarded) return null;

  // ── Validation ──
  const isEmail = loginId.includes("@");
  const isValidLogin = isEmail ? validateEmail(loginId) : validatePhone(loginId);

  // ── Handlers ──
  const handleContinueAuth = () => {
    setError("");
    if (!loginId.trim()) { setError("Please enter your email or phone number"); return; }
    if (!isValidLogin) {
      setError(isEmail ? "Please enter a valid email address" : "Please enter a valid 10-digit phone number");
      return;
    }

    // Both signup and login OTP mode → send OTP
    if (authMode === "signup" || loginMethod === "otp") {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setOtpSent(true);
        setResendCooldown(30);
      }, 1200);
      return;
    }

    // Password login
    if (!password) { setError("Please enter your password"); return; }
    
    // DEMO ACCOUNT CHECK
    if (loginId.trim() === "dhruvjain1858@gmail.com" && password === "dhruv@2592") {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        dispatch({ type: "LOAD_STATE", payload: getDemoState() });
      }, 1500);
      return;
    }

    // Normal validation (prevent normal login for now since it's a frontend simulation)
    if (loginId.trim() === "dhruvjain1858@gmail.com" && password !== "dhruv@2592") {
      setError("Invalid email or password");
      return;
    }

    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setTimeout(() => {
      setName("Dhruv Jain");
      setLoading(false);
      setUser({ name: "Dhruv Jain", monthlyIncome: 80000 });
      setBalance(200000);
      completeOnboarding();
    }, 1500);
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    if (val && !/^\d$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    setError("");
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...otp];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
    setOtp(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
  };

  const handleVerifyOtp = () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the full 6-digit OTP"); return; }
    if (code !== "123456") { setError("Invalid OTP. Try 123456"); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setOtpSent(false);

      if (authMode === "signup") {
        // Signup: verified → continue to profile step
        setStep(1);
      } else {
        // DEMO ACCOUNT CHECK for OTP
        if (loginId.trim() === "dhruvjain1858@gmail.com") {
          dispatch({ type: "LOAD_STATE", payload: getDemoState() });
          return;
        }

        // Login: verified → go straight to dashboard
        setName("Dhruv Jain");
        setUser({ name: "Dhruv Jain", monthlyIncome: 80000 });
        setBalance(200000);
        completeOnboarding();
      }
    }, 1200);
  };

  const handleResendOtp = () => {
    if (resendCooldown > 0) return;
    setOtp(["", "", "", "", "", ""]);
    setError("");
    setResendCooldown(30);
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setTimeout(() => {
      setName("Dhruv Jain");
      setLoginId("dhruv@demo.com");
      setGoogleLoading(false);
      setStep(1);
    }, 1500);
  };

  const handleSkip = () => {
    setUser({ name: "Demo User", monthlyIncome: 80000 });
    setBalance(200000);
    completeOnboarding();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    const words = raw.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1));
    setName(words.join(" "));
    setError("");
  };

  const addChip = (setter: React.Dispatch<React.SetStateAction<string>>, amt: number, cur: string) => {
    setter(((Number(cur) || 0) + amt).toString());
  };

  const handleFinish = () => {
    setError("");
    setFinishing(true);
    setTimeout(() => {
      setFinished(true);
      setTimeout(() => {
        setUser({ name: name.trim() || "Guest", monthlyIncome: Number(income) || 50000 });
        setBalance(Number(balance) || 100000);
        completeOnboarding();
      }, 1000);
    }, 1500);
  };

  // ── Progress ──
  const progressPct = authMode === "signup" ? ((step + 1) / 3) * 100 : 100;
  const stepLabel = authMode === "signup" ? `Step ${step + 1} of 3` : "Authentication";

  // ── OTP Screen (both signup & login) ──
  if (otpSent) {
    return (
      <Shell progressPct={authMode === "signup" ? 33 : 100} stepLabel="Verify OTP">
        <StepIcon icon={<KeyRound className="w-7 h-7" />} />
        <h1 className="text-2xl md:text-3xl font-bold text-center tracking-tight">Enter verification code</h1>
        <p className="text-muted-foreground text-center mt-1.5 text-sm">Sent to <span className="text-foreground font-medium">{loginId}</span></p>
        <motion.div animate={error ? { x: [-4, 4, -4, 4, 0] } : {}} transition={{ duration: 0.3 }}>
          <div className="flex justify-center gap-2.5 mt-8" onPaste={handleOtpPaste}>
            {otp.map((d, i) => (
              <input key={i} ref={el => { otpRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1}
                value={d} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)}
                className={`w-11 h-13 md:w-12 md:h-14 text-center text-xl font-bold rounded-xl border ${d ? "border-primary bg-primary/5" : "border-border"} bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-all`}
              />
            ))}
          </div>
          {error && <p className="text-danger text-sm mt-3 text-center bg-danger/10 py-2 rounded-lg border border-danger/20">{error}</p>}
        </motion.div>
        <button onClick={handleVerifyOtp} disabled={loading || otp.join("").length < 6}
          className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify {authMode === "login" ? "& Login" : "& Continue"} <ArrowRight className="w-4 h-4" /></>}
        </button>
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => { setOtpSent(false); setOtp(["","","","","",""]); setError(""); }}
            className="text-xs text-muted-foreground hover:text-primary transition-colors">
            ← Back
          </button>
          <button onClick={handleResendOtp} disabled={resendCooldown > 0}
            className="text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none">
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
          </button>
        </div>
      </Shell>
    );
  }

  // ── Step 0: Auth ──
  const authContent = (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex rounded-xl bg-muted/50 p-1 mb-2">
        {(["signup", "login"] as const).map(m => (
          <button key={m} onClick={() => { setAuthMode(m); setError(""); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${authMode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {m === "signup" ? "Sign Up" : "Login"}
          </button>
        ))}
      </div>

      {/* Smart Input */}
      <div className="relative group">
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${loginId ? "text-primary" : "text-muted-foreground"}`}>
          {isEmail ? <Mail className="w-4 h-4" /> : loginId.length > 0 ? <Phone className="w-4 h-4" /> : <User className="w-4 h-4" />}
        </div>
        <input type="text" value={loginId} onChange={e => { setLoginId(e.target.value); setError(""); }}
          className={`w-full bg-background/80 border ${error && !loginId ? "border-danger" : "border-border/60"} rounded-xl pl-11 pr-4 pt-5 pb-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-transparent transition-all`}
        />
        <label className={`absolute left-11 transition-all duration-200 pointer-events-none ${loginId ? "top-1.5 text-[10px] text-primary font-medium" : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"}`}>
          Email or Phone Number
        </label>
      </div>

      {/* Login: password option */}
      {authMode === "login" && (
        <>
          <div className="flex rounded-lg bg-muted/30 p-0.5 text-xs">
            {(["otp", "password"] as const).map(m => (
              <button key={m} onClick={() => { setLoginMethod(m); setError(""); }}
                className={`flex-1 py-1.5 rounded-md font-medium transition-all ${loginMethod === m ? "bg-background/80 shadow-sm text-foreground" : "text-muted-foreground"}`}>
                {m === "otp" ? "OTP Login" : "Password"}
              </button>
            ))}
          </div>
          {loginMethod === "password" && (
            <div className="relative group">
              <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${password ? "text-primary" : "text-muted-foreground"}`}>
                <Lock className="w-4 h-4" />
              </div>
              <input type={showPassword ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter password"
                className="w-full bg-background/80 border border-border/60 rounded-xl pl-11 pr-12 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-transparent transition-all"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}
        </>
      )}

      {/* CTA */}
      <button onClick={handleContinueAuth} disabled={loading || !loginId.trim()}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : <>{authMode === "login" && loginMethod === "password" ? "Login with Password" : "Send OTP"} <ArrowRight className="w-4 h-4" /></>}
      </button>

      {/* Divider */}
      <div className="relative py-3">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/40" /></div>
        <div className="relative flex justify-center"><span className="bg-background px-3 text-[10px] text-muted-foreground uppercase tracking-widest">Or</span></div>
      </div>

      {/* Google */}
      <button onClick={handleGoogleLogin} disabled={googleLoading}
        className="w-full py-3.5 rounded-xl border border-border/60 hover:bg-white/5 transition-all font-medium flex items-center justify-center gap-3 disabled:opacity-60 disabled:pointer-events-none">
        {googleLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : GOOGLE_SVG}
        {googleLoading ? "Verifying..." : "Continue with Google"}
      </button>

      {/* Trust */}
      <div className="pt-3 flex flex-col items-center gap-1.5">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Lock className="w-3 h-3 text-success" /> Bank-grade security</p>
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Shield className="w-3 h-3 text-success" /> Your data is encrypted & never shared</p>
      </div>

      {/* Toggle + Skip */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <button onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setError(""); }}
          className="text-xs text-muted-foreground hover:text-primary transition-colors">
          {authMode === "signup" ? "Already have an account? Login" : "New here? Create account"}
        </button>
        <button onClick={handleSkip} className="text-[11px] text-muted-foreground/60 hover:text-primary transition-colors underline underline-offset-2">
          Skip & explore demo
        </button>
      </div>
    </div>
  );

  // ── Step 1: Profile ──
  const profileContent = (
    <div className="space-y-5">
      <div className="relative group">
        <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${name ? "text-primary" : "text-muted-foreground"}`}>
          <User className="w-4 h-4" />
        </div>
        <input type="text" value={name} onChange={handleNameChange}
          className={`w-full bg-background/80 border ${error ? "border-danger" : "border-border/60"} rounded-xl pl-11 pr-4 pt-5 pb-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/80 focus:border-transparent transition-all`}
        />
        <label className={`absolute left-11 transition-all duration-200 pointer-events-none ${name ? "top-1.5 text-[10px] text-primary font-medium" : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground"}`}>
          Your Full Name
        </label>
      </div>

      {/* Live Preview */}
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

  // ── Step 2: Financial ──
  const financialContent = (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest ml-1">Monthly Income</label>
        <CurrencyInput value={income} onChange={v => { setIncome(v); setError(""); }} placeholder="50,000" large />
        <div className="flex gap-2 mt-1.5">
          {[10000, 50000, 100000].map(a => (
            <button key={a} onClick={() => addChip(setIncome, a, income)}
              className="text-[11px] bg-white/5 hover:bg-primary/10 hover:text-primary border border-white/10 rounded-full px-3 py-1 transition-all">
              +{a >= 100000 ? "1L" : `${a / 1000}K`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest ml-1">Current Bank Balance</label>
        <CurrencyInput value={balance} onChange={v => setBalanceVal(v)} placeholder="1,00,000" large />
        <div className="flex gap-2 mt-1.5">
          {[10000, 50000, 100000].map(a => (
            <button key={a} onClick={() => addChip(setBalanceVal, a, balance)}
              className="text-[11px] bg-white/5 hover:bg-primary/10 hover:text-primary border border-white/10 rounded-full px-3 py-1 transition-all">
              +{a >= 100000 ? "1L" : `${a / 1000}K`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => setStep(1)} disabled={finishing} className="flex-1 py-3 rounded-xl border border-border/60 hover:bg-white/5 transition-colors font-medium text-sm disabled:opacity-50">Back</button>
        <button onClick={handleFinish} disabled={finishing}
          className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium flex items-center justify-center gap-2 transition-all hover:shadow-[0_0_25px_rgba(59,130,246,0.4)] hover:scale-[1.01] active:scale-[0.98] disabled:opacity-80 disabled:pointer-events-none text-sm">
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

// ── Shell wrapper ──
function Shell({ children, progressPct, stepLabel }: { children: React.ReactNode; progressPct: number; stepLabel: string }) {
  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      <div className="fixed inset-0 z-[-1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background" />
      <div className="min-h-[100dvh] flex flex-col items-center px-4 py-6 pb-28">
        {/* Progress */}
        <div className="w-full max-w-md mb-8">
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.5, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
          </div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest text-center mt-2">{stepLabel}</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-md rounded-2xl border border-white/[0.06] bg-card/60 backdrop-blur-xl p-6 md:p-8 shadow-2xl shadow-black/20">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Step icon ──
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

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/Card";
import { AlertBanner } from "@/components/AlertBanner";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowLeft, Loader2, Key } from "lucide-react";
import Link from "next/link";

function VerifyOTPContent() {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "safe" | "danger"; title: string; message: string } | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    } else {
      router.push("/forgot-password");
    }
  }, [searchParams, router]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setAlert({
        type: "danger",
        title: "Invalid Code",
        message: "Please enter the 6-digit code sent to your email.",
      });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) {
        setAlert({
          type: "danger",
          title: "Verification Failed",
          message: error.message || "Invalid or expired code. Please try again.",
        });
      } else {
        setAlert({
          type: "safe",
          title: "Verified",
          message: "Code verified successfully! Redirecting to reset password...",
        });
        setTimeout(() => {
          router.push("/reset-password");
        }, 1500);
      }
    } catch (err: any) {
      setAlert({
        type: "danger",
        title: "Error",
        message: "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Go Back
        </button>

        <Card className="space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Key className="w-24 h-24" />
          </div>

          <div className="space-y-2 relative z-10">
            <h1 className="text-3xl font-bold tracking-tight">Verify Code</h1>
            <p className="text-muted-foreground">
              We've sent a 6-digit verification code to <span className="text-foreground font-medium">{email}</span>.
            </p>
          </div>

          {alert && (
            <AlertBanner
              type={alert.type}
              title={alert.title}
              description={alert.message}
            />
          )}

          <form onSubmit={handleVerifyOTP} className="space-y-4 relative z-10">
            <div className="relative">
              <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <input
                id="otp"
                type="text"
                placeholder=" "
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                className="peer w-full bg-background border border-border/50 rounded-xl pt-6 pb-2 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none tracking-[0.5em] font-mono text-lg leading-relaxed"
              />
              <label
                htmlFor="otp"
                className="absolute left-11 top-4 text-sm text-muted-foreground transition-all 
                           peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base 
                           peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary tracking-normal font-sans"
              >
                Verification Code
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify Code"
              )}
            </button>
            
            <p className="text-center text-sm text-muted-foreground">
              Didn't receive the code? {" "}
              <Link href="/forgot-password" size="sm" className="text-primary hover:underline font-medium">
                Resend Code
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyOTP() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}

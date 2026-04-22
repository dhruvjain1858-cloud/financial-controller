"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/Card";
import { AlertBanner } from "@/components/AlertBanner";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "safe" | "danger"; title: string; message: string } | null>(null);
  const router = useRouter();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setAlert(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) {
        setAlert({
          type: "danger",
          title: "Error",
          message: error.message || "Failed to send OTP",
        });
      } else {
        setAlert({
          type: "safe",
          title: "Success",
          message: "A 6-digit code has been sent to your email.",
        });
        setTimeout(() => {
          router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
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
        <Link 
          href="/auth" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </Link>

        <Card className="space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Mail className="w-24 h-24" />
          </div>

          <div className="space-y-2 relative z-10">
            <h1 className="text-3xl font-bold tracking-tight">Forgot Password</h1>
            <p className="text-muted-foreground">
              Enter your email address and we'll send you a 6-digit code to reset your password.
            </p>
          </div>

          {alert && (
            <AlertBanner
              type={alert.type}
              title={alert.title}
              description={alert.message}
            />
          )}

          <form onSubmit={handleSendOTP} className="space-y-4 relative z-10">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <input
                id="email"
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="peer w-full bg-background border border-border/50 rounded-xl pt-6 pb-2 pl-11 pr-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none leading-relaxed"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Code...
                </>
              ) : (
                "Send OTP Code"
              )}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
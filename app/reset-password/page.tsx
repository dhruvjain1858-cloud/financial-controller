"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card } from "@/components/Card";
import { AlertBanner } from "@/components/AlertBanner";
import { motion } from "framer-motion";
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "safe" | "danger"; title: string; message: string } | null>(null);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setAlert({
        type: "danger",
        title: "Error",
        message: "Passwords do not match.",
      });
      return;
    }

    if (password.length < 6) {
      setAlert({
        type: "danger",
        title: "Weak Password",
        message: "Password must be at least 6 characters long.",
      });
      return;
    }

    setLoading(true);
    setAlert(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setAlert({
          type: "danger",
          title: "Update Failed",
          message: error.message || "Failed to update password. Please try again.",
        });
      } else {
        setSuccess(true);
        setAlert({
          type: "safe",
          title: "Success",
          message: "Your password has been updated successfully.",
        });
        setTimeout(() => {
          router.push("/auth");
        }, 2000);
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Password Reset!</h1>
            <p className="text-muted-foreground">
              Your password has been changed successfully. You can now login with your new password.
            </p>
          </div>
          <button
            onClick={() => router.push("/auth")}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-all"
          >
            Go to Login
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <Lock className="w-24 h-24" />
          </div>

          <div className="space-y-2 relative z-10">
            <h1 className="text-3xl font-bold tracking-tight">New Password</h1>
            <p className="text-muted-foreground">
              Set a secure password for your account.
            </p>
          </div>

          {alert && (
            <AlertBanner
              type={alert.type}
              title={alert.title}
              description={alert.message}
            />
          )}

          <form onSubmit={handleResetPassword} className="space-y-4 relative z-10">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="peer w-full bg-background border border-border/50 rounded-xl pt-6 pb-2 pl-11 pr-12 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none leading-relaxed"
              />
              <label
                htmlFor="password"
                className="absolute left-11 top-4 text-sm text-muted-foreground transition-all 
                           peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base 
                           peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary"
              >
                New Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-20"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder=" "
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="peer w-full bg-background border border-border/50 rounded-xl pt-6 pb-2 pl-11 pr-12 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none leading-relaxed"
              />
              <label
                htmlFor="confirmPassword"
                className="absolute left-11 top-4 text-sm text-muted-foreground transition-all 
                           peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base 
                           peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary"
              >
                Confirm Password
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
                  Updating Password...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}

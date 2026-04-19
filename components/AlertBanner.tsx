"use client";

import { AlertTriangle, Info, ShieldAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/utils/helpers";
import { motion } from "framer-motion";

type AlertType = "safe" | "warning" | "danger" | "info";

interface AlertBannerProps {
  type: AlertType;
  title: string;
  description: string;
  className?: string;
}

const config = {
  safe: {
    icon: CheckCircle2,
    colors: "bg-success/10 text-success border-success/20",
    glow: "glow-success",
  },
  warning: {
    icon: AlertTriangle,
    colors: "bg-warning/10 text-warning border-warning/20",
    glow: "glow-warning",
  },
  danger: {
    icon: ShieldAlert,
    colors: "bg-danger/10 text-danger border-danger/20",
    glow: "glow-danger",
  },
  info: {
    icon: Info,
    colors: "bg-primary/10 text-primary border-primary/20",
    glow: "",
  },
};

export const AlertBanner = ({ type, title, description, className }: AlertBannerProps) => {
  const { icon: Icon, colors, glow } = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border flex gap-4 items-start relative overflow-hidden",
        colors,
        glow,
        className
      )}
    >
      <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-r", 
        type === "danger" ? "from-red-500 to-transparent" : 
        type === "warning" ? "from-yellow-500 to-transparent" :
        "from-green-500 to-transparent"
      )} />
      <div className="mt-0.5 z-10">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 z-10">
        <h4 className="font-semibold">{title}</h4>
        <p className="text-sm mt-1 opacity-90">{description}</p>
      </div>
    </motion.div>
  );
};

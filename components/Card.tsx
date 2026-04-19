"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/utils/helpers";
import { motion, HTMLMotionProps } from "framer-motion";

export interface CardProps extends HTMLMotionProps<"div"> {
  glass?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glass = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "rounded-2xl p-6",
          glass ? "glass-card" : "bg-card border border-border/50",
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";
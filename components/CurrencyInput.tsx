"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { cn } from "@/utils/helpers";
import { Plus, Minus } from "lucide-react";

/**
 * Formats a number into Indian locale currency display (no ₹ symbol, just grouping).
 * 100000 → "1,00,000"
 */
function formatIndian(num: number): string {
  if (!num && num !== 0) return "";
  const str = Math.floor(num).toString();
  if (str.length <= 3) return str;
  const last3 = str.slice(-3);
  const rest = str.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${grouped},${last3}`;
}

/**
 * Strips all non-digit characters and returns the raw number.
 */
function parseRaw(display: string): number {
  const digits = display.replace(/[^0-9]/g, "");
  return digits === "" ? 0 : parseInt(digits, 10);
}

interface CurrencyInputProps {
  /** Raw numeric value (e.g. 100000) */
  value: string;
  /** Called with the raw numeric string (no formatting) */
  onChange: (rawValue: string) => void;
  /** Placeholder text shown when empty */
  placeholder?: string;
  /** Additional className for the outer wrapper */
  className?: string;
  /** Whether to render at a larger size (for onboarding, affordability) */
  large?: boolean;
  /** Allow decimal input (for interest rates) */
  allowDecimal?: boolean;
  /** Hide the ₹ prefix (for non-currency number fields like months) */
  noPrefix?: boolean;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  large = false,
  allowDecimal = false,
  noPrefix = false,
}: CurrencyInputProps) {
  // Determine display value
  const getDisplay = useCallback((): string => {
    if (value === "" || value === "0") return "";
    if (allowDecimal) {
      // For decimal fields, just show the raw value
      return value;
    }
    const num = parseRaw(value);
    return num > 0 ? formatIndian(num) : "";
  }, [value, allowDecimal]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;

      if (allowDecimal) {
        // Allow digits and one decimal point
        const cleaned = input.replace(/[^0-9.]/g, "");
        // Prevent multiple dots
        const parts = cleaned.split(".");
        const safe = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
        onChange(safe);
        return;
      }

      // Strip everything except digits
      const digits = input.replace(/[^0-9]/g, "");
      onChange(digits);
    },
    [onChange, allowDecimal]
  );

  const getStep = (current: number) => {
    if (allowDecimal) return 0.5;
    if (noPrefix) return 1;
    if (current < 50000) return 5000;
    if (current < 500000) return 10000;
    return 50000;
  };

  const valRef = useRef(value);
  useEffect(() => { valRef.current = value; }, [value]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleStepInternal = useCallback((direction: "up" | "down") => {
    let currentNum = parseRaw(valRef.current);
    if (allowDecimal) {
      currentNum = parseFloat(valRef.current) || 0;
    }
    
    const step = getStep(currentNum);
    let nextNum = direction === "up" ? currentNum + step : currentNum - step;
    if (nextNum < 0) nextNum = 0;
    
    if (allowDecimal) {
      valRef.current = nextNum.toFixed(1).replace(/\.0$/, "");
    } else {
      valRef.current = nextNum.toString();
    }
    onChange(valRef.current);
  }, [allowDecimal, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleStepInternal("up");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleStepInternal("down");
      }
    },
    [handleStepInternal]
  );

  const startHold = (direction: "up" | "down", e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    handleStepInternal(direction);
    timerRef.current = setInterval(() => {
      handleStepInternal(direction);
    }, 150);
  };

  const stopHold = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  useEffect(() => {
    return () => stopHold();
  }, []);

  return (
    <div className={cn("relative", className)}>
      {!noPrefix && (
        <span
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground select-none pointer-events-none",
            large && "text-lg"
          )}
        >
          ₹
        </span>
      )}
      <input
        type="text"
        inputMode={allowDecimal ? "decimal" : "numeric"}
        autoComplete="off"
        value={getDisplay()}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full bg-background border border-border rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
          noPrefix ? "pl-4" : "pl-10",
          "pr-20", // Extra padding for buttons
          large && "text-lg"
        )}
      />
      
      {/* Custom Increment/Decrement Buttons */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <button
          type="button"
          onMouseDown={(e) => startHold("down", e)}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={(e) => startHold("down", e)}
          onTouchEnd={stopHold}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-border/50 hover:shadow-[0_0_10px_rgba(255,255,255,0.05)] transition-all flex items-center justify-center"
          tabIndex={-1}
          aria-label="Decrease value"
        >
          <Minus size={16} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onMouseDown={(e) => startHold("up", e)}
          onMouseUp={stopHold}
          onMouseLeave={stopHold}
          onTouchStart={(e) => startHold("up", e)}
          onTouchEnd={stopHold}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-border/50 hover:shadow-[0_0_10px_rgba(255,255,255,0.05)] transition-all flex items-center justify-center"
          tabIndex={-1}
          aria-label="Increase value"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

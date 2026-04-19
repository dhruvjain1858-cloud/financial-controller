import { useState } from "react";
import { useFinancial } from "@/context/FinancialContext";
import { parseQuickInput } from "@/utils/smartInput";
import { Zap, Plus, AlertCircle } from "lucide-react";
import { todayISO } from "@/utils/helpers";
import { motion, AnimatePresence } from "framer-motion";

export function QuickAddTransaction() {
  const { addTransaction, state } = useFinancial();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const parsed = parseQuickInput(input, state.customMappings);
    if (!parsed) {
      setError("Please include an amount. (e.g. '500 dinner')");
      return;
    }

    // Duplicate Check
    const isDuplicate = state.transactions.some(
      t => t.amount === parsed.amount && t.description?.toLowerCase() === parsed.description.toLowerCase() && t.date === todayISO()
    );

    if (isDuplicate && !error.includes("Duplicate")) {
      setError("Duplicate detected! Click Add again to confirm.");
      return;
    }

    addTransaction({
      type: "expense",
      amount: parsed.amount,
      category: parsed.category,
      description: parsed.description,
      date: todayISO(),
    });

    setInput("");
    setError("");
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  const parsedPreview = parseQuickInput(input, state.customMappings);

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <div className="relative flex items-center w-full">
        <span className="absolute left-4 text-muted-foreground pointer-events-none">
          <Zap size={18} className={input ? "text-primary" : ""} />
        </span>
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError("");
          }}
          placeholder="Quick Add (e.g. '1500 swiggy dinner')"
          className="w-full bg-card border border-border/50 rounded-xl pl-11 pr-24 py-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
        />
        <button
          type="submit"
          className="absolute right-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors rounded-lg font-medium flex items-center gap-1.5"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      <AnimatePresence>
        {input && parsedPreview && !error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 left-0 right-0 mt-2 p-3 bg-card border border-border rounded-lg shadow-lg flex items-center gap-3 text-sm"
          >
            <div className="px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">
              ₹{parsedPreview.amount}
            </div>
            <div className="text-muted-foreground">
              {parsedPreview.description || "No description"}
            </div>
            <div className="ml-auto px-2 py-1 bg-muted rounded-md font-medium text-xs flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: parsedPreview.confidence === "HIGH" ? "#10B981" : parsedPreview.confidence === "MEDIUM" ? "#F59E0B" : "#EF4444" }} />
              {parsedPreview.category}
            </div>
          </motion.div>
        )}
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 left-0 right-0 mt-2 p-3 bg-danger/10 border border-danger/20 rounded-lg shadow-lg flex items-center gap-2 text-sm text-danger"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 left-0 right-0 mt-2 p-3 bg-success/10 border border-success/20 rounded-lg shadow-lg flex items-center justify-center gap-2 text-sm text-success font-medium"
          >
            Transaction added successfully!
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

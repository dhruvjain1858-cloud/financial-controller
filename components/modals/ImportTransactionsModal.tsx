import { useState, useRef } from "react";
import { Modal } from "@/components/Modal";
import { useFinancial } from "@/context/FinancialContext";
import { detectCategory } from "@/utils/smartInput";
import { UploadCloud, CheckCircle2, AlertCircle, Trash2 } from "lucide-react";
import { formatCurrency, todayISO } from "@/utils/helpers";
import { Transaction } from "@/types";
import { motion } from "framer-motion";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedTx {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  confidence: string;
  isDuplicate: boolean;
  exclude: boolean;
}

function parseCSV(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentVal += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some(v => v !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(v => v !== '')) rows.push(currentRow);
  }
  return rows;
}

export function ImportTransactionsModal({ isOpen, onClose }: Props) {
  const { state, addTransaction, addCustomMapping } = useFinancial();
  const [parsedTxs, setParsedTxs] = useState<ParsedTx[]>([]);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError("");
    setSuccessMsg("");
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a valid CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processCSV(text);
    };
    reader.readAsText(file);
  };

  const processCSV = (text: string) => {
    const rows = parseCSV(text);
    if (rows.length < 2) {
      setError("CSV file must contain headers and at least one row.");
      return;
    }

    const headers = rows[0].map(h => h.toLowerCase().replace(/[^a-z]/g, ''));
    const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('time'));
    const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('narration') || h.includes('details') || h.includes('title') || h.includes('payee'));
    const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('debit') || h.includes('credit') || h.includes('value'));

    if (descIdx === -1 || amountIdx === -1) {
      setError("Could not detect standard columns. Ensure your CSV has 'Description' and 'Amount' columns.");
      return;
    }

    const txs: ParsedTx[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < Math.max(descIdx, amountIdx)) continue;

      let dateStr = dateIdx !== -1 ? row[dateIdx] : todayISO();
      // basic fallback if date is weird
      if (!dateStr || dateStr.length < 5) dateStr = todayISO();

      let desc = row[descIdx];
      // Clean description
      desc = desc.replace(/^[^\w\s]+/, "").trim();

      const amountStr = row[amountIdx].replace(/[^0-9.-]/g, '');
      const amount = Math.abs(parseFloat(amountStr));

      if (isNaN(amount) || amount <= 0 || !desc) continue;

      const detection = detectCategory(desc, state.customMappings);

      // Duplicate check against existing state
      const isDuplicate = state.transactions.some(
        t => t.amount === amount && t.description?.toLowerCase() === desc.toLowerCase() && t.date === dateStr
      );

      txs.push({
        id: Math.random().toString(),
        date: dateStr,
        description: desc,
        amount,
        category: detection.category,
        confidence: detection.confidence,
        isDuplicate,
        exclude: isDuplicate, // auto-exclude duplicates
      });
    }

    if (txs.length === 0) {
      setError("No valid transactions found in the CSV.");
    } else {
      setParsedTxs(txs);
    }
  };

  const handleCategoryChange = (id: string, newCat: string) => {
    setParsedTxs(prev => prev.map(t => t.id === id ? { ...t, category: newCat } : t));
  };

  const toggleExclude = (id: string) => {
    setParsedTxs(prev => prev.map(t => t.id === id ? { ...t, exclude: !t.exclude } : t));
  };

  const handleImport = () => {
    const toImport = parsedTxs.filter(t => !t.exclude);
    if (toImport.length === 0) {
      setError("No transactions selected for import.");
      return;
    }

    let count = 0;
    toImport.forEach(t => {
      // If user changed category from what was strictly detected, store mapping
      const originalDetection = detectCategory(t.description, state.customMappings);
      if (t.category !== originalDetection.category && originalDetection.category !== "Other") {
        addCustomMapping(t.description, t.category);
      }

      addTransaction({
        type: "expense",
        amount: t.amount,
        category: t.category,
        description: t.description,
        date: t.date || todayISO(),
      });
      count++;
    });

    setSuccessMsg(`${count} transactions imported successfully!`);
    setParsedTxs([]);
    setTimeout(() => {
      setSuccessMsg("");
      onClose();
    }, 2000);
  };

  const reset = () => {
    setParsedTxs([]);
    setError("");
    setSuccessMsg("");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import CSV Transactions">
      <div className="space-y-4">
        {successMsg ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-success/10 text-success rounded-xl text-center font-medium flex flex-col items-center gap-3 border border-success/20">
            <CheckCircle2 className="w-12 h-12" />
            {successMsg}
          </motion.div>
        ) : parsedTxs.length === 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              Upload a bank CSV statement. Our AI will clean the data, remove duplicates, and auto-categorize each row.
            </p>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all text-center
                ${isDragging ? "border-primary bg-primary/5" : "border-border/60 hover:border-primary/50 hover:bg-white/5"}`}
            >
              <UploadCloud className={`w-10 h-10 mb-3 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
              <p className="font-medium">Click or drag CSV file here</p>
              <p className="text-xs text-muted-foreground mt-1">Requires Description and Amount columns</p>
              <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Review & Import</p>
              <p className="text-xs text-muted-foreground">
                {parsedTxs.filter(t => !t.exclude).length} of {parsedTxs.length} selected
              </p>
            </div>

            <div className="max-h-[400px] overflow-y-auto border border-border/50 rounded-xl bg-card/50">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 font-medium w-10">Use</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium">Amount</th>
                    <th className="px-3 py-2 font-medium min-w-[140px]">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {parsedTxs.map(tx => (
                    <tr key={tx.id} className={tx.exclude ? "opacity-50 bg-background" : "hover:bg-white/5 transition-colors"}>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={!tx.exclude}
                          onChange={() => toggleExclude(tx.id)}
                          className="rounded border-border bg-background focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <p className="truncate max-w-[150px] md:max-w-[200px]" title={tx.description}>{tx.description}</p>
                        {tx.isDuplicate && <span className="text-[10px] text-danger font-medium">Duplicate</span>}
                      </td>
                      <td className="px-3 py-2 font-medium">{formatCurrency(tx.amount)}</td>
                      <td className="px-3 py-2">
                        <select
                          value={tx.category}
                          onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                          disabled={tx.exclude}
                          className="w-full bg-background border border-border/50 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-primary"
                        >
                          {state.categories
                            .filter((c) => !["Salary", "Freelance", "Investment"].includes(c))
                            .map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        {!tx.exclude && tx.category !== "Other" && (
                          <div className="flex items-center gap-1 mt-1 px-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tx.confidence === "HIGH" ? "#10B981" : tx.confidence === "MEDIUM" ? "#F59E0B" : "#EF4444" }} />
                            <span className="text-[9px] text-muted-foreground uppercase">{tx.confidence}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            <div className="pt-2 flex gap-3">
              <button onClick={reset} className="flex-1 py-3 rounded-xl border border-border hover:bg-white/5 transition-colors font-medium">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={parsedTxs.filter(t => !t.exclude).length === 0}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {parsedTxs.filter(t => !t.exclude).length} Transactions
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

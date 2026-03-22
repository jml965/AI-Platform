import React, { useState, useEffect } from "react";
import { useI18n } from "../lib/i18n";

interface HistoryRecord {
  id: string;
  tableName: string;
  recordKey: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  lang: string | null;
  editedBy: string | null;
  createdAt: string;
}

export default function EditHistory() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [rollbackDate, setRollbackDate] = useState("");
  const [rolling, setRolling] = useState(false);
  const [message, setMessage] = useState("");

  const baseUrl = (import.meta as any).env?.VITE_API_URL || "";

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const table = filter === "all" ? "" : `?table=${filter}`;
      const res = await fetch(`${baseUrl}/api/edit-history${table}`);
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, [filter]);

  const handleRollbackOne = async (id: string) => {
    if (!confirm(isAr ? "هل تريد التراجع عن هذا التعديل؟" : "Rollback this edit?")) return;
    try {
      const res = await fetch(`${baseUrl}/api/edit-history/rollback/${id}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setMessage(isAr ? `✅ تم التراجع: ${data.rolledBack.key}` : `✅ Rolled back: ${data.rolledBack.key}`);
        window.dispatchEvent(new CustomEvent("ai-edit-complete"));
        fetchHistory();
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleRollbackToDate = async () => {
    if (!rollbackDate) return;
    if (!confirm(isAr ? `هل تريد إرجاع كل التعديلات بعد ${rollbackDate}؟` : `Rollback all edits after ${rollbackDate}?`)) return;
    setRolling(true);
    try {
      const res = await fetch(`${baseUrl}/api/edit-history/rollback-to-date`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ before: rollbackDate }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(isAr ? `✅ تم إرجاع ${data.rolledBackCount} تعديل` : `✅ Rolled back ${data.rolledBackCount} edits`);
        window.dispatchEvent(new CustomEvent("ai-edit-complete"));
        fetchHistory();
      }
    } catch (err: any) {
      setMessage(`❌ ${err.message}`);
    }
    setRolling(false);
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleString(isAr ? "ar-SA" : "en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return d; }
  };

  const getTypeLabel = (t: string) => {
    if (t === "ui_text_overrides") return isAr ? "نص" : "Text";
    if (t === "ui_style_overrides") return isAr ? "ستايل" : "Style";
    return t;
  };

  const getLangLabel = (l: string | null) => {
    if (l === "ar") return "🇸🇦";
    if (l === "en") return "🇬🇧";
    return "🌐";
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          {isAr ? "📋 سجل التعديلات" : "📋 Edit History"}
        </h1>

        {message && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg text-green-300">
            {message}
          </div>
        )}

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex gap-2">
            {["all", "ui_text_overrides", "ui_style_overrides"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  filter === f ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {f === "all" ? (isAr ? "الكل" : "All") : getTypeLabel(f)}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center ms-auto">
            <input
              type="datetime-local"
              value={rollbackDate}
              onChange={e => setRollbackDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
            />
            <button
              onClick={handleRollbackToDate}
              disabled={!rollbackDate || rolling}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 rounded-lg text-sm font-medium transition"
            >
              {rolling
                ? (isAr ? "جاري الإرجاع..." : "Rolling back...")
                : (isAr ? "إرجاع لهذا التاريخ" : "Rollback to date")}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">{isAr ? "جاري التحميل..." : "Loading..."}</div>
        ) : history.length === 0 ? (
          <div className="text-center text-gray-500 py-12">{isAr ? "لا يوجد تعديلات" : "No edits found"}</div>
        ) : (
          <div className="space-y-2">
            {history.map(h => (
              <div key={h.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-purple-900/50 text-purple-300 rounded text-xs font-medium">
                      {getTypeLabel(h.tableName)}
                    </span>
                    <span className="text-xs">{getLangLabel(h.lang)}</span>
                    <span className="text-gray-500 text-xs font-mono">{h.recordKey}</span>
                    {h.editedBy === "rollback" && (
                      <span className="px-2 py-0.5 bg-yellow-900/50 text-yellow-300 rounded text-xs">
                        {isAr ? "تراجع" : "rollback"}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 text-sm mt-1">
                    {h.oldValue && (
                      <span className="text-red-400 line-through truncate max-w-[200px]" title={h.oldValue}>
                        {h.oldValue.slice(0, 50)}
                      </span>
                    )}
                    <span className="text-gray-600">→</span>
                    <span className="text-green-400 truncate max-w-[200px]" title={h.newValue}>
                      {h.newValue.slice(0, 50)}
                    </span>
                  </div>
                  <div className="text-gray-600 text-xs mt-1">{formatDate(h.createdAt)}</div>
                </div>
                {h.editedBy !== "rollback" && (
                  <button
                    onClick={() => handleRollbackOne(h.id)}
                    className="px-3 py-1.5 bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-300 rounded-lg text-xs transition shrink-0"
                    title={isAr ? "تراجع" : "Undo"}
                  >
                    ↩️ {isAr ? "تراجع" : "Undo"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

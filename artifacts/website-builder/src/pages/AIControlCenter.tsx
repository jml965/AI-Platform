import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, Key, ExternalLink, Shield, ShieldCheck, ShieldAlert, ShieldX,
  Zap, Bot, DollarSign, Clock, Activity, AlertTriangle, Plus, Trash2, Save,
  Eye, EyeOff, RefreshCw, ArrowUpDown, ChevronDown, ChevronUp, BarChart2,
  Globe, Settings, Search, Filter, TrendingUp, Cpu, Info
} from "lucide-react";

const API = "/api";

interface ProviderModel {
  id: string;
  name: string;
  maxTokens: number;
  inputCostPer1k: number;
  outputCostPer1k: number;
}

interface AiProvider {
  id: string;
  providerKey: string;
  displayName: string;
  displayNameAr: string;
  logo: string;
  website: string;
  apiKeyUrl: string;
  apiKey: string;
  keyStatus: string;
  isCustom: boolean;
  enabled: boolean;
  priority: number;
  models: ProviderModel[];
  fallbackProviderKey: string | null;
  budgetMonthlyUsd: string;
  alertThreshold: number;
  totalTokensUsed: number;
  totalCostUsd: string;
}

interface LinkedAgent {
  agentKey: string;
  displayNameEn: string;
  displayNameAr: string;
  slots: { slot: string; model: string }[];
}

interface UsageData {
  daily: { cost: number; tokens: number; requests: number };
  weekly: { cost: number; tokens: number; requests: number };
  monthly: { cost: number; tokens: number; requests: number };
  recentLogs: any[];
}

function BLabel({ ar, en }: { ar: string; en: string }) {
  return <>{ar} <span className="text-[#58a6ff]">({en})</span></>;
}

function FieldHint({ text }: { text: string }) {
  return (
    <p className="text-[9px] text-[#8b949e]/70 mt-0.5 leading-relaxed">{text}</p>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: any; color: string; label: string }> = {
    active: { icon: ShieldCheck, color: "text-green-400 bg-green-500/15 border-green-500/30", label: "نشط Active" },
    error: { icon: ShieldX, color: "text-red-400 bg-red-500/15 border-red-500/30", label: "خطأ Error" },
    inactive: { icon: ShieldAlert, color: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30", label: "بدون مفتاح No Key" },
    expired: { icon: ShieldX, color: "text-orange-400 bg-orange-500/15 border-orange-500/30", label: "منتهي Expired" },
  };
  const c = config[status] || config.inactive;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${c.color}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function ProviderCard({
  provider,
  allProviders,
  onUpdate,
  onDelete,
  onValidate,
  onSwapModel,
}: {
  provider: AiProvider;
  allProviders: AiProvider[];
  onUpdate: (key: string, data: Partial<AiProvider>) => void;
  onDelete: (key: string) => void;
  onValidate: (key: string) => void;
  onSwapModel: (key: string, oldModel: string, newModel: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(provider.apiKey || "");
  const [linkedAgents, setLinkedAgents] = useState<LinkedAgent[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(false);

  useEffect(() => {
    if (expanded && linkedAgents.length === 0 && !loadingAgents) {
      setLoadingAgents(true);
      Promise.all([
        fetch(`${API}/providers/${provider.providerKey}/agents`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
        fetch(`${API}/providers/${provider.providerKey}/usage`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      ]).then(([agents, usageData]) => {
        setLinkedAgents(agents);
        setUsage(usageData);
        setLoadingAgents(false);
      }).catch(() => setLoadingAgents(false));
    }
  }, [expanded]);

  const budget = parseFloat(provider.budgetMonthlyUsd) || 0;
  const monthCost = usage?.monthly?.cost || 0;
  const budgetPercent = budget > 0 ? (monthCost / budget) * 100 : 0;
  const budgetColor = budgetPercent >= 100 ? "bg-red-500" : budgetPercent >= 80 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className={`bg-[#161b22] border rounded-xl overflow-hidden transition-all ${
      provider.keyStatus === "active" ? "border-green-500/20" : provider.keyStatus === "error" ? "border-red-500/20" : "border-white/7"
    }`}>
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-lg font-bold text-[#7c3aed] shrink-0">
          {provider.displayName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[13px] truncate">{provider.displayNameAr} <span className="text-[#58a6ff]">({provider.displayName})</span></span>
            <StatusBadge status={provider.keyStatus} />
          </div>
          <div className="text-[10px] text-[#8b949e] mt-0.5">
            {provider.models.length} نموذج (models) · الأولوية (Priority): #{provider.priority}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {budget > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${budgetColor}`} style={{ width: `${Math.min(budgetPercent, 100)}%` }} />
              </div>
              <span className="text-[9px] text-[#8b949e]">{budgetPercent.toFixed(0)}%</span>
            </div>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-[#8b949e]" /> : <ChevronDown className="w-4 h-4 text-[#8b949e]" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/7 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="مفتاح API" en="API Key" /></label>
              <FieldHint text="المفتاح السري للاتصال بخدمة المزود — تحصل عليه من لوحة تحكم المزود" />
              <div className="flex gap-1.5 mt-1">
                <div className="relative flex-1">
                  <input
                    type={showKey ? "text" : "password"}
                    value={localKey}
                    onChange={e => setLocalKey(e.target.value)}
                    placeholder="أدخل مفتاح API... (Enter API key...)"
                    className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-[#e2e8f0] font-mono pr-8"
                  />
                  <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-white">
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  onClick={() => { onUpdate(provider.providerKey, { apiKey: localKey } as any); }}
                  title="حفظ المفتاح (Save Key)"
                  className="px-2.5 py-2 bg-[#7c3aed]/20 text-[#7c3aed] rounded-lg text-[10px] hover:bg-[#7c3aed]/30 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onValidate(provider.providerKey)}
                  title="فحص صحة المفتاح (Validate Key)"
                  className="px-2.5 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-[10px] hover:bg-blue-500/30 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="رابط الحصول على المفتاح" en="Get API Key Link" /></label>
              <FieldHint text="رابط مباشر لصفحة إنشاء مفتاح API في موقع المزود" />
              <a
                href={provider.apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-blue-400 hover:text-blue-300 transition-colors mt-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {provider.apiKeyUrl ? new URL(provider.apiKeyUrl).hostname : provider.website}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="الأولوية" en="Priority" /></label>
              <FieldHint text="ترتيب الأفضلية — رقم أقل = أولوية أعلى" />
              <input
                type="number"
                min="1"
                max="50"
                value={provider.priority}
                onChange={e => onUpdate(provider.providerKey, { priority: parseInt(e.target.value) || 10 })}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="الميزانية الشهرية" en="Monthly Budget $" /></label>
              <FieldHint text="الحد الأقصى للإنفاق شهرياً بالدولار على هذا المزود" />
              <input
                type="number"
                min="0"
                step="1"
                value={parseFloat(provider.budgetMonthlyUsd) || 0}
                onChange={e => onUpdate(provider.providerKey, { budgetMonthlyUsd: e.target.value } as any)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="تنبيه عند %" en="Alert Threshold %" /></label>
              <FieldHint text="نسبة استهلاك الميزانية التي يُرسل عندها تنبيه تحذيري" />
              <input
                type="number"
                min="50"
                max="100"
                value={provider.alertThreshold}
                onChange={e => onUpdate(provider.providerKey, { alertThreshold: parseInt(e.target.value) || 80 })}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] mt-0.5"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="مزود احتياطي" en="Fallback Provider" /></label>
              <FieldHint text="المزود البديل الذي يُستخدم إذا فشل هذا المزود أو تجاوز الميزانية" />
              <select
                value={provider.fallbackProviderKey || ""}
                onChange={e => onUpdate(provider.providerKey, { fallbackProviderKey: e.target.value || null } as any)}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] mt-0.5"
              >
                <option value="">بدون (None)</option>
                {allProviders.filter(p => p.providerKey !== provider.providerKey).map(p => (
                  <option key={p.providerKey} value={p.providerKey}>{p.displayNameAr} ({p.displayName})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-3.5 h-3.5 text-[#7c3aed]" />
              <span className="text-[11px] font-medium"><BLabel ar="النماذج المتوفرة" en="Available Models" /></span>
            </div>
            <FieldHint text="قائمة نماذج الذكاء الاصطناعي التي يوفرها هذا المزود مع تكلفة كل نموذج" />
            <div className="grid gap-1.5 mt-1.5">
              {provider.models.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-[#0d1117] border border-white/5 rounded-lg px-3 py-2">
                  <div>
                    <span className="text-[11px] font-medium">{m.name}</span>
                    <span className="text-[9px] text-[#8b949e] ml-2">{m.id}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-[#8b949e]">
                    <span title="الحد الأقصى للتوكنات">{(m.maxTokens / 1000).toFixed(0)}K tokens</span>
                    <span className="text-green-400" title="تكلفة الإدخال لكل 1000 توكن">${m.inputCostPer1k}/1K in</span>
                    <span className="text-orange-400" title="تكلفة الإخراج لكل 1000 توكن">${m.outputCostPer1k}/1K out</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {usage && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-medium"><BLabel ar="الاستهلاك" en="Usage Statistics" /></span>
              </div>
              <FieldHint text="إحصائيات استخدام هذا المزود: التكلفة والتوكنات وعدد الطلبات" />
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[
                  { label: "اليوم (Today)", data: usage.daily },
                  { label: "الأسبوع (Week)", data: usage.weekly },
                  { label: "الشهر (Month)", data: usage.monthly },
                ].map(period => (
                  <div key={period.label} className="bg-[#0d1117] border border-white/5 rounded-lg p-2.5">
                    <span className="text-[9px] text-[#8b949e] block mb-1">{period.label}</span>
                    <div className="text-[13px] font-bold text-green-400">${period.data.cost.toFixed(4)}</div>
                    <div className="text-[9px] text-[#8b949e] mt-0.5">
                      {(period.data.tokens / 1000).toFixed(1)}K توكن (tokens) · {period.data.requests} طلب (req)
                    </div>
                  </div>
                ))}
              </div>

              {budget > 0 && budgetPercent >= (provider.alertThreshold || 80) && (
                <div className={`mt-2 flex items-center gap-2 p-2 rounded-lg text-[11px] ${
                  budgetPercent >= 100 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {budgetPercent >= 100
                    ? "تجاوزت الميزانية الشهرية! (Monthly budget exceeded!)"
                    : `وصلت ${budgetPercent.toFixed(0)}% من الميزانية الشهرية (Reached ${budgetPercent.toFixed(0)}% of monthly budget)`
                  }
                </div>
              )}
            </div>
          )}

          {linkedAgents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-[11px] font-medium"><BLabel ar="الوكلاء المرتبطون" en="Linked Agents" /></span>
              </div>
              <FieldHint text="الوكلاء الذين يستخدمون نماذج من هذا المزود حالياً" />
              <div className="grid gap-1.5 mt-1.5">
                {linkedAgents.map(a => (
                  <div key={a.agentKey} className="flex items-center justify-between bg-[#0d1117] border border-white/5 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-[11px] font-medium">{a.displayNameAr} <span className="text-[#58a6ff]">({a.displayNameEn})</span></span>
                      <div className="flex gap-1 mt-0.5">
                        {a.slots.map((s: any) => (
                          <span key={s.slot} className="text-[9px] px-1.5 py-0.5 rounded bg-[#7c3aed]/10 text-[#7c3aed]">
                            {s.slot}: {s.model}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {usage && usage.recentLogs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-medium"><BLabel ar="آخر الطلبات" en="Recent Requests" /></span>
              </div>
              <FieldHint text="سجل آخر الطلبات المرسلة لهذا المزود مع حالة النجاح والتكلفة" />
              <div className="max-h-40 overflow-y-auto space-y-1 mt-1.5">
                {usage.recentLogs.slice(0, 20).map((log: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-[#0d1117] border border-white/5 rounded px-2.5 py-1.5 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className={log.success ? "text-green-400" : "text-red-400"}>{log.success ? "✓" : "✗"}</span>
                      <span className="text-[#8b949e]">{log.modelId}</span>
                      {log.agentKey && <span className="text-[#7c3aed]">{log.agentKey}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[#8b949e]">
                      <span>{((log.inputTokens + log.outputTokens) / 1000).toFixed(1)}K</span>
                      <span className="text-green-400">${parseFloat(log.costUsd).toFixed(5)}</span>
                      <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
            <a
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300"
            >
              <Globe className="w-3 h-3" /> الموقع (Website)
            </a>
            {provider.isCustom && (
              <button
                onClick={() => onDelete(provider.providerKey)}
                className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 mr-auto"
              >
                <Trash2 className="w-3 h-3" /> حذف (Delete)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIControlCenter() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [newProvider, setNewProvider] = useState({ providerKey: "", displayName: "", displayNameAr: "", website: "", apiKeyUrl: "", models: [] as ProviderModel[] });
  const [newModelName, setNewModelName] = useState("");
  const [newModelId, setNewModelId] = useState("");

  useEffect(() => {
    fetch(`${API}/providers`, { credentials: "include" })
      .then(r => r.json())
      .then(setProviders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateProvider = (key: string, data: Partial<AiProvider>) => {
    fetch(`${API}/providers/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    }).then(r => r.json()).then(updated => {
      setProviders(prev => prev.map(p => p.providerKey === key ? { ...p, ...updated } : p));
    });
  };

  const deleteProvider = (key: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟ (Are you sure?)")) return;
    fetch(`${API}/providers/${key}`, { method: "DELETE", credentials: "include" })
      .then(() => setProviders(prev => prev.filter(p => p.providerKey !== key)));
  };

  const validateKey = (key: string) => {
    fetch(`${API}/providers/${key}/validate-key`, { method: "POST", credentials: "include" })
      .then(r => r.json())
      .then(result => {
        setProviders(prev => prev.map(p => p.providerKey === key ? { ...p, keyStatus: result.status } : p));
      });
  };

  const swapModel = (key: string, oldModel: string, newModel: string) => {
    fetch(`${API}/providers/${key}/swap-model`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ oldModelId: oldModel, newModelId: newModel }),
    });
  };

  const createProvider = () => {
    if (!newProvider.providerKey || !newProvider.displayName) return;
    fetch(`${API}/providers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...newProvider, priority: providers.length + 1 }),
    }).then(r => r.json()).then(created => {
      setProviders(prev => [...prev, created]);
      setShowNewForm(false);
      setNewProvider({ providerKey: "", displayName: "", displayNameAr: "", website: "", apiKeyUrl: "", models: [] });
    });
  };

  const addModelToNew = () => {
    if (!newModelName || !newModelId) return;
    setNewProvider(prev => ({
      ...prev,
      models: [...prev.models, { id: newModelId, name: newModelName, maxTokens: 128000, inputCostPer1k: 0.001, outputCostPer1k: 0.003 }],
    }));
    setNewModelName("");
    setNewModelId("");
  };

  const filtered = providers.filter(p =>
    p.displayName.toLowerCase().includes(search.toLowerCase()) ||
    p.displayNameAr.includes(search) ||
    p.providerKey.includes(search.toLowerCase())
  );

  const activeCount = providers.filter(p => p.keyStatus === "active").length;
  const totalModels = providers.reduce((s, p) => s + p.models.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#7c3aed]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e2e8f0]" dir="rtl">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#7c3aed]" />
                مركز التحكم بالذكاء الاصطناعي <span className="text-[#58a6ff] text-base font-normal">(AI Control Center)</span>
              </h1>
              <p className="text-[11px] text-[#8b949e] mt-0.5">
                إدارة مزودي الذكاء الاصطناعي ومفاتيح API والميزانيات (Manage AI providers, API keys, and budgets)
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-[12px] font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة مزود (Add Provider)
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="bg-[#161b22] border border-white/7 rounded-xl p-3">
            <div className="text-[10px] text-[#8b949e] mb-1">المزودون (Providers)</div>
            <div className="text-xl font-bold">{providers.length}</div>
            <FieldHint text="عدد مزودي الخدمة المسجلين" />
          </div>
          <div className="bg-[#161b22] border border-white/7 rounded-xl p-3">
            <div className="text-[10px] text-[#8b949e] mb-1">مفاتيح نشطة (Active Keys)</div>
            <div className="text-xl font-bold text-green-400">{activeCount}</div>
            <FieldHint text="عدد المزودين الذين مفاتيحهم تعمل" />
          </div>
          <div className="bg-[#161b22] border border-white/7 rounded-xl p-3">
            <div className="text-[10px] text-[#8b949e] mb-1">إجمالي النماذج (Total Models)</div>
            <div className="text-xl font-bold text-[#7c3aed]">{totalModels}</div>
            <FieldHint text="مجموع نماذج الذكاء الاصطناعي المتاحة عبر كل المزودين" />
          </div>
          <div className="bg-[#161b22] border border-white/7 rounded-xl p-3">
            <div className="text-[10px] text-[#8b949e] mb-1">التكلفة الإجمالية (Total Cost)</div>
            <div className="text-xl font-bold text-orange-400">${providers.reduce((s, p) => s + parseFloat(p.totalCostUsd), 0).toFixed(4)}</div>
            <FieldHint text="إجمالي المبلغ المصروف على جميع المزودين" />
          </div>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث عن مزود... (Search providers...)"
              className="w-full bg-[#161b22] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-[12px] text-[#e2e8f0]"
            />
          </div>
        </div>

        {showNewForm && (
          <div className="bg-[#161b22] border border-[#7c3aed]/30 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#7c3aed]" />
                إضافة مزود جديد (Add New Provider)
              </span>
              <button onClick={() => setShowNewForm(false)} className="text-[#8b949e] hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="المعرّف" en="Provider Key" /></label>
                <FieldHint text="معرّف فريد بالإنجليزية للمزود بدون مسافات" />
                <input
                  value={newProvider.providerKey}
                  onChange={e => setNewProvider(p => ({ ...p, providerKey: e.target.value.toLowerCase().replace(/\s/g, "_") }))}
                  placeholder="my_provider"
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-[#e2e8f0] mt-0.5"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="الاسم بالإنجليزية" en="Display Name" /></label>
                <FieldHint text="اسم المزود كما يظهر في الواجهة" />
                <input
                  value={newProvider.displayName}
                  onChange={e => setNewProvider(p => ({ ...p, displayName: e.target.value }))}
                  placeholder="My AI Provider"
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-[#e2e8f0] mt-0.5"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="الاسم بالعربي" en="Arabic Name" /></label>
                <FieldHint text="اسم المزود بالعربية" />
                <input
                  value={newProvider.displayNameAr}
                  onChange={e => setNewProvider(p => ({ ...p, displayNameAr: e.target.value }))}
                  placeholder="مزود الذكاء"
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-[#e2e8f0] mt-0.5"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="رابط المفتاح" en="API Key URL" /></label>
                <FieldHint text="رابط صفحة الحصول على مفتاح API من موقع المزود" />
                <input
                  value={newProvider.apiKeyUrl}
                  onChange={e => setNewProvider(p => ({ ...p, apiKeyUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-[#e2e8f0] mt-0.5"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="النماذج" en="Models" /></label>
              <FieldHint text="أضف نماذج الذكاء الاصطناعي المتوفرة لهذا المزود بمعرّفها واسمها" />
              <div className="flex gap-2 mb-2 mt-1">
                <input
                  value={newModelId}
                  onChange={e => setNewModelId(e.target.value)}
                  placeholder="معرف النموذج (model-id)"
                  className="flex-1 bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0]"
                  dir="ltr"
                />
                <input
                  value={newModelName}
                  onChange={e => setNewModelName(e.target.value)}
                  placeholder="اسم النموذج (Model Name)"
                  className="flex-1 bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0]"
                />
                <button onClick={addModelToNew} className="px-3 py-1.5 bg-[#7c3aed]/20 text-[#7c3aed] rounded-lg text-[10px]">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {newProvider.models.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {newProvider.models.map((m, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed]">{m.name}</span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={createProvider}
              disabled={!newProvider.providerKey || !newProvider.displayName}
              className="w-full py-2 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-lg text-[12px] font-medium transition-colors disabled:opacity-40"
            >
              إنشاء المزود (Create Provider)
            </button>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map(provider => (
            <ProviderCard
              key={provider.providerKey}
              provider={provider}
              allProviders={providers}
              onUpdate={updateProvider}
              onDelete={deleteProvider}
              onValidate={validateKey}
              onSwapModel={swapModel}
            />
          ))}
        </div>

        {filtered.length === 0 && !loading && (
          <div className="text-center py-12 text-[#8b949e]">
            <Cpu className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-[13px]">لا توجد نتائج (No providers found)</p>
          </div>
        )}
      </div>
    </div>
  );
}

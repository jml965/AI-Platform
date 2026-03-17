import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  ArrowLeft, ExternalLink, ShieldCheck, ShieldAlert, ShieldX,
  Bot, Activity, AlertTriangle, Plus, Trash2, Save,
  Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp, BarChart2,
  Globe, Settings, Search, Cpu, Image, Film
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

interface MediaModel {
  id: string;
  name: string;
  maxResolution: string;
  costPerRequest: number;
  description: string;
}

interface MediaProvider {
  id: string;
  providerKey: string;
  type: string;
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
  models: MediaModel[];
  budgetMonthlyUsd: string;
  alertThreshold: number;
  totalRequests: number;
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
  return <p className="text-[9px] text-[#8b949e]/70 mt-0.5 leading-relaxed">{text}</p>;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-400",
    error: "bg-red-400",
    inactive: "bg-yellow-400",
    expired: "bg-orange-400",
  };
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors[status] || colors.inactive}`} />;
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

function AiProviderDetail({
  provider,
  allProviders,
  onUpdate,
  onDelete,
  onValidate,
}: {
  provider: AiProvider;
  allProviders: AiProvider[];
  onUpdate: (key: string, data: Partial<AiProvider>) => void;
  onDelete: (key: string) => void;
  onValidate: (key: string) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(provider.apiKey || "");
  const [linkedAgents, setLinkedAgents] = useState<LinkedAgent[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    setLocalKey(provider.apiKey || "");
    Promise.all([
      fetch(`${API}/providers/${provider.providerKey}/agents`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
      fetch(`${API}/providers/${provider.providerKey}/usage`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
    ]).then(([agents, usageData]) => {
      setLinkedAgents(agents);
      setUsage(usageData);
    }).catch(() => {});
  }, [provider.providerKey]);

  const budget = parseFloat(provider.budgetMonthlyUsd) || 0;
  const monthCost = usage?.monthly?.cost || 0;
  const budgetPercent = budget > 0 ? (monthCost / budget) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center text-xl font-bold text-[#7c3aed]">
          {provider.displayName.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="text-[15px] font-bold">{provider.displayNameAr} <span className="text-[#58a6ff]">({provider.displayName})</span></h2>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={provider.keyStatus} />
            <span className="text-[10px] text-[#8b949e]">{provider.models.length} نموذج (models)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="مفتاح API" en="API Key" /></label>
          <FieldHint text="المفتاح السري للاتصال بخدمة المزود" />
          <div className="flex gap-1.5 mt-1">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={localKey}
                onChange={e => setLocalKey(e.target.value)}
                placeholder="أدخل مفتاح API..."
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-[#e2e8f0] font-mono pr-8"
              />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-white">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button onClick={() => onUpdate(provider.providerKey, { apiKey: localKey } as any)} title="حفظ" className="px-2.5 py-2 bg-[#7c3aed]/20 text-[#7c3aed] rounded-lg text-[10px] hover:bg-[#7c3aed]/30"><Save className="w-3.5 h-3.5" /></button>
            <button onClick={() => onValidate(provider.providerKey)} title="فحص" className="px-2.5 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-[10px] hover:bg-blue-500/30"><RefreshCw className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="رابط الحصول على المفتاح" en="Get API Key Link" /></label>
          <FieldHint text="رابط مباشر لصفحة إنشاء مفتاح API في موقع المزود" />
          <a href={provider.apiKeyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-blue-400 hover:text-blue-300 mt-1">
            <ExternalLink className="w-3.5 h-3.5" />
            {provider.apiKeyUrl ? new URL(provider.apiKeyUrl).hostname : provider.website}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="الأولوية" en="Priority" /></label>
          <FieldHint text="رقم أقل = أولوية أعلى" />
          <input type="number" min="1" max="50" value={provider.priority} onChange={e => onUpdate(provider.providerKey, { priority: parseInt(e.target.value) || 10 })} className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] mt-0.5" />
        </div>
        <div>
          <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="الميزانية الشهرية" en="Monthly Budget $" /></label>
          <FieldHint text="الحد الأقصى للإنفاق شهرياً بالدولار" />
          <input type="number" min="0" step="1" value={parseFloat(provider.budgetMonthlyUsd) || 0} onChange={e => onUpdate(provider.providerKey, { budgetMonthlyUsd: e.target.value } as any)} className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] mt-0.5" />
        </div>
        <div>
          <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="تنبيه عند %" en="Alert Threshold %" /></label>
          <FieldHint text="نسبة الميزانية التي يُرسل عندها تنبيه" />
          <input type="number" min="50" max="100" value={provider.alertThreshold} onChange={e => onUpdate(provider.providerKey, { alertThreshold: parseInt(e.target.value) || 80 })} className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] mt-0.5" />
        </div>
        <div>
          <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="مزود احتياطي" en="Fallback Provider" /></label>
          <FieldHint text="المزود البديل إذا فشل هذا المزود" />
          <select value={provider.fallbackProviderKey || ""} onChange={e => onUpdate(provider.providerKey, { fallbackProviderKey: e.target.value || null } as any)} className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] mt-0.5">
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
        <FieldHint text="قائمة نماذج الذكاء الاصطناعي مع تكلفة كل نموذج" />
        <div className="grid gap-1.5 mt-1.5">
          {provider.models.map(m => (
            <div key={m.id} className="flex items-center justify-between bg-[#0d1117] border border-white/5 rounded-lg px-3 py-2">
              <div>
                <span className="text-[11px] font-medium">{m.name}</span>
                <span className="text-[9px] text-[#8b949e] ml-2">{m.id}</span>
              </div>
              <div className="flex items-center gap-3 text-[9px] text-[#8b949e]">
                <span title="الحد الأقصى للتوكنات">{(m.maxTokens / 1000).toFixed(0)}K tokens</span>
                <span className="text-green-400" title="تكلفة الإدخال">${m.inputCostPer1k}/1K in</span>
                <span className="text-orange-400" title="تكلفة الإخراج">${m.outputCostPer1k}/1K out</span>
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
          <FieldHint text="إحصائيات استخدام هذا المزود" />
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
                  {(period.data.tokens / 1000).toFixed(1)}K توكن · {period.data.requests} طلب
                </div>
              </div>
            ))}
          </div>
          {budget > 0 && budgetPercent >= (provider.alertThreshold || 80) && (
            <div className={`mt-2 flex items-center gap-2 p-2 rounded-lg text-[11px] ${budgetPercent >= 100 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"}`}>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {budgetPercent >= 100 ? "تجاوزت الميزانية الشهرية!" : `وصلت ${budgetPercent.toFixed(0)}% من الميزانية`}
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
          <FieldHint text="الوكلاء الذين يستخدمون نماذج من هذا المزود" />
          <div className="grid gap-1.5 mt-1.5">
            {linkedAgents.map(a => (
              <div key={a.agentKey} className="flex items-center justify-between bg-[#0d1117] border border-white/5 rounded-lg px-3 py-2">
                <div>
                  <span className="text-[11px] font-medium">{a.displayNameAr} <span className="text-[#58a6ff]">({a.displayNameEn})</span></span>
                  <div className="flex gap-1 mt-0.5">
                    {a.slots.map((s: any) => (
                      <span key={s.slot} className="text-[9px] px-1.5 py-0.5 rounded bg-[#7c3aed]/10 text-[#7c3aed]">{s.slot}: {s.model}</span>
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
          <FieldHint text="سجل آخر الطلبات المرسلة لهذا المزود" />
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

      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
        <a href={provider.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
          <Globe className="w-3 h-3" /> الموقع (Website)
        </a>
        {provider.isCustom && (
          <button onClick={() => onDelete(provider.providerKey)} className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300">
            <Trash2 className="w-3 h-3" /> حذف (Delete)
          </button>
        )}
      </div>
    </div>
  );
}

function MediaProviderDetail({
  provider,
  onUpdate,
  onDelete,
}: {
  provider: MediaProvider;
  onUpdate: (key: string, data: any) => void;
  onDelete: (key: string) => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const [localKey, setLocalKey] = useState(provider.apiKey || "");

  useEffect(() => {
    setLocalKey(provider.apiKey || "");
  }, [provider.providerKey]);

  const isImage = provider.type === "image";
  const typeIcon = isImage ? <Image className="w-4 h-4 text-pink-400" /> : <Film className="w-4 h-4 text-cyan-400" />;
  const typeColor = isImage ? "text-pink-400" : "text-cyan-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isImage ? "bg-pink-500/10" : "bg-cyan-500/10"}`}>
          {typeIcon}
        </div>
        <div className="flex-1">
          <h2 className="text-[15px] font-bold">{provider.displayNameAr} <span className="text-[#58a6ff]">({provider.displayName})</span></h2>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={provider.keyStatus} />
            <span className="text-[10px] text-[#8b949e]">{provider.models.length} {isImage ? "نموذج صور" : "نموذج فيديو"}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="مفتاح API" en="API Key" /></label>
          <FieldHint text="المفتاح السري للاتصال بخدمة المزود" />
          <div className="flex gap-1.5 mt-1">
            <div className="relative flex-1">
              <input type={showKey ? "text" : "password"} value={localKey} onChange={e => setLocalKey(e.target.value)} placeholder="أدخل مفتاح API..." className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-[#e2e8f0] font-mono pr-8" />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-white">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button onClick={() => onUpdate(provider.providerKey, { apiKey: localKey })} title="حفظ" className="px-2.5 py-2 bg-[#7c3aed]/20 text-[#7c3aed] rounded-lg text-[10px] hover:bg-[#7c3aed]/30"><Save className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="رابط الحصول على المفتاح" en="Get API Key Link" /></label>
          <FieldHint text="رابط مباشر لصفحة إنشاء مفتاح API" />
          <a href={provider.apiKeyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-blue-400 hover:text-blue-300 mt-1">
            <ExternalLink className="w-3.5 h-3.5" />
            {provider.apiKeyUrl ? (() => { try { return new URL(provider.apiKeyUrl).hostname; } catch { return provider.website; } })() : provider.website}
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="الأولوية" en="Priority" /></label>
          <FieldHint text="رقم أقل = أولوية أعلى" />
          <input type="number" min="1" max="50" value={provider.priority} onChange={e => onUpdate(provider.providerKey, { priority: parseInt(e.target.value) || 10 })} className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] mt-0.5" />
        </div>
        <div>
          <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="الميزانية الشهرية" en="Monthly Budget $" /></label>
          <FieldHint text="الحد الأقصى للإنفاق شهرياً" />
          <input type="number" min="0" step="1" value={parseFloat(provider.budgetMonthlyUsd) || 0} onChange={e => onUpdate(provider.providerKey, { budgetMonthlyUsd: e.target.value })} className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] mt-0.5" />
        </div>
        <div>
          <label className="text-[10px] text-[#8b949e] mb-1 block"><BLabel ar="تنبيه عند %" en="Alert %" /></label>
          <FieldHint text="نسبة الميزانية للتنبيه" />
          <input type="number" min="50" max="100" value={provider.alertThreshold} onChange={e => onUpdate(provider.providerKey, { alertThreshold: parseInt(e.target.value) || 80 })} className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-[#e2e8f0] mt-0.5" />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          {isImage ? <Image className="w-3.5 h-3.5 text-pink-400" /> : <Film className="w-3.5 h-3.5 text-cyan-400" />}
          <span className="text-[11px] font-medium"><BLabel ar={isImage ? "نماذج الصور المتوفرة" : "نماذج الفيديو المتوفرة"} en={isImage ? "Available Image Models" : "Available Video Models"} /></span>
        </div>
        <FieldHint text={isImage ? "النماذج المتاحة لتوليد الصور مع الدقة والتكلفة" : "النماذج المتاحة لتوليد الفيديو مع الدقة والتكلفة"} />
        <div className="grid gap-1.5 mt-1.5">
          {provider.models.map(m => (
            <div key={m.id} className="bg-[#0d1117] border border-white/5 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium">{m.name}</span>
                  <span className="text-[9px] text-[#8b949e] ml-2">{m.id}</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] text-[#8b949e]">
                  <span className={typeColor}>{m.maxResolution}</span>
                  <span className="text-orange-400">${m.costPerRequest}/طلب</span>
                </div>
              </div>
              <p className="text-[9px] text-[#8b949e]/70 mt-1">{m.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
        <a href={provider.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300">
          <Globe className="w-3 h-3" /> الموقع (Website)
        </a>
        {provider.isCustom && (
          <button onClick={() => onDelete(provider.providerKey)} className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300">
            <Trash2 className="w-3 h-3" /> حذف (Delete)
          </button>
        )}
      </div>
    </div>
  );
}

type SidebarSection = "ai" | "image" | "video";

export default function AIControlCenter() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [mediaProviders, setMediaProviders] = useState<MediaProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSection, setActiveSection] = useState<SidebarSection>("ai");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/providers`, { credentials: "include" }).then(r => r.json()).catch(() => []),
      fetch(`${API}/media-providers`, { credentials: "include" }).then(r => r.json()).catch(() => []),
    ]).then(([aiP, mediaP]) => {
      setProviders(aiP);
      setMediaProviders(mediaP);
      if (aiP.length > 0) setSelectedKey(aiP[0].providerKey);
    }).finally(() => setLoading(false));
  }, []);

  const updateProvider = (key: string, data: Partial<AiProvider>) => {
    fetch(`${API}/providers/${key}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) })
      .then(r => r.json()).then(updated => { setProviders(prev => prev.map(p => p.providerKey === key ? { ...p, ...updated } : p)); });
  };

  const deleteProvider = (key: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    fetch(`${API}/providers/${key}`, { method: "DELETE", credentials: "include" })
      .then(() => { setProviders(prev => prev.filter(p => p.providerKey !== key)); setSelectedKey(null); });
  };

  const validateKey = (key: string) => {
    fetch(`${API}/providers/${key}/validate-key`, { method: "POST", credentials: "include" })
      .then(r => r.json()).then(result => { setProviders(prev => prev.map(p => p.providerKey === key ? { ...p, keyStatus: result.status } : p)); });
  };

  const updateMediaProvider = (key: string, data: any) => {
    fetch(`${API}/media-providers/${key}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) })
      .then(r => r.json()).then(updated => { setMediaProviders(prev => prev.map(p => p.providerKey === key ? { ...p, ...updated } : p)); });
  };

  const deleteMediaProvider = (key: string) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    fetch(`${API}/media-providers/${key}`, { method: "DELETE", credentials: "include" })
      .then(() => { setMediaProviders(prev => prev.filter(p => p.providerKey !== key)); setSelectedKey(null); });
  };

  const imageProviders = mediaProviders.filter(p => p.type === "image");
  const videoProviders = mediaProviders.filter(p => p.type === "video");

  const currentList = activeSection === "ai" ? providers : activeSection === "image" ? imageProviders : videoProviders;
  const filteredList = currentList.filter(p =>
    p.displayName.toLowerCase().includes(search.toLowerCase()) ||
    p.displayNameAr.includes(search) ||
    p.providerKey.includes(search.toLowerCase())
  );

  const selectedAiProvider = providers.find(p => p.providerKey === selectedKey);
  const selectedMediaProvider = mediaProviders.find(p => p.providerKey === selectedKey);

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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/7 bg-[#161b22]">
        <Link href="/">
          <button className="p-2 hover:bg-white/5 rounded-lg"><ArrowLeft className="w-5 h-5" /></button>
        </Link>
        <Settings className="w-5 h-5 text-[#7c3aed]" />
        <div className="flex-1">
          <h1 className="text-[15px] font-bold">مركز التحكم بالذكاء الاصطناعي <span className="text-[#58a6ff] text-[13px] font-normal">(AI Control Center)</span></h1>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#8b949e]">
          <span>{providers.length} مزود نصي</span>
          <span>{imageProviders.length} مزود صور</span>
          <span>{videoProviders.length} مزود فيديو</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 px-4 py-3 border-b border-white/7">
        <div className="bg-[#161b22] border border-white/7 rounded-xl p-2.5">
          <div className="text-[10px] text-[#8b949e] mb-0.5">المزودون (Providers)</div>
          <div className="text-lg font-bold">{providers.length + mediaProviders.length}</div>
        </div>
        <div className="bg-[#161b22] border border-white/7 rounded-xl p-2.5">
          <div className="text-[10px] text-[#8b949e] mb-0.5">مفاتيح نشطة (Active)</div>
          <div className="text-lg font-bold text-green-400">{activeCount}</div>
        </div>
        <div className="bg-[#161b22] border border-white/7 rounded-xl p-2.5">
          <div className="text-[10px] text-[#8b949e] mb-0.5">نماذج النص (Text Models)</div>
          <div className="text-lg font-bold text-[#7c3aed]">{totalModels}</div>
        </div>
        <div className="bg-[#161b22] border border-white/7 rounded-xl p-2.5">
          <div className="text-[10px] text-[#8b949e] mb-0.5">نماذج الوسائط (Media Models)</div>
          <div className="text-lg font-bold text-pink-400">{mediaProviders.reduce((s, p) => s + p.models.length, 0)}</div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-140px)]">
        <div className="w-64 border-l border-white/7 bg-[#0d1117] flex flex-col shrink-0">
          <div className="p-2">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b949e]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="بحث..."
                className="w-full bg-[#161b22] border border-white/10 rounded-lg pr-8 pl-3 py-1.5 text-[11px] text-[#e2e8f0]"
              />
            </div>
          </div>

          <div className="flex border-b border-white/7">
            {([
              { key: "ai" as SidebarSection, icon: <Cpu className="w-3.5 h-3.5" />, label: "نصي", color: "text-[#7c3aed]" },
              { key: "image" as SidebarSection, icon: <Image className="w-3.5 h-3.5" />, label: "صور", color: "text-pink-400" },
              { key: "video" as SidebarSection, icon: <Film className="w-3.5 h-3.5" />, label: "فيديو", color: "text-cyan-400" },
            ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveSection(tab.key); setSelectedKey(null); }}
                className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium border-b-2 transition-colors ${
                  activeSection === tab.key ? `${tab.color} border-current` : "text-[#8b949e] border-transparent hover:text-white/60"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredList.map((p: any) => (
              <button
                key={p.providerKey}
                onClick={() => setSelectedKey(p.providerKey)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-right transition-colors border-b border-white/[0.03] ${
                  selectedKey === p.providerKey ? "bg-[#7c3aed]/10 border-r-2 border-r-[#7c3aed]" : "hover:bg-white/[0.02]"
                }`}
              >
                <StatusDot status={p.keyStatus} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate">{p.displayNameAr}</div>
                  <div className="text-[9px] text-[#8b949e] truncate">{p.displayName}</div>
                </div>
                <span className="text-[9px] text-[#8b949e] shrink-0">{p.models?.length || 0}</span>
              </button>
            ))}

            {filteredList.length === 0 && (
              <div className="text-center py-8 text-[#8b949e]">
                <p className="text-[11px]">لا توجد نتائج</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!selectedKey && (
            <div className="flex flex-col items-center justify-center h-full text-[#8b949e]">
              {activeSection === "ai" && <Cpu className="w-10 h-10 mb-3 opacity-30" />}
              {activeSection === "image" && <Image className="w-10 h-10 mb-3 opacity-30" />}
              {activeSection === "video" && <Film className="w-10 h-10 mb-3 opacity-30" />}
              <p className="text-[13px]">اختر مزوداً من القائمة</p>
              <p className="text-[10px] mt-1">
                {activeSection === "ai" && "مزودو نماذج النص والمحادثة"}
                {activeSection === "image" && "مزودو نماذج توليد الصور"}
                {activeSection === "video" && "مزودو نماذج توليد الفيديو"}
              </p>
            </div>
          )}

          {selectedKey && activeSection === "ai" && selectedAiProvider && (
            <AiProviderDetail
              provider={selectedAiProvider}
              allProviders={providers}
              onUpdate={updateProvider}
              onDelete={deleteProvider}
              onValidate={validateKey}
            />
          )}

          {selectedKey && (activeSection === "image" || activeSection === "video") && selectedMediaProvider && (
            <MediaProviderDetail
              provider={selectedMediaProvider}
              onUpdate={updateMediaProvider}
              onDelete={deleteMediaProvider}
            />
          )}
        </div>
      </div>
    </div>
  );
}

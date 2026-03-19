import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import type { CSSProperties, MouseEvent as RMouseEvent } from "react";
import { startProject } from "../lib/api";
import { GlobalHeader } from "../components/global-header";

/* ── ProjectsContent, PublishedContent, etc. ── */
import {
  FolderOpen, Box, Rocket, User, CreditCard,
  Settings as SettingsIcon, Languages, Palette, Bell,
  Moon, Sun, Shield, Key, Mail, Clock, Trash2, ExternalLink,
  Globe, BookOpen, FileText, Bot,
} from "lucide-react";

/* ══════════════════════════════════════════
   ICONS — inline SVG (exact from design)
══════════════════════════════════════════ */
const ICONS: Record<string, JSX.Element> = {
  home:        <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  layoutGrid:  <><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></>,
  globe:       <><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
  puzzle:      <><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.567a2.502 2.502 0 0 1 1.614-4.398c.669.049 1.257.363 1.679.851a1.026 1.026 0 0 0 .877.29 1.026 1.026 0 0 0 .727-.635c.161-.47.49-.863.93-1.049a2.5 2.5 0 0 1 3.237 3.237c-.186.44-.579.769-1.049.93z"/></>,
  code2:       <><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></>,
  settings:    <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>,
  bookOpen:    <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
  fileText:    <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></>,
  gift:        <><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></>,
  search:      <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></>,
  chevronDown: <><path d="m6 9 6 6 6-6"/></>,
  plus:        <><path d="M5 12h14"/><path d="M12 5v14"/></>,
  upload:      <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></>,
  uploadCloud: <><polyline points="16 16 12 12 8 16"/><line x1="12" x2="12" y1="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></>,
  x:           <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
  check:       <><path d="M20 6 9 17l-5-5"/></>,
  cpu:         <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></>,
  smartphone:  <><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></>,
  play:        <><polygon points="6 3 20 12 6 21 6 3"/></>,
  barChart2:   <><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></>,
  gamepad2:    <><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="17" x2="17.01" y1="10" y2="10"/><path d="M6 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><path d="M11 5a2 2 0 0 1 2 2v2H9V7a2 2 0 0 1 2-2z"/></>,
  refreshCw:   <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></>,
  file:        <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></>,
  wand2:       <><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></>,
  camera:      <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></>,
  arrowRight:  <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
  arrowLeft:   <><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></>,
  externalLink:<><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>,
  download:    <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></>,
  languages:   <><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></>,
  bot:         <><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></>,
  bell:        <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  users:       <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  palette:     <><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></>,
  terminal:    <><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></>,
  helpCircle:  <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></>,
  logOut:      <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></>,
};

function Icon({ name, size = 14, color = "currentColor", style: s = {} }: {
  name: string; size?: number; color?: string; style?: CSSProperties;
}) {
  const paths = ICONS[name];
  if (!paths) return null;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "inline-block", flexShrink: 0, ...s }}>
      {paths}
    </svg>
  );
}

function MrCodeLogo() {
  return (
    <img
      src="/logo-mrcodeai.png"
      alt="MrCode AI"
      style={{
        width: 117, height: 117, objectFit: "contain",
        mixBlendMode: "screen",
        filter: "brightness(1.2) contrast(1.05) saturate(1.1)",
        borderRadius: 4,
      }}
    />
  );
}

function FigmaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 38 57" fill="none">
      <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE"/>
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 0 1-19 0z" fill="#0ACF83"/>
      <path d="M19 0v19h9.5a9.5 9.5 0 0 0 0-19H19z" fill="#FF7262"/>
      <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E"/>
      <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF"/>
    </svg>
  );
}

/* ══════════════════════════════════════════
   نصوص اللغتين
══════════════════════════════════════════ */
const T: Record<string, any> = {
  ar: {
    dir: "rtl",
    workspace: "منصة البناء الذكي",
    avatarLetter: "م",
    createApp: "إنشاء تطبيق",
    importCode: "استيراد كود أو تصميم",
    nav: ["الرئيسية", "التطبيقات", "التطبيقات المنشورة", "التكاملات", "الوكلاء", "الإعدادات"],
    promoTitle: "منصة البناء الذكي",
    promoBody: "أنشئ تطبيقك بالذكاء الاصطناعي في ثوانٍ — Build Smart. Launch Fast.",
    learn: "تعلّم",
    docs: "التوثيق",
    referEarn: "حسابي",
    installOn: "الفوترة",
    changelog: "سجل التغييرات",
    heading: "ماذا تريد أن تبني اليوم؟",
    tabApp: "تطبيق",
    tabDesign: "تصميم",
    placeholder: "صِف فكرتك، أو اكتب '/' للتكاملات...",
    buildMode: "بناء",
    planMode: "تخطيط",
    buildLabel: "ابدأ البناء فوراً",
    planLabel: "خطّط لعملك قبل البناء",
    toSwitch: "للتبديل بين الأوضاع",
    addAttachments: "إضافة مرفقات",
    uploadFile: "رفع ملف",
    addStartPoint: "إضافة نقطة انطلاق",
    importFigma: "استيراد تصميم Figma",
    importProject: "استيراد مشروع موجود",
    start: "ابدأ",
    auto: "تلقائي",
    webApps: ["تطبيق ويب", "تطبيق جوال", "رسوم متحركة", "تطبيق بيانات", "لعبة ثلاثية الأبعاد", "أتمتة", "ابدأ من الصفر"],
    newLabel: "جديد",
    notifTitle: "منصة البناء الذكي",
    notifBody: "صِف تطبيقك وشاهده يُبنى بالذكاء الاصطناعي — صمّم، طوّر، وانشر بسرعة.",
    tryNow: "ابدأ الآن",
    langToggle: "EN",
    langTitle: "Switch to English",
  },
  en: {
    dir: "ltr",
    workspace: "MrCode AI Platform",
    avatarLetter: "M",
    createApp: "Create App",
    importCode: "Import code or design",
    nav: ["Home", "Apps", "Published Apps", "Integrations", "Agents", "Settings"],
    promoTitle: "MrCode AI Platform",
    promoBody: "Build your app with AI in seconds — Build Smart. Launch Fast.",
    learn: "Learn",
    docs: "Documentation",
    referEarn: "Account",
    installOn: "Billing",
    changelog: "Changelog",
    heading: "What do you want to build today?",
    tabApp: "App",
    tabDesign: "Design",
    placeholder: "Describe your idea, '/' for integrations...",
    buildMode: "Build",
    planMode: "Plan",
    buildLabel: "Start building immediately",
    planLabel: "Plan your work before building",
    toSwitch: "to switch modes",
    addAttachments: "Add attachments",
    uploadFile: "Upload a file",
    addStartPoint: "Add a starting point",
    importFigma: "Import a Figma design",
    importProject: "Import an existing project",
    start: "Start",
    auto: "Auto",
    webApps: ["Web app", "Mobile app", "Animation", "Data app", "3D Game", "Automation", "Start from scratch"],
    newLabel: "New",
    notifTitle: "MrCode AI Platform",
    notifBody: "Describe your app and watch it be built with AI — design, develop, and launch fast.",
    tryNow: "Start Now",
    langToggle: "ع",
    langTitle: "التبديل إلى العربية",
  },
};

/* ══════════════════════════════════════════
   محتوى الأقسام
══════════════════════════════════════════ */
type ProjectSummary = {
  id: string; idea: string; options: { appType?: string; tech?: string };
  filesCount: number; logsCount: number; createdAt: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.floor(hours / 24)} يوم`;
}

function ProjectsContent() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(data => { if (data.success) setProjects(data.projects); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string, e: RMouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل تريد حذف هذا المشروع؟")) return;
    try {
      const res = await fetch(`/api/project/${id}`, { method: "DELETE" });
      if (res.ok) setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}><div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #30363d", borderTopColor: "#58a6ff", animation: "spin 0.8s linear infinite" }} /></div>;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, color: "#e2e8f0" }} data-testid="text-projects-title">التطبيقات</h2>
      {projects.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0" }}>
          <FolderOpen size={40} style={{ color: "#30363d", margin: "0 auto 12px" }} />
          <p style={{ color: "#8b949e" }}>لا توجد مشاريع بعد</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {projects.map((project) => (
            <div key={project.id} data-testid={`card-project-${project.id}`}
              onClick={() => navigate(`/workspace/${project.id}`)}
              style={{ borderRadius: 10, border: "1px solid #21262d", background: "#161b22", padding: 16, cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "#30363d")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "#21262d")}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.idea}</h3>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "#8b949e" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} />{timeAgo(project.createdAt)}</span>
                    <span>{project.filesCount} ملفات</span>
                  </div>
                </div>
                <button data-testid={`btn-delete-${project.id}`} onClick={(e) => handleDelete(project.id, e)}
                  style={{ width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#6e7681", background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#f85149"; (e.currentTarget as HTMLElement).style.background = "rgba(248,81,73,0.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#6e7681"; (e.currentTarget as HTMLElement).style.background = "none"; }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PublishedContent() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, color: "#e2e8f0" }}>التطبيقات المنشورة</h2>
      <div style={{ textAlign: "center", padding: "64px 0" }}>
        <Rocket size={40} style={{ color: "#30363d", margin: "0 auto 12px" }} />
        <p style={{ color: "#8b949e", marginBottom: 8 }}>لا توجد تطبيقات منشورة</p>
        <p style={{ fontSize: 11, color: "#6e7681" }}>أنشئ مشروعاً وانشره ليظهر هنا</p>
      </div>
    </div>
  );
}

function EmptySection({ title }: { title: string }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, color: "#e2e8f0" }}>{title}</h2>
      <div style={{ textAlign: "center", padding: "64px 0" }}>
        <Box size={40} style={{ color: "#30363d", margin: "0 auto 12px" }} />
        <p style={{ color: "#8b949e" }}>قريباً...</p>
      </div>
    </div>
  );
}

function AccountContent() {
  const [name, setName] = useState("مستخدم");
  const [email, setEmail] = useState("user@example.com");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaving(true); setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); }, 600); };
  const inp: CSSProperties = { width: "100%", height: 40, borderRadius: 8, background: "#0d1117", border: "1px solid #21262d", padding: "0 12px", fontSize: 13, color: "#e2e8f0", outline: "none", direction: "rtl" };
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, color: "#e2e8f0" }}>حسابي</h2>
      <div style={{ borderRadius: 10, border: "1px solid #21262d", background: "#161b22", padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#8b949e", marginBottom: 16 }}>المعلومات الشخصية</p>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 11, color: "#6e7681", marginBottom: 4 }}>الاسم</label>
          <input data-testid="input-name" type="text" value={name} onChange={e => setName(e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, color: "#6e7681", marginBottom: 4 }}>البريد الإلكتروني</label>
          <input data-testid="input-email" type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} />
        </div>
        <button data-testid="btn-save-account" onClick={handleSave} disabled={saving}
          style={{ padding: "6px 20px", borderRadius: 8, background: "#2d7dd2", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {saving ? "جاري الحفظ..." : saved ? "تم الحفظ ✓" : "حفظ التغييرات"}
        </button>
      </div>
    </div>
  );
}

function BillingContent() {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, color: "#e2e8f0" }}>الفوترة والاشتراك</h2>
      <div style={{ borderRadius: 10, border: "1px solid #21262d", background: "#161b22", padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>الخطة الحالية</p>
            <p style={{ fontSize: 11, color: "#8b949e", marginTop: 4 }}>الخطة المجانية</p>
          </div>
          <span style={{ padding: "4px 12px", borderRadius: 8, background: "rgba(45,125,210,0.15)", color: "#58a6ff", fontSize: 12, fontWeight: 600 }}>مجاني</span>
        </div>
        <button data-testid="btn-upgrade"
          style={{ padding: "6px 20px", borderRadius: 8, background: "#2d7dd2", color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          ترقية الخطة
        </button>
      </div>
    </div>
  );
}

function SettingsContent() {
  const [language, setLanguage] = useState<"ar" | "en">(() => (localStorage.getItem("app_language") as "ar" | "en") || "ar");
  const [theme, setTheme] = useState<"dark" | "light">(() => (localStorage.getItem("app_theme") as "dark" | "light") || "dark");
  const [notifications, setNotifications] = useState(true);
  const [saved, setSaved] = useState(false);
  useEffect(() => { localStorage.setItem("app_language", language); document.documentElement.dir = language === "ar" ? "rtl" : "ltr"; }, [language]);
  useEffect(() => { localStorage.setItem("app_theme", theme); document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);

  const btnStyle = (active: boolean): CSSProperties => ({
    flex: 1, height: 40, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid",
    background: active ? "rgba(45,125,210,0.2)" : "#0d1117",
    borderColor: active ? "rgba(45,125,210,0.4)" : "#21262d",
    color: active ? "#58a6ff" : "#8b949e",
  });

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, color: "#e2e8f0" }}>الإعدادات</h2>
      <div style={{ borderRadius: 10, border: "1px solid #21262d", background: "#161b22", padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#8b949e", marginBottom: 12 }}>اللغة</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button data-testid="btn-lang-ar" onClick={() => setLanguage("ar")} style={btnStyle(language === "ar")}>العربية</button>
          <button data-testid="btn-lang-en" onClick={() => setLanguage("en")} style={btnStyle(language === "en")}>English</button>
        </div>
      </div>
      <div style={{ borderRadius: 10, border: "1px solid #21262d", background: "#161b22", padding: 20, marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "#8b949e", marginBottom: 12 }}>المظهر</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button data-testid="btn-theme-dark" onClick={() => setTheme("dark")} style={btnStyle(theme === "dark")}>
            <Moon size={14} style={{ display: "inline", marginLeft: 6 }} />داكن
          </button>
          <button data-testid="btn-theme-light" onClick={() => setTheme("light")} style={btnStyle(theme === "light")}>
            <Sun size={14} style={{ display: "inline", marginLeft: 6 }} />فاتح
          </button>
        </div>
      </div>
      <div style={{ borderRadius: 10, border: "1px solid #21262d", background: "#161b22", padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: 12, color: "#e2e8f0" }}>تفعيل الإشعارات</p>
          <div onClick={() => setNotifications(!notifications)} style={{ width: 36, height: 20, borderRadius: 10, background: notifications ? "#2d7dd2" : "#21262d", cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "right 0.2s", right: notifications ? 2 : 18 }} />
          </div>
        </div>
      </div>
      <button data-testid="btn-save-settings" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}
        style={{ width: "100%", height: 40, borderRadius: 8, background: "#2d7dd2", color: "#fff", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        {saved ? "تم الحفظ ✓" : "حفظ الإعدادات"}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════
   الصفحة الرئيسية
══════════════════════════════════════════ */
type NavSection = "home" | "projects" | "published" | "integrations" | "agents" | "settings" | "account" | "billing";

export function StartPage() {
  const navigate = useNavigate();

  /* state */
  const [lang, setLang] = useState("ar");
  const [activeTab, setActiveTab] = useState("app");
  const [showWebAppDD, setShowWebAppDD] = useState(false);
  const [showBuildDD, setShowBuildDD] = useState(false);
  const [showPlusDD, setShowPlusDD] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [notifVisible, setNotifVisible] = useState(true);
  const [selectedAppIdx, setSelectedAppIdx] = useState(0);
  const [selectedBuildIdx, setSelectedBuildIdx] = useState(0);
  const [activeSection, setActiveSection] = useState<NavSection>("home");
  const [loading, setLoading] = useState(false);
  const [showLogoDD, setShowLogoDD] = useState(false);
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);

  useEffect(() => {
    fetch("/api/projects").then(r => r.json()).then(d => { if (d.success) setRecentProjects(d.projects.slice(0, 3)); }).catch(() => {});
  }, []);

  const t = T[lang];
  const isRtl = lang === "ar";
  const closeAll = () => { setShowWebAppDD(false); setShowBuildDD(false); setShowPlusDD(false); setShowLogoDD(false); };
  const toggleLang = (e: RMouseEvent) => { e.stopPropagation(); setLang(l => l === "ar" ? "en" : "ar"); closeAll(); };

  const webAppIcons = ["globe", "smartphone", "play", "barChart2", "gamepad2", "refreshCw", "file"];
  const buildModes = [
    { label: t.buildLabel, mode: t.buildMode, icon: "cpu" },
    { label: t.planLabel, mode: t.planMode, icon: "fileText" },
  ];
  const navIcons = ["home", "layoutGrid", "globe", "puzzle", "bot", "settings"];

  /* Map selectedAppIdx → appType key */
  const appTypeKeys = ["web", "mobile-web", "animation", "data", "3d", "automation", "scratch"];
  const techMap = selectedBuildIdx === 0 ? "auto" : "html";

  const handleStart = async () => {
    if (!textValue.trim() || loading) return;
    try {
      setLoading(true);
      const appType = appTypeKeys[selectedAppIdx] || "web";
      const data = await startProject(textValue, { tab: activeTab, appType, tech: techMap, output: "website" });
      navigate(`/design/${data.projectId}`);
    } catch { alert("فشل إنشاء المشروع"); }
    finally { setLoading(false); }
  };

  const clr = {
    bg: "#0e1117", sidebar: "#161b22", card: "#1c2128", card2: "#1e2228",
    border: "rgba(255,255,255,0.10)", borderSub: "rgba(255,255,255,0.07)",
    txt: "#e2e8f0", txtMid: "#c9d1d9", txtDim: "#8b949e", txtFaint: "#6e7681",
    blue: "#58a6ff", accent: "#2d7dd2",
  };

  const dropdownBase: CSSProperties = {
    position: "absolute", zIndex: 100, borderRadius: 12,
    backgroundColor: clr.card2, border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "0 16px 48px rgba(0,0,0,0.85)", overflow: "hidden",
  };
  const ddPos: CSSProperties = isRtl ? { right: 0 } : { left: 0 };

  const newBadge: CSSProperties = {
    borderRadius: 4, fontWeight: 700, fontSize: 9,
    padding: "1px 5px", backgroundColor: clr.accent, color: "#fff",
  };

  const pillBtn = (extra: CSSProperties = {}): CSSProperties => ({
    display: "flex", alignItems: "center", gap: 6,
    padding: "5px 12px", borderRadius: 9999,
    fontSize: 12.5, color: clr.txtDim, cursor: "pointer",
    backgroundColor: "rgba(255,255,255,0.05)",
    border: `1px solid ${clr.border}`, ...extra,
  });

  /* Main content sections */
  const renderSection = () => {
    switch (activeSection) {
      case "projects": return <ProjectsContent />;
      case "published": return <PublishedContent />;
      case "integrations": return <EmptySection title="التكاملات" />;
      case "agents": navigate("/agents"); return null;
      case "settings": return <SettingsContent />;
      case "account": return <AccountContent />;
      case "billing": return <BillingContent />;
      default: return null;
    }
  };

  return (
    <div
      style={{
        display: "flex", height: "100%", width: "100%", overflow: "hidden",
        backgroundColor: clr.bg, color: clr.txt, userSelect: "none",
        direction: t.dir,
        fontFamily: isRtl ? "'Cairo', -apple-system, BlinkMacSystemFont, sans-serif" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
      onClick={closeAll}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        .nav-item:hover { background: rgba(255,255,255,0.06) !important; }
        .dd-row:hover   { background: rgba(255,255,255,0.07) !important; }
        .lang-btn:hover { background: rgba(88,166,255,0.15) !important; border-color: rgba(88,166,255,0.4) !important; }
        * { box-sizing: border-box; }
        textarea { font-family: inherit; }
        textarea::placeholder { color: #6e7681; }
        button { cursor: pointer; font-family: inherit; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ─── SIDEBAR ─── */}
      <div style={{
        display: "flex", flexDirection: "column", width: 188, minWidth: 188,
        backgroundColor: clr.sidebar,
        ...(isRtl ? { borderLeft: `1px solid ${clr.borderSub}` } : { borderRight: `1px solid ${clr.borderSub}` }),
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: `1px solid ${clr.borderSub}`, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
            <MrCodeLogo />
            <button
              onClick={e => { e.stopPropagation(); setShowLogoDD(v => !v); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: "pointer", padding: 2, borderRadius: 4, color: clr.txtDim, transition: "color 0.15s" }}>
              <Icon name="chevronDown" size={12} color={clr.txtDim} style={{ transform: showLogoDD ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>

            {/* Logo Dropdown */}
            {showLogoDD && (
              <div onClick={e => e.stopPropagation()}
                style={{ position: "absolute", top: "100%", left: isRtl ? "auto" : 0, right: isRtl ? 0 : "auto", width: 175, borderRadius: 8, backgroundColor: "#161b22", border: "1px solid #21262d", boxShadow: "0 8px 24px rgba(0,0,0,0.6)", zIndex: 200, overflow: "hidden" }}>

                {/* Header brand */}
                <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: "linear-gradient(135deg, #2d7dd2, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="code2" size={10} color="#fff" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 11, color: clr.txt }}>MrCode AI</p>
                      <p style={{ fontSize: 9, color: clr.txtFaint }}>Build Smart. Launch Fast.</p>
                    </div>
                  </div>
                </div>

                {/* Home */}
                <div className="dd-row" onClick={() => { setActiveSection("home"); setShowLogoDD(false); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", cursor: "pointer" }}>
                  <span style={{ fontSize: 11, color: clr.txt }}>الرئيسية</span>
                  <Icon name="home" size={11} color={clr.txtDim} />
                </div>

                {/* Recent */}
                {recentProjects.length > 0 && (
                  <div>
                    <div style={{ padding: "3px 10px 2px", fontSize: 9, color: clr.txtFaint, letterSpacing: "0.04em", textTransform: "uppercase" }}>حديثاً</div>
                    {recentProjects.map(p => (
                      <div key={p.id} className="dd-row"
                        onClick={() => { navigate(`/workspace/${p.id}`); setShowLogoDD(false); }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px", cursor: "pointer", gap: 5 }}>
                        <p style={{ fontSize: 10, color: clr.txtMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.idea.slice(0, 20)}{p.idea.length > 20 ? "…" : ""}</p>
                        <Icon name="externalLink" size={9} color={clr.txtDim} style={{ flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "2px 0" }} />

                {/* Settings */}
                <div className="dd-row" onClick={() => { setActiveSection("settings"); setShowLogoDD(false); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", cursor: "pointer" }}>
                  <span style={{ fontSize: 11, color: clr.txtMid }}>الإعدادات</span>
                  <Icon name="settings" size={11} color={clr.txtDim} />
                </div>

                {/* Notifications */}
                <div className="dd-row"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 11, color: clr.txtMid }}>الإشعارات</span>
                    <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 8, backgroundColor: "#c0392b", color: "#fff" }}>21</span>
                  </div>
                  <Icon name="bell" size={11} color={clr.txtDim} />
                </div>

                {/* Create Team */}
                <div className="dd-row"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", cursor: "pointer" }}>
                  <span style={{ fontSize: 11, color: clr.txtMid }}>إنشاء فريق</span>
                  <Icon name="users" size={11} color={clr.txtDim} />
                </div>

                {/* CLUI */}
                <div className="dd-row"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", cursor: "pointer" }}>
                  <span style={{ fontSize: 11, color: clr.txtMid, fontFamily: "monospace" }}>CLUI</span>
                  <Icon name="terminal" size={11} color={clr.txtDim} />
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "2px 0" }} />

                {/* Theme */}
                <div className="dd-row" onClick={() => { setActiveSection("settings"); setShowLogoDD(false); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", cursor: "pointer" }}>
                  <span style={{ fontSize: 11, color: clr.txtMid }}>المظهر</span>
                  <Icon name="palette" size={11} color={clr.txtDim} />
                </div>

                {/* Help */}
                <div className="dd-row"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px", cursor: "pointer" }}>
                  <span style={{ fontSize: 11, color: clr.txtMid }}>المساعدة</span>
                  <Icon name="helpCircle" size={11} color={clr.txtDim} />
                </div>

                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "2px 0" }} />

                {/* Log out */}
                <div className="dd-row"
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 10px 7px", cursor: "pointer" }}>
                  <span style={{ fontSize: 11, color: "#f85149" }}>تسجيل الخروج</span>
                  <Icon name="logOut" size={11} color="#f85149" />
                </div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button className="lang-btn" title={t.langTitle} onClick={toggleLang}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 6, border: `1px solid ${clr.border}`, backgroundColor: "rgba(255,255,255,0.05)", color: clr.blue, fontSize: 11, fontWeight: 700, transition: "all 0.15s", fontFamily: "inherit" }}>
              {t.langToggle}
            </button>
            <button style={{ background: "none", border: "none", display: "flex", color: clr.txtDim }}>
              <Icon name="search" size={14} color={clr.txtDim} />
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", margin: "4px 8px", borderRadius: 6, cursor: "pointer", backgroundColor: "rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", fontWeight: 700, fontSize: 10, backgroundColor: clr.accent, color: "#fff", flexShrink: 0 }}>
            {t.avatarLetter}
          </div>
          <span style={{ fontSize: 12.5, color: clr.txtMid, fontWeight: 600, flex: 1 }}>{t.workspace}</span>
          <Icon name="chevronDown" size={11} color={clr.txtDim} />
        </div>

        {/* Action buttons */}
        <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 4 }}>
          <button onClick={() => setActiveSection("home")}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "6px 12px", borderRadius: 6, fontSize: 12.5, fontWeight: 600, color: clr.txtMid, backgroundColor: "rgba(255,255,255,0.07)", border: `1px solid ${clr.border}`, textAlign: isRtl ? "right" : "left" }}>
            <Icon name="plus" size={13} color={clr.txtDim} /> {t.createApp}
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "6px 12px", borderRadius: 6, fontSize: 12, color: clr.txtDim, background: "none", border: `1px solid rgba(255,255,255,0.07)`, textAlign: isRtl ? "right" : "left" }}>
            <Icon name="upload" size={13} color={clr.txtDim} /> {t.importCode}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "12px 8px", flex: 1 }}>
          {t.nav.map((label: string, i: number) => {
            const navSections: NavSection[] = ["home", "projects", "published", "integrations", "agents", "settings"];
            const isActive = activeSection === navSections[i];
            return (
              <div key={i} className="nav-item"
                onClick={() => { const s = navSections[i]; if (s === "agents") { navigate("/agents"); } else { setActiveSection(s); } }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12.5, backgroundColor: isActive ? "rgba(255,255,255,0.08)" : "transparent", color: isActive ? clr.txt : clr.txtDim }}>
                <Icon name={navIcons[i]} size={14} color={isActive ? clr.txt : clr.txtDim} />
                <span>{label}</span>
              </div>
            );
          })}
        </nav>

        {/* Promo */}
        <div style={{ margin: "0 8px 12px", borderRadius: 8, padding: 10, backgroundColor: "rgba(45,125,210,0.15)", border: "1px solid rgba(45,125,210,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Icon name="gift" size={12} color={clr.blue} />
            <span style={{ fontSize: 10.5, color: clr.txtMid, fontWeight: 700 }}>{t.promoTitle}</span>
          </div>
          <p style={{ fontSize: 10.5, color: clr.txtDim, lineHeight: 1.6 }}>{t.promoBody}</p>
        </div>

        {/* Bottom */}
        <div style={{ borderTop: `1px solid ${clr.borderSub}`, padding: "8px 8px" }}>
          {[t.learn, t.docs].map((label: string, i: number) => (
            <div key={i} className="nav-item"
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, color: clr.txtDim }}>
              <Icon name={i === 0 ? "bookOpen" : "fileText"} size={13} color={clr.txtDim} />
              <span>{label}</span>
            </div>
          ))}
          {[t.referEarn, t.installOn].map((label: string, i: number) => {
            const secs: NavSection[] = ["account", "billing"];
            return (
              <div key={i} className="nav-item"
                onClick={() => setActiveSection(secs[i])}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 12, color: clr.txtDim }}>
                <Icon name={i === 0 ? "languages" : "smartphone"} size={13} color={clr.txtDim} />
                <span>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <GlobalHeader />
        {activeSection !== "home" ? (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {renderSection()}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", position: "relative", overflow: "hidden" }}
          onClick={closeAll}>

          {/* Heading */}
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20, color: clr.txt, textAlign: "center" }}>
            {t.heading}
          </h1>

          {/* Input card */}
          <div style={{ width: "100%", maxWidth: 640, borderRadius: 12, overflow: "visible", position: "relative", backgroundColor: clr.card, border: "1px solid rgba(88,166,255,0.4)", boxShadow: "0 0 0 1px rgba(88,166,255,0.15), 0 4px 24px rgba(0,0,0,0.4)" }}>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${clr.borderSub}` }}>
              {[[t.tabApp, "cpu"], [t.tabDesign, "wand2"]].map(([label, icon], i) => {
                const key = i === 0 ? "app" : "design";
                return (
                  <button key={key}
                    data-testid={`tab-${key}`}
                    onClick={e => { e.stopPropagation(); setActiveTab(key); }}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "none", cursor: "pointer", fontSize: 13.5, border: "none", borderBottom: `2px solid ${activeTab === key ? clr.blue : "transparent"}`, marginBottom: -1, color: activeTab === key ? clr.txt : clr.txtDim, fontWeight: activeTab === key ? 700 : 400 }}>
                    <Icon name={icon} size={13} color={activeTab === key ? clr.txt : clr.txtDim} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Textarea */}
            <textarea
              data-testid="input-idea"
              placeholder={t.placeholder}
              value={textValue}
              onChange={e => setTextValue(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleStart(); } }}
              onClick={e => e.stopPropagation()}
              style={{ width: "100%", height: 110, resize: "none", outline: "none", background: "transparent", padding: "12px 16px", display: "block", fontSize: 14, color: clr.txtMid, caretColor: clr.blue, border: "none", textAlign: isRtl ? "right" : "left" }}
            />

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderTop: `1px solid ${clr.borderSub}` }}>

              {/* Left/Right: Build dropdown + Plus */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

                {/* Build mode dropdown */}
                <div style={{ position: "relative" }}>
                  <button
                    data-testid="dropdown-tech"
                    onClick={e => { e.stopPropagation(); setShowBuildDD(v => !v); setShowWebAppDD(false); setShowPlusDD(false); }}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 6, fontSize: 12.5, color: clr.txtMid, backgroundColor: "rgba(255,255,255,0.06)", border: `1px solid ${clr.border}` }}>
                    <Icon name="cpu" size={13} color={clr.txtMid} />
                    {buildModes[selectedBuildIdx].mode}
                    <Icon name="chevronDown" size={11} color={clr.txtDim} />
                  </button>
                  {showBuildDD && (
                    <div style={{ ...dropdownBase, ...ddPos, bottom: "calc(100% + 8px)", minWidth: 295 }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ padding: "8px 14px", borderBottom: `1px solid ${clr.borderSub}` }}>
                        <span style={{ fontSize: 11, color: clr.txtFaint }}>
                          {t.toSwitch}&nbsp;
                          <kbd style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, padding: "1px 6px", fontSize: 11, color: clr.txtDim, fontFamily: "monospace" }}>I</kbd>
                        </span>
                      </div>
                      {buildModes.map((opt, i) => (
                        <div key={i} className="dd-row"
                          onClick={() => { setSelectedBuildIdx(i); setShowBuildDD(false); }}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", fontSize: 13.5, color: clr.txtMid }}>
                          {selectedBuildIdx === i ? <Icon name="check" size={13} color={clr.blue} /> : <span style={{ width: 13 }} />}
                          <span style={{ flex: 1 }}>{opt.label}</span>
                          <span style={{ color: clr.txtDim, fontWeight: 700, fontSize: 12 }}>{opt.mode}</span>
                          <Icon name={opt.icon} size={14} color={clr.txtFaint} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Plus dropdown */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={e => { e.stopPropagation(); setShowPlusDD(v => !v); setShowBuildDD(false); setShowWebAppDD(false); }}
                    style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 6, color: clr.txtDim, backgroundColor: showPlusDD ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${clr.border}` }}>
                    <Icon name="plus" size={15} color={clr.txtDim} />
                  </button>
                  {showPlusDD && (
                    <div style={{ ...dropdownBase, ...ddPos, bottom: "calc(100% + 8px)", minWidth: 255 }}
                      onClick={e => e.stopPropagation()}>
                      <div style={{ padding: "10px 16px 4px", fontSize: 11, color: clr.txtFaint, fontWeight: 600 }}>{t.addAttachments}</div>
                      <div className="dd-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", cursor: "pointer", fontSize: 14, color: clr.txt, fontWeight: 600 }}>
                        <span>{t.uploadFile}</span>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.07)", border: `1px solid ${clr.border}` }}>
                          <Icon name="uploadCloud" size={14} color={clr.txtDim} />
                        </div>
                      </div>
                      <div style={{ height: 1, backgroundColor: clr.borderSub, margin: "4px 0" }} />
                      <div style={{ padding: "8px 16px 4px", fontSize: 11, color: clr.txtFaint, fontWeight: 600 }}>{t.addStartPoint}</div>
                      <div className="dd-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px", cursor: "pointer", fontSize: 14, color: clr.txt, fontWeight: 600 }}>
                        <span>{t.importFigma}</span>
                        <FigmaIcon />
                      </div>
                      <div className="dd-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 16px 12px", cursor: "pointer", fontSize: 14, color: clr.txt, fontWeight: 600 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Icon name="externalLink" size={14} color={clr.txtDim} />
                          <span>{t.importProject}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.07)", border: `1px solid ${clr.border}` }}>
                          <Icon name="download" size={14} color={clr.txtDim} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right/Left: Camera + Start */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 8px", borderRadius: 6, color: clr.txtDim, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <Icon name="camera" size={13} color={clr.txtDim} />
                  <Icon name="chevronDown" size={11} color={clr.txtDim} />
                </button>
                <button
                  data-testid="btn-start"
                  onClick={e => { e.stopPropagation(); handleStart(); }}
                  disabled={!textValue.trim() || loading}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 6, fontSize: 13, color: loading ? clr.txtFaint : clr.txtDim, fontWeight: 600, background: "none", border: "none", opacity: !textValue.trim() ? 0.5 : 1 }}>
                  {loading
                    ? <div style={{ width: 13, height: 13, borderRadius: "50%", border: `2px solid ${clr.txtFaint}`, borderTopColor: clr.blue, animation: "spin 0.8s linear infinite" }} />
                    : isRtl
                      ? <><Icon name="arrowLeft" size={13} color={clr.txtDim} /> {t.start}</>
                      : <>{t.start} <Icon name="arrowRight" size={13} color={clr.txtDim} /></>
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, width: "100%", maxWidth: 640 }}>

            {/* Web app dropdown */}
            <div style={{ position: "relative" }}>
              <button
                data-testid="dropdown-apptype"
                onClick={e => { e.stopPropagation(); setShowWebAppDD(v => !v); setShowBuildDD(false); setShowPlusDD(false); }}
                style={pillBtn()}>
                <Icon name={webAppIcons[selectedAppIdx]} size={13} color={clr.txtDim} />
                <span>{t.webApps[selectedAppIdx]}</span>
                <Icon name="chevronDown" size={11} color={clr.txtDim} />
              </button>
              {showWebAppDD && (
                <div style={{ ...dropdownBase, ...ddPos, bottom: "calc(100% + 8px)", minWidth: 245, paddingTop: 6, paddingBottom: 6 }}
                  onClick={e => e.stopPropagation()}>
                  {t.webApps.map((label: string, i: number) => (
                    <div key={i} className="dd-row"
                      onClick={() => { setSelectedAppIdx(i); setShowWebAppDD(false); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", cursor: "pointer", fontSize: 14, color: selectedAppIdx === i ? clr.txt : clr.txtDim }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {selectedAppIdx === i ? <Icon name="check" size={14} color={clr.blue} /> : <span style={{ width: 14 }} />}
                        {i === 2 && <span style={newBadge}>{t.newLabel}</span>}
                        <span style={{ fontWeight: 600 }}>{label}</span>
                      </div>
                      <Icon name={webAppIcons[i]} size={15} color={clr.txtFaint} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Auto */}
            <button style={pillBtn()}>
              <Icon name="refreshCw" size={13} color={clr.txtDim} />
              <span>{t.auto}</span>
              <Icon name="chevronDown" size={11} color={clr.txtDim} />
            </button>
          </div>

          {/* Notification */}
          {notifVisible && (
            <div style={{ position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "flex-start", gap: 12, borderRadius: 12, padding: "12px 16px", backgroundColor: clr.card, border: `1px solid ${clr.border}`, boxShadow: "0 4px 20px rgba(0,0,0,0.5)", width: 450, maxWidth: "calc(100% - 40px)", direction: t.dir }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, flexShrink: 0, backgroundColor: "#2d2d2d", border: `1px solid ${clr.border}` }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, background: "linear-gradient(135deg, #f26207, #ff9500)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="play" size={10} color="#fff" />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, color: clr.txt, fontWeight: 700 }}>{t.notifTitle}</span>
                  <span style={newBadge}>{t.newLabel}</span>
                </div>
                <p style={{ fontSize: 12, color: clr.txtDim, lineHeight: 1.6 }}>{t.notifBody}</p>
              </div>
              <button style={{ fontSize: 12, color: clr.blue, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap", background: "none", border: "none" }}>
                {t.tryNow}
              </button>
              <button onClick={e => { e.stopPropagation(); setNotifVisible(false); }}
                style={{ display: "flex", alignItems: "center", background: "none", border: "none", flexShrink: 0, color: clr.txtFaint, cursor: "pointer" }}>
                <Icon name="x" size={14} color={clr.txtFaint} />
              </button>
            </div>
          )}
        </div>
      )}
      </div>{/* closes main content wrapper */}
    </div>
  );
}

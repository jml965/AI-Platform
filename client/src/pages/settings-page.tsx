import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Languages, Moon, Sun, Bell, Palette } from "lucide-react";

type Language = "ar" | "en";
type Theme = "dark" | "light";

const LANG_KEY = "app_language";
const THEME_KEY = "app_theme";

export function SettingsPage() {
  const navigate = useNavigate();

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem(LANG_KEY) as Language) || "ar";
  });

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_KEY) as Theme) || "dark";
  });

  const [notifications, setNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language);
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const labels = language === "ar" ? {
    title: "الإعدادات",
    langSection: "اللغة",
    langDesc: "اختر لغة واجهة التطبيق",
    arabic: "العربية",
    english: "English",
    themeSection: "المظهر",
    themeDesc: "اختر مظهر واجهة التطبيق",
    darkMode: "الوضع الداكن",
    lightMode: "الوضع الفاتح",
    notifSection: "الإشعارات",
    notifDesc: "إدارة إشعارات التطبيق",
    notifLabel: "تفعيل الإشعارات",
    save: "حفظ الإعدادات",
    saving: "جاري الحفظ...",
    savedMsg: "تم الحفظ ✓",
  } : {
    title: "Settings",
    langSection: "Language",
    langDesc: "Choose the application interface language",
    arabic: "العربية",
    english: "English",
    themeSection: "Appearance",
    themeDesc: "Choose the application theme",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    notifSection: "Notifications",
    notifDesc: "Manage app notifications",
    notifLabel: "Enable Notifications",
    save: "Save Settings",
    saving: "Saving...",
    savedMsg: "Saved ✓",
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="h-14 border-b border-zinc-800 bg-[#0d1320] px-6 flex items-center gap-3 shrink-0">
        <button
          data-testid="btn-back-home"
          onClick={() => navigate("/")}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowRight size={18} />
        </button>
        <span className="text-lg font-bold tracking-tight text-blue-400">{labels.title}</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="rounded-2xl border border-zinc-800 bg-[#121826] p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
            <Languages size={16} />
            {labels.langSection}
          </div>
          <p className="text-xs text-zinc-500">{labels.langDesc}</p>

          <div className="flex gap-3">
            <button
              data-testid="btn-lang-ar"
              onClick={() => setLanguage("ar")}
              className={`flex-1 h-12 rounded-xl text-sm font-medium transition-all border ${
                language === "ar"
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                  : "bg-[#0d1320] border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {labels.arabic}
            </button>
            <button
              data-testid="btn-lang-en"
              onClick={() => setLanguage("en")}
              className={`flex-1 h-12 rounded-xl text-sm font-medium transition-all border ${
                language === "en"
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                  : "bg-[#0d1320] border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              {labels.english}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#121826] p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
            <Palette size={16} />
            {labels.themeSection}
          </div>
          <p className="text-xs text-zinc-500">{labels.themeDesc}</p>

          <div className="flex gap-3">
            <button
              data-testid="btn-theme-dark"
              onClick={() => setTheme("dark")}
              className={`flex-1 h-12 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2 ${
                theme === "dark"
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                  : "bg-[#0d1320] border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <Moon size={16} />
              {labels.darkMode}
            </button>
            <button
              data-testid="btn-theme-light"
              onClick={() => setTheme("light")}
              className={`flex-1 h-12 rounded-xl text-sm font-medium transition-all border flex items-center justify-center gap-2 ${
                theme === "light"
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-300"
                  : "bg-[#0d1320] border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <Sun size={16} />
              {labels.lightMode}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#121826] p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
            <Bell size={16} />
            {labels.notifSection}
          </div>
          <p className="text-xs text-zinc-500">{labels.notifDesc}</p>

          <label className="flex items-center justify-between cursor-pointer" data-testid="toggle-notifications">
            <span className="text-sm text-zinc-300">{labels.notifLabel}</span>
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${
                notifications ? "bg-blue-600" : "bg-zinc-700"
              }`}
              onClick={() => setNotifications(!notifications)}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  notifications
                    ? (language === "ar" ? "right-0.5" : "left-[22px]")
                    : (language === "ar" ? "right-[22px]" : "left-0.5")
                }`}
              />
            </div>
          </label>
        </div>

        <button
          data-testid="btn-save-settings"
          onClick={handleSave}
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-500 font-medium text-sm transition-colors"
        >
          {saved ? labels.savedMsg : labels.save}
        </button>
      </div>
    </div>
  );
}

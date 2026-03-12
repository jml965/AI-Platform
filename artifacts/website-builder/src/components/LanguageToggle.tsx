import React from "react";
import { useI18n } from "@/lib/i18n";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, toggleLang } = useI18n();

  return (
    <button
      onClick={toggleLang}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors",
        className
      )}
    >
      <Languages className="w-4 h-4" />
      <span className="text-sm font-medium">{lang === "en" ? "عربي" : "English"}</span>
    </button>
  );
}

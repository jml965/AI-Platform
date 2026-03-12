import React from "react";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Sparkles, Terminal } from "lucide-react";

export default function Login() {
  const { t, lang } = useI18n();

  const handleLogin = () => {
    window.location.href = "/api/auth/login";
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Abstract Background" 
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="absolute top-6 end-6 z-20">
        <LanguageToggle />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-8 glass-panel rounded-3xl text-center"
      >
        <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
          <Terminal className="w-8 h-8 text-primary" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-3">
          {t.login_title}
        </h1>
        <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
          {t.login_subtitle}
        </p>

        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground py-3.5 px-6 rounded-xl font-semibold shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
        >
          <Sparkles className="w-5 h-5" />
          <span>{t.sign_in}</span>
        </button>
      </motion.div>
    </div>
  );
}

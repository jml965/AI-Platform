import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Bell, ArrowLeft, Loader2, Mail, CheckCircle, XCircle, Wrench, Users, CreditCard } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetNotificationPreferences,
  useUpdateNotificationPreferences,
  getGetNotificationPreferencesQueryKey,
} from "@workspace/api-client-react";

interface ToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function Toggle({ enabled, onToggle, disabled }: ToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
        enabled ? "bg-primary" : "bg-secondary"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "ltr:translate-x-6 rtl:-translate-x-6" : "ltr:translate-x-1 rtl:-translate-x-1"
        }`}
      />
    </button>
  );
}

export default function NotificationSettings() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: preferences, isLoading } = useGetNotificationPreferences();
  const updateMut = useUpdateNotificationPreferences({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetNotificationPreferencesQueryKey() });
      },
    },
  });

  const handleToggle = (key: "buildComplete" | "buildError" | "teamInvite" | "subscriptionRenewal") => {
    if (!preferences) return;
    updateMut.mutate({
      data: { [key]: !preferences[key] },
    });
  };

  const notificationTypes = [
    {
      key: "buildComplete" as const,
      icon: <CheckCircle className="w-5 h-5 text-emerald-400" />,
      title: t.notif_build_complete,
      description: t.notif_build_complete_desc,
    },
    {
      key: "buildError" as const,
      icon: <XCircle className="w-5 h-5 text-red-400" />,
      title: t.notif_build_error,
      description: t.notif_build_error_desc,
    },
    {
      key: "teamInvite" as const,
      icon: <Users className="w-5 h-5 text-purple-400" />,
      title: t.notif_team_invite,
      description: t.notif_team_invite_desc,
    },
    {
      key: "subscriptionRenewal" as const,
      icon: <CreditCard className="w-5 h-5 text-yellow-400" />,
      title: t.notif_subscription_renewal,
      description: t.notif_subscription_renewal_desc,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="h-16 border-b border-white/10 bg-card/50 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <h1 className="font-bold text-lg">{t.notif_settings}</h1>
        </div>
        <LanguageToggle />
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">{t.notif_email_title}</h2>
          </div>
          <p className="text-muted-foreground text-sm">{t.notif_email_desc}</p>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {notificationTypes.map((item) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">{item.icon}</div>
                    <div>
                      <h3 className="font-medium text-sm">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                  </div>
                  <Toggle
                    enabled={preferences?.[item.key] ?? true}
                    onToggle={() => handleToggle(item.key)}
                    disabled={updateMut.isPending}
                  />
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-secondary/30 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">{t.notif_email_setup}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{t.notif_email_setup_desc}</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

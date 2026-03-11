import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, User, Mail, Shield, Key } from "lucide-react";

export function AccountPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("مستخدم");
  const [email, setEmail] = useState("user@example.com");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-white" dir={document.documentElement.dir || "rtl"}>
      <header className="h-14 border-b border-zinc-800 bg-[#0d1320] px-6 flex items-center gap-3 shrink-0">
        <button
          data-testid="btn-back-home"
          onClick={() => navigate("/")}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <ArrowRight size={18} />
        </button>
        <span className="text-lg font-bold tracking-tight text-blue-400">حسابي</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold">
            {name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-account-name">{name}</h1>
            <p className="text-sm text-zinc-500">{email}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#121826] p-6 space-y-5">
          <h2 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <User size={16} />
            المعلومات الشخصية
          </h2>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5">الاسم</label>
            <input
              data-testid="input-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 rounded-xl bg-[#0d1320] border border-zinc-800 px-4 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
              <Mail size={12} />
              البريد الإلكتروني
            </label>
            <input
              data-testid="input-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 rounded-xl bg-[#0d1320] border border-zinc-800 px-4 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              data-testid="btn-save-account"
              onClick={handleSave}
              disabled={saving}
              className="px-6 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 text-sm font-medium transition-colors"
            >
              {saving ? "جاري الحفظ..." : saved ? "تم الحفظ ✓" : "حفظ التغييرات"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-[#121826] p-6 space-y-5">
          <h2 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
            <Shield size={16} />
            الأمان
          </h2>

          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 flex items-center gap-1">
              <Key size={12} />
              كلمة المرور
            </label>
            <input
              data-testid="input-password"
              type="password"
              value="••••••••"
              readOnly
              className="w-full h-11 rounded-xl bg-[#0d1320] border border-zinc-800 px-4 text-sm text-zinc-500 outline-none"
            />
          </div>

          <button
            data-testid="btn-change-password"
            className="px-5 h-9 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            تغيير كلمة المرور
          </button>
        </div>
      </div>
    </div>
  );
}

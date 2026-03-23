export interface ComponentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  code: string;
}

export const COMPONENT_LIBRARY: ComponentTemplate[] = [
  {
    id: "btn-primary",
    name: "PrimaryButton",
    category: "buttons",
    description: "Gradient primary button with hover lift and shadow",
    code: `function PrimaryButton({ children, onClick, size = "md", fullWidth = false }: { children: React.ReactNode; onClick?: () => void; size?: "sm" | "md" | "lg"; fullWidth?: boolean }) {
  const sizes = { sm: "px-4 py-2 text-sm", md: "px-6 py-3 text-base", lg: "px-10 py-4 text-lg" };
  return (
    <button onClick={onClick} className={\`\${sizes[size]} \${fullWidth ? "w-full" : ""} font-semibold text-white rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 active:scale-95\`}>
      {children}
    </button>
  );
}`,
  },
  {
    id: "btn-outline",
    name: "OutlineButton",
    category: "buttons",
    description: "Outlined button with border hover fill effect",
    code: `function OutlineButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="px-6 py-3 font-medium rounded-xl border-2 transition-all duration-300 hover:shadow-md" style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)" }}>
      {children}
    </button>
  );
}`,
  },
  {
    id: "btn-ghost",
    name: "GhostButton",
    category: "buttons",
    description: "Transparent button with subtle hover background",
    code: `function GhostButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="px-6 py-3 font-medium rounded-xl transition-all duration-300 hover:bg-black/5" style={{ color: "var(--color-primary)" }}>
      {children} →
    </button>
  );
}`,
  },
  {
    id: "btn-icon",
    name: "IconButton",
    category: "buttons",
    description: "Circular icon button with tooltip hover",
    code: `function IconButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} title={label} className="w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 hover:shadow-md hover:scale-110" style={{ borderColor: "var(--color-border)", color: "var(--color-primary)" }}>
      {icon}
    </button>
  );
}`,
  },
  {
    id: "card-feature",
    name: "FeatureCard",
    category: "cards",
    description: "Feature card with icon, title, description, hover lift",
    code: `function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="group p-8 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" style={{ background: "var(--color-primary)", color: "white" }}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3" style={{ color: "var(--color-text)" }}>{title}</h3>
      <p className="leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{description}</p>
    </div>
  );
}`,
  },
  {
    id: "card-product",
    name: "ProductCard",
    category: "cards",
    description: "E-commerce product card with image, price, rating, add to cart",
    code: `function ProductCard({ image, name, price, originalPrice, rating, badge }: { image: string; name: string; price: number; originalPrice?: number; rating: number; badge?: string }) {
  return (
    <div className="group rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
      <div className="relative overflow-hidden aspect-square">
        <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {badge && <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: "var(--color-accent)" }}>{badge}</span>}
        <button className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:scale-110">
          ♡
        </button>
      </div>
      <div className="p-5 space-y-2">
        <h3 className="font-semibold truncate" style={{ color: "var(--color-text)" }}>{name}</h3>
        <div className="flex items-center gap-1">
          {"★".repeat(Math.floor(rating)).split("").map((s, i) => <span key={i} className="text-yellow-400 text-sm">{s}</span>)}
          <span className="text-xs ml-1" style={{ color: "var(--color-text-muted)" }}>({rating})</span>
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "var(--color-text)" }}>\${price}</span>
            {originalPrice && <span className="text-sm line-through" style={{ color: "var(--color-text-muted)" }}>\${originalPrice}</span>}
          </div>
          <button className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:shadow-lg" style={{ background: "var(--color-primary)" }}>Add to Cart</button>
        </div>
      </div>
    </div>
  );
}`,
  },
  {
    id: "card-testimonial",
    name: "TestimonialCard",
    category: "cards",
    description: "Testimonial card with avatar, quote, star rating",
    code: `function TestimonialCard({ name, role, avatar, quote, rating }: { name: string; role: string; avatar: string; quote: string; rating: number }) {
  return (
    <div className="p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
      <div className="flex gap-1 mb-4">{Array.from({length: rating}).map((_,i) => <span key={i} className="text-yellow-400">★</span>)}</div>
      <p className="mb-6 leading-relaxed italic" style={{ color: "var(--color-text)" }}>"{quote}"</p>
      <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
        <img src={avatar} alt={name} className="w-11 h-11 rounded-full object-cover" />
        <div>
          <div className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{name}</div>
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{role}</div>
        </div>
      </div>
    </div>
  );
}`,
  },
  {
    id: "card-pricing",
    name: "PricingCard",
    category: "cards",
    description: "Pricing tier card with features list and popular badge",
    code: `function PricingCard({ name, price, period, features, popular, cta }: { name: string; price: string; period: string; features: string[]; popular?: boolean; cta?: string }) {
  return (
    <div className={\`relative rounded-2xl border p-8 transition-all duration-300 hover:shadow-xl \${popular ? "scale-105 shadow-xl border-2" : ""}\`} style={{ background: "var(--color-surface)", borderColor: popular ? "var(--color-primary)" : "var(--color-border)" }}>
      {popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>Most Popular</div>}
      <h3 className="text-xl font-bold mb-1" style={{ color: "var(--color-text)" }}>{name}</h3>
      <div className="mb-6"><span className="text-4xl font-bold" style={{ color: "var(--color-text)" }}>{price}</span><span style={{ color: "var(--color-text-muted)" }}>{period}</span></div>
      <button className={\`w-full py-3 rounded-xl font-semibold transition-all duration-300 \${popular ? "text-white shadow-lg hover:shadow-xl" : "border-2"}\`} style={popular ? { background: "var(--color-primary)" } : { borderColor: "var(--color-primary)", color: "var(--color-primary)" }}>{cta || "Get Started"}</button>
      <ul className="mt-6 space-y-3">{features.map((f, i) => <li key={i} className="flex items-center gap-2 text-sm"><span style={{ color: "var(--color-primary)" }}>✓</span><span style={{ color: "var(--color-text)" }}>{f}</span></li>)}</ul>
    </div>
  );
}`,
  },
  {
    id: "card-team",
    name: "TeamMemberCard",
    category: "cards",
    description: "Team member card with photo, name, role, social links",
    code: `function TeamMemberCard({ name, role, image, socials }: { name: string; role: string; image: string; socials?: { icon: string; url: string }[] }) {
  return (
    <div className="group text-center space-y-4">
      <div className="relative overflow-hidden rounded-2xl mx-auto" style={{ maxWidth: "280px" }}>
        <img src={image} alt={name} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 gap-3">
          {(socials || []).map((s, i) => <a key={i} href={s.url} className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-sm hover:bg-white/40 transition-colors">{s.icon}</a>)}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-lg" style={{ color: "var(--color-text)" }}>{name}</h3>
        <p className="text-sm" style={{ color: "var(--color-primary)" }}>{role}</p>
      </div>
    </div>
  );
}`,
  },
  {
    id: "card-blog",
    name: "BlogPostCard",
    category: "cards",
    description: "Blog post card with image, category, title, excerpt, date",
    code: `function BlogPostCard({ image, category, title, excerpt, date, author }: { image: string; category: string; title: string; excerpt: string; date: string; author: string }) {
  return (
    <article className="group rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-xl" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
      <div className="overflow-hidden aspect-video">
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
      <div className="p-6 space-y-3">
        <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "var(--color-primary)", color: "white" }}>{category}</span>
        <h3 className="text-xl font-bold group-hover:underline" style={{ color: "var(--color-text)" }}>{title}</h3>
        <p className="text-sm leading-relaxed line-clamp-2" style={{ color: "var(--color-text-muted)" }}>{excerpt}</p>
        <div className="flex items-center justify-between pt-3 border-t text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
          <span>{author}</span><span>{date}</span>
        </div>
      </div>
    </article>
  );
}`,
  },
  {
    id: "modal-dialog",
    name: "Modal",
    category: "modals",
    description: "Centered modal dialog with backdrop blur, close button, and smooth animation",
    code: `function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-scale-in" style={{ background: "var(--color-surface)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors" style={{ color: "var(--color-text-muted)" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}`,
  },
  {
    id: "modal-confirm",
    name: "ConfirmDialog",
    category: "modals",
    description: "Confirmation dialog with danger/safe actions",
    code: `function ConfirmDialog({ isOpen, onConfirm, onCancel, title, message, confirmText, danger }: { isOpen: boolean; onConfirm: () => void; onCancel: () => void; title: string; message: string; confirmText?: string; danger?: boolean }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-scale-in text-center space-y-4" style={{ background: "var(--color-surface)" }}>
        <div className={\`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-2xl \${danger ? "bg-red-100" : "bg-blue-100"}\`}>{danger ? "⚠️" : "❓"}</div>
        <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{title}</h3>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{message}</p>
        <div className="flex gap-3 pt-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border font-medium transition-colors hover:bg-black/5" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}>Cancel</button>
          <button onClick={onConfirm} className={\`flex-1 py-2.5 rounded-xl font-semibold text-white transition-all hover:shadow-lg \${danger ? "bg-red-500" : ""}\`} style={!danger ? { background: "var(--color-primary)" } : {}}>
            {confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}`,
  },
  {
    id: "input-text",
    name: "TextInput",
    category: "forms",
    description: "Text input with floating label and focus ring",
    code: `function TextInput({ label, placeholder, value, onChange, type = "text", error }: { label: string; placeholder?: string; value: string; onChange: (v: string) => void; type?: string; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium" style={{ color: "var(--color-text)" }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={\`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all \${error ? "border-red-400 ring-red-200" : ""}\`} style={{ borderColor: error ? undefined : "var(--color-border)", background: "var(--color-background)", color: "var(--color-text)", ringColor: "var(--color-primary)" }} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}`,
  },
  {
    id: "input-textarea",
    name: "TextArea",
    category: "forms",
    description: "Multi-line textarea with character count",
    code: `function TextArea({ label, value, onChange, maxLength, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <label className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{label}</label>
        {maxLength && <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{value.length}/{maxLength}</span>}
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} maxLength={maxLength} rows={rows} className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all resize-none" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-text)", ringColor: "var(--color-primary)" }} />
    </div>
  );
}`,
  },
  {
    id: "input-select",
    name: "SelectInput",
    category: "forms",
    description: "Styled select dropdown",
    code: `function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium" style={{ color: "var(--color-text)" }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all appearance-none bg-no-repeat bg-right pr-10" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-text)", ringColor: "var(--color-primary)", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 12px center" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}`,
  },
  {
    id: "toggle-switch",
    name: "ToggleSwitch",
    category: "forms",
    description: "iOS-style toggle switch with smooth animation",
    code: `function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button onClick={() => onChange(!checked)} className={\`relative w-12 h-6 rounded-full transition-colors duration-300\`} style={{ background: checked ? "var(--color-primary)" : "var(--color-border)" }}>
        <div className={\`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 \${checked ? "translate-x-6" : "translate-x-0.5"}\`} />
      </button>
      {label && <span className="text-sm" style={{ color: "var(--color-text)" }}>{label}</span>}
    </label>
  );
}`,
  },
  {
    id: "badge",
    name: "Badge",
    category: "feedback",
    description: "Small status badge with color variants",
    code: `function Badge({ text, variant = "default" }: { text: string; variant?: "default" | "success" | "warning" | "error" | "info" }) {
  const styles = {
    default: { bg: "bg-gray-100", text: "text-gray-700" },
    success: { bg: "bg-emerald-50", text: "text-emerald-700" },
    warning: { bg: "bg-amber-50", text: "text-amber-700" },
    error: { bg: "bg-red-50", text: "text-red-700" },
    info: { bg: "bg-blue-50", text: "text-blue-700" },
  };
  const s = styles[variant];
  return <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${s.bg} \${s.text}\`}>{text}</span>;
}`,
  },
  {
    id: "alert-box",
    name: "Alert",
    category: "feedback",
    description: "Alert box with icon, title, description, dismissible",
    code: `function Alert({ type = "info", title, message, onDismiss }: { type?: "info" | "success" | "warning" | "error"; title?: string; message: string; onDismiss?: () => void }) {
  const config = {
    info: { bg: "bg-blue-50", border: "border-blue-200", icon: "ℹ️", text: "text-blue-800" },
    success: { bg: "bg-emerald-50", border: "border-emerald-200", icon: "✅", text: "text-emerald-800" },
    warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "⚠️", text: "text-amber-800" },
    error: { bg: "bg-red-50", border: "border-red-200", icon: "❌", text: "text-red-800" },
  };
  const c = config[type];
  return (
    <div className={\`flex items-start gap-3 p-4 rounded-xl border \${c.bg} \${c.border}\`}>
      <span className="text-lg flex-shrink-0">{c.icon}</span>
      <div className="flex-1">
        {title && <h4 className={\`font-semibold text-sm mb-1 \${c.text}\`}>{title}</h4>}
        <p className={\`text-sm \${c.text} opacity-80\`}>{message}</p>
      </div>
      {onDismiss && <button onClick={onDismiss} className={\`\${c.text} opacity-50 hover:opacity-100\`}>✕</button>}
    </div>
  );
}`,
  },
  {
    id: "toast",
    name: "Toast",
    category: "feedback",
    description: "Floating toast notification with auto-dismiss",
    code: `function Toast({ message, type = "success", visible, onClose }: { message: string; type?: "success" | "error" | "info"; visible: boolean; onClose: () => void }) {
  React.useEffect(() => { if (visible) { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); } }, [visible]);
  if (!visible) return null;
  const colors = { success: "bg-emerald-500", error: "bg-red-500", info: "bg-blue-500" };
  const icons = { success: "✓", error: "✕", info: "ℹ" };
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-in-left">
      <div className={\`flex items-center gap-3 px-5 py-3 rounded-xl text-white shadow-2xl \${colors[type]}\`}>
        <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">{icons[type]}</span>
        <span className="font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">✕</button>
      </div>
    </div>
  );
}`,
  },
  {
    id: "progress-bar",
    name: "ProgressBar",
    category: "feedback",
    description: "Animated progress bar with percentage label",
    code: `function ProgressBar({ value, max = 100, label, showPercent = true }: { value: number; max?: number; label?: string; showPercent?: boolean }) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  return (
    <div className="space-y-2">
      {(label || showPercent) && (
        <div className="flex justify-between text-sm">
          {label && <span style={{ color: "var(--color-text)" }}>{label}</span>}
          {showPercent && <span className="font-medium" style={{ color: "var(--color-primary)" }}>{pct}%</span>}
        </div>
      )}
      <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: pct + "%", background: "var(--color-primary)" }} />
      </div>
    </div>
  );
}`,
  },
  {
    id: "avatar-group",
    name: "AvatarGroup",
    category: "display",
    description: "Overlapping avatar stack with +N counter",
    code: `function AvatarGroup({ avatars, max = 4 }: { avatars: { src: string; alt: string }[]; max?: number }) {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;
  return (
    <div className="flex items-center">
      {visible.map((a, i) => (
        <img key={i} src={a.src} alt={a.alt} className="w-10 h-10 rounded-full border-2 border-white object-cover -ml-2 first:ml-0 hover:z-10 hover:scale-110 transition-transform" />
      ))}
      {remaining > 0 && (
        <div className="w-10 h-10 rounded-full border-2 border-white -ml-2 flex items-center justify-center text-xs font-bold" style={{ background: "var(--color-primary)", color: "white" }}>+{remaining}</div>
      )}
    </div>
  );
}`,
  },
  {
    id: "tabs",
    name: "Tabs",
    category: "navigation",
    description: "Horizontal tab navigation with animated indicator",
    code: `function Tabs({ tabs, activeTab, onChange }: { tabs: { id: string; label: string }[]; activeTab: string; onChange: (id: string) => void }) {
  return (
    <div className="flex border-b" style={{ borderColor: "var(--color-border)" }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} className={\`px-6 py-3 text-sm font-medium transition-all relative \${activeTab === tab.id ? "font-semibold" : "hover:opacity-70"}\`} style={{ color: activeTab === tab.id ? "var(--color-primary)" : "var(--color-text-muted)" }}>
          {tab.label}
          {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "var(--color-primary)" }} />}
        </button>
      ))}
    </div>
  );
}`,
  },
  {
    id: "breadcrumbs",
    name: "Breadcrumbs",
    category: "navigation",
    description: "Navigation breadcrumb trail",
    code: `function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: "var(--color-text-muted)" }}>/</span>}
          {item.href && i < items.length - 1 ? (
            <a href={item.href} className="hover:underline transition-colors" style={{ color: "var(--color-primary)" }}>{item.label}</a>
          ) : (
            <span className={i === items.length - 1 ? "font-medium" : ""} style={{ color: i === items.length - 1 ? "var(--color-text)" : "var(--color-text-muted)" }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}`,
  },
  {
    id: "pagination",
    name: "Pagination",
    category: "navigation",
    description: "Page navigation with prev/next and page numbers",
    code: `function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (p: number) => void }) {
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-30" style={{ color: "var(--color-text)" }}>← Prev</button>
      {pages.map(p => (
        <button key={p} onClick={() => onPageChange(p)} className={\`w-9 h-9 rounded-lg text-sm font-medium transition-all \${currentPage === p ? "text-white shadow-md" : "hover:bg-black/5"}\`} style={currentPage === p ? { background: "var(--color-primary)" } : { color: "var(--color-text)" }}>{p}</button>
      ))}
      <button onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-30" style={{ color: "var(--color-text)" }}>Next →</button>
    </div>
  );
}`,
  },
  {
    id: "timeline",
    name: "Timeline",
    category: "display",
    description: "Vertical timeline with icons, dates, and descriptions",
    code: `function Timeline({ items }: { items: { title: string; description: string; date: string; icon: string }[] }) {
  return (
    <div className="relative space-y-8">
      <div className="absolute left-5 top-0 bottom-0 w-0.5" style={{ background: "var(--color-border)" }} />
      {items.map((item, i) => (
        <div key={i} className="relative flex gap-6 pl-2">
          <div className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg flex-shrink-0 shadow-lg" style={{ background: "var(--color-primary)" }}>{item.icon}</div>
          <div className="flex-1 pb-8">
            <div className="text-xs font-medium mb-1" style={{ color: "var(--color-primary)" }}>{item.date}</div>
            <h4 className="font-bold mb-1" style={{ color: "var(--color-text)" }}>{item.title}</h4>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}`,
  },
  {
    id: "accordion",
    name: "Accordion",
    category: "display",
    description: "Expandable accordion with smooth height animation",
    code: `function Accordion({ items }: { items: { title: string; content: string }[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--color-border)", background: openIndex === i ? "var(--color-surface)" : "transparent" }}>
          <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
            <span className="font-medium" style={{ color: "var(--color-text)" }}>{item.title}</span>
            <svg className={\`w-5 h-5 transition-transform duration-300 \${openIndex === i ? "rotate-180" : ""}\`} style={{ color: "var(--color-primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          <div className={\`overflow-hidden transition-all duration-300 \${openIndex === i ? "max-h-96 pb-4 px-4" : "max-h-0"}\`}>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{item.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}`,
  },
  {
    id: "stat-card",
    name: "StatCard",
    category: "display",
    description: "Statistics card with number, label, and trend indicator",
    code: `function StatCard({ number, label, trend, trendUp }: { number: string; label: string; trend?: string; trendUp?: boolean }) {
  return (
    <div className="p-6 rounded-2xl border transition-all hover:shadow-md" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
      <div className="text-3xl font-bold mb-1" style={{ color: "var(--color-text)" }}>{number}</div>
      <div className="text-sm mb-2" style={{ color: "var(--color-text-muted)" }}>{label}</div>
      {trend && <div className={\`text-xs font-medium \${trendUp ? "text-emerald-500" : "text-red-500"}\`}>{trendUp ? "↑" : "↓"} {trend}</div>}
    </div>
  );
}`,
  },
  {
    id: "image-gallery",
    name: "ImageGallery",
    category: "media",
    description: "Responsive masonry-style image gallery with lightbox click",
    code: `function ImageGallery({ images }: { images: { src: string; alt: string }[] }) {
  const [selected, setSelected] = React.useState<number | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img, i) => (
          <div key={i} onClick={() => setSelected(i)} className="relative overflow-hidden rounded-xl cursor-pointer group aspect-square">
            <img src={img.src} alt={img.alt} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-2xl">🔍</span>
            </div>
          </div>
        ))}
      </div>
      {selected !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <img src={images[selected].src} alt={images[selected].alt} className="max-w-full max-h-[90vh] object-contain rounded-xl" />
          <button className="absolute top-6 right-6 text-white text-2xl hover:opacity-70">✕</button>
        </div>
      )}
    </>
  );
}`,
  },
  {
    id: "carousel",
    name: "Carousel",
    category: "media",
    description: "Image carousel/slider with prev/next arrows and dots",
    code: `function Carousel({ images }: { images: { src: string; alt: string }[] }) {
  const [current, setCurrent] = React.useState(0);
  const prev = () => setCurrent(current === 0 ? images.length - 1 : current - 1);
  const next = () => setCurrent(current === images.length - 1 ? 0 : current + 1);
  return (
    <div className="relative rounded-2xl overflow-hidden group">
      <div className="flex transition-transform duration-500 ease-out" style={{ transform: \`translateX(-\${current * 100}%)\` }}>
        {images.map((img, i) => <img key={i} src={img.src} alt={img.alt} className="w-full flex-shrink-0 aspect-video object-cover" />)}
      </div>
      <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white">←</button>
      <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white">→</button>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, i) => <button key={i} onClick={() => setCurrent(i)} className={\`w-2 h-2 rounded-full transition-all \${current === i ? "w-6 bg-white" : "bg-white/50"}\`} />)}
      </div>
    </div>
  );
}`,
  },
  {
    id: "back-to-top",
    name: "BackToTop",
    category: "navigation",
    description: "Floating scroll-to-top button that appears on scroll",
    code: `function BackToTop() {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-white transition-all hover:shadow-2xl hover:-translate-y-1 animate-fade-in" style={{ background: "var(--color-primary)" }}>
      ↑
    </button>
  );
}`,
  },
  {
    id: "skeleton-loader",
    name: "Skeleton",
    category: "feedback",
    description: "Loading skeleton placeholder with shimmer animation",
    code: `function Skeleton({ width, height, rounded = "rounded-lg" }: { width?: string; height?: string; rounded?: string }) {
  return (
    <div className={\`animate-pulse bg-gray-200 \${rounded}\`} style={{ width: width || "100%", height: height || "20px" }}>
      <div className="h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent" style={{ animation: "shimmer 1.5s infinite", backgroundSize: "200% 100%" }} />
    </div>
  );
}`,
  },
  {
    id: "empty-state",
    name: "EmptyState",
    category: "feedback",
    description: "Empty state illustration with message and action button",
    code: `function EmptyState({ icon, title, message, actionLabel, onAction }: { icon: string; title: string; message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="text-6xl mb-4 animate-float">{icon}</div>
      <h3 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>{title}</h3>
      <p className="max-w-md mb-6" style={{ color: "var(--color-text-muted)" }}>{message}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all" style={{ background: "var(--color-primary)" }}>{actionLabel}</button>
      )}
    </div>
  );
}`,
  },
  {
    id: "divider-section",
    name: "SectionDivider",
    category: "layout",
    description: "Decorative section divider with wave or line",
    code: `function SectionDivider({ type = "wave" }: { type?: "wave" | "line" | "dots" }) {
  if (type === "line") return <div className="max-w-xs mx-auto my-16"><div className="h-px" style={{ background: "var(--color-border)" }} /><div className="w-12 h-1 mx-auto -mt-0.5 rounded-full" style={{ background: "var(--color-primary)" }} /></div>;
  if (type === "dots") return <div className="flex justify-center gap-2 my-16">{[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full" style={{ background: "var(--color-primary)", opacity: 1 - i * 0.25 }} />)}</div>;
  return (
    <div className="overflow-hidden my-0"><svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full"><path d="M0 80L48 74.7C96 69 192 59 288 48C384 37 480 27 576 32C672 37 768 59 864 64C960 69 1056 59 1152 48C1248 37 1344 27 1392 21.3L1440 16V80H0Z" style={{ fill: "var(--color-surface)" }}/></svg></div>
  );
}`,
  },
];

export function getComponentsByCategory(category: string): ComponentTemplate[] {
  return COMPONENT_LIBRARY.filter(c => c.category === category);
}

export function getComponentPrompt(): string {
  const categories = [...new Set(COMPONENT_LIBRARY.map(c => c.category))];
  let prompt = `\n=== COMPONENT LIBRARY (${COMPONENT_LIBRARY.length} components) ===\n`;
  prompt += `Available categories: ${categories.join(", ")}\n`;
  prompt += `Use these components as building blocks. Match their quality and patterns.\n\n`;

  const priorityComponents = COMPONENT_LIBRARY.filter(c =>
    ["btn-primary", "card-feature", "card-product", "modal-dialog", "input-text", "badge", "tabs", "carousel", "accordion", "toast"].includes(c.id)
  );

  for (const comp of priorityComponents) {
    prompt += `--- ${comp.name} (${comp.category}) ---\n`;
    prompt += `\`\`\`tsx\n${comp.code}\n\`\`\`\n\n`;
  }

  prompt += `=== END COMPONENT LIBRARY ===\n`;
  return prompt;
}

export function getAllComponentCategories(): string[] {
  return [...new Set(COMPONENT_LIBRARY.map(c => c.category))];
}

export function getComponentCount(): number {
  return COMPONENT_LIBRARY.length;
}

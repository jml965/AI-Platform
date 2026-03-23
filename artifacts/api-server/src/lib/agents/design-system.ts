export interface ThemeConfig {
  id: string;
  nameEn: string;
  nameAr: string;
  category: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    gradient: string;
  };
  fonts: {
    heading: string;
    body: string;
    accent: string;
  };
  borderRadius: string;
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  spacing: {
    sectionPadding: string;
    containerMax: string;
    cardPadding: string;
  };
  style: string;
  unsplashKeywords: string[];
}

export const PROFESSIONAL_THEMES: ThemeConfig[] = [
  {
    id: "real-estate",
    nameEn: "Real Estate Pro",
    nameAr: "عقاري احترافي",
    category: "real-estate",
    colors: {
      primary: "#1a365d",
      secondary: "#c7a94e",
      accent: "#2b6cb0",
      background: "#ffffff",
      surface: "#f7fafc",
      text: "#1a202c",
      textMuted: "#718096",
      border: "#e2e8f0",
      gradient: "from-[#1a365d] to-[#2b6cb0]",
    },
    fonts: { heading: "'Playfair Display', serif", body: "'Inter', sans-serif", accent: "'Cormorant Garamond', serif" },
    borderRadius: "rounded-lg",
    shadows: { sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-20 px-4", containerMax: "max-w-7xl mx-auto", cardPadding: "p-6" },
    style: "luxury-minimal",
    unsplashKeywords: ["luxury house", "modern apartment", "real estate", "architecture"],
  },
  {
    id: "restaurant",
    nameEn: "Restaurant & Café",
    nameAr: "مطعم ومقهى",
    category: "food",
    colors: {
      primary: "#9b2c2c",
      secondary: "#dd6b20",
      accent: "#f6e05e",
      background: "#fffaf0",
      surface: "#fefcbf",
      text: "#1a202c",
      textMuted: "#744210",
      border: "#fbd38d",
      gradient: "from-[#9b2c2c] to-[#dd6b20]",
    },
    fonts: { heading: "'Playfair Display', serif", body: "'Lora', serif", accent: "'Dancing Script', cursive" },
    borderRadius: "rounded-xl",
    shadows: { sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg shadow-orange-100/50", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-24 px-4", containerMax: "max-w-6xl mx-auto", cardPadding: "p-8" },
    style: "warm-elegant",
    unsplashKeywords: ["restaurant interior", "food plating", "cafe ambiance", "chef cooking"],
  },
  {
    id: "medical",
    nameEn: "Medical & Healthcare",
    nameAr: "طبي وصحي",
    category: "healthcare",
    colors: {
      primary: "#0d9488",
      secondary: "#2563eb",
      accent: "#06b6d4",
      background: "#f0fdfa",
      surface: "#ffffff",
      text: "#134e4a",
      textMuted: "#5eead4",
      border: "#ccfbf1",
      gradient: "from-[#0d9488] to-[#06b6d4]",
    },
    fonts: { heading: "'Plus Jakarta Sans', sans-serif", body: "'Inter', sans-serif", accent: "'DM Sans', sans-serif" },
    borderRadius: "rounded-2xl",
    shadows: { sm: "shadow-sm", md: "shadow-md shadow-teal-100/30", lg: "shadow-lg shadow-teal-100/40", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-20 px-4", containerMax: "max-w-7xl mx-auto", cardPadding: "p-6" },
    style: "clean-trustworthy",
    unsplashKeywords: ["medical clinic", "healthcare", "doctor patient", "hospital modern"],
  },
  {
    id: "tech-startup",
    nameEn: "Tech Startup",
    nameAr: "شركة تقنية",
    category: "technology",
    colors: {
      primary: "#7c3aed",
      secondary: "#06b6d4",
      accent: "#ec4899",
      background: "#0f0f23",
      surface: "#1a1a2e",
      text: "#e2e8f0",
      textMuted: "#94a3b8",
      border: "#334155",
      gradient: "from-[#7c3aed] via-[#06b6d4] to-[#ec4899]",
    },
    fonts: { heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", accent: "'JetBrains Mono', monospace" },
    borderRadius: "rounded-2xl",
    shadows: { sm: "shadow-sm", md: "shadow-lg shadow-purple-500/10", lg: "shadow-xl shadow-purple-500/20", xl: "shadow-2xl shadow-purple-500/30" },
    spacing: { sectionPadding: "py-24 px-4", containerMax: "max-w-7xl mx-auto", cardPadding: "p-8" },
    style: "dark-futuristic",
    unsplashKeywords: ["technology abstract", "coding setup", "startup office", "digital innovation"],
  },
  {
    id: "ecommerce",
    nameEn: "E-Commerce Store",
    nameAr: "متجر إلكتروني",
    category: "shopping",
    colors: {
      primary: "#111827",
      secondary: "#f59e0b",
      accent: "#ef4444",
      background: "#ffffff",
      surface: "#f9fafb",
      text: "#111827",
      textMuted: "#6b7280",
      border: "#e5e7eb",
      gradient: "from-[#111827] to-[#374151]",
    },
    fonts: { heading: "'DM Sans', sans-serif", body: "'Inter', sans-serif", accent: "'Poppins', sans-serif" },
    borderRadius: "rounded-xl",
    shadows: { sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-16 px-4", containerMax: "max-w-7xl mx-auto", cardPadding: "p-4" },
    style: "modern-clean",
    unsplashKeywords: ["product photography", "shopping", "fashion", "minimal product"],
  },
  {
    id: "portfolio",
    nameEn: "Creative Portfolio",
    nameAr: "بورتفوليو إبداعي",
    category: "personal",
    colors: {
      primary: "#1e1e1e",
      secondary: "#ff6b35",
      accent: "#ffd166",
      background: "#fafafa",
      surface: "#ffffff",
      text: "#1e1e1e",
      textMuted: "#757575",
      border: "#e0e0e0",
      gradient: "from-[#ff6b35] to-[#ffd166]",
    },
    fonts: { heading: "'Syne', sans-serif", body: "'Work Sans', sans-serif", accent: "'Space Mono', monospace" },
    borderRadius: "rounded-none",
    shadows: { sm: "shadow-none", md: "shadow-md", lg: "shadow-xl", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-28 px-6", containerMax: "max-w-6xl mx-auto", cardPadding: "p-8" },
    style: "bold-artistic",
    unsplashKeywords: ["creative workspace", "design studio", "art gallery", "portfolio"],
  },
  {
    id: "education",
    nameEn: "Education & Academy",
    nameAr: "تعليم وأكاديمية",
    category: "education",
    colors: {
      primary: "#1e40af",
      secondary: "#7c3aed",
      accent: "#f59e0b",
      background: "#eff6ff",
      surface: "#ffffff",
      text: "#1e293b",
      textMuted: "#64748b",
      border: "#bfdbfe",
      gradient: "from-[#1e40af] to-[#7c3aed]",
    },
    fonts: { heading: "'Nunito', sans-serif", body: "'Source Sans 3', sans-serif", accent: "'Fira Code', monospace" },
    borderRadius: "rounded-xl",
    shadows: { sm: "shadow-sm", md: "shadow-md shadow-blue-100/30", lg: "shadow-lg", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-20 px-4", containerMax: "max-w-7xl mx-auto", cardPadding: "p-6" },
    style: "friendly-professional",
    unsplashKeywords: ["students learning", "university campus", "online education", "classroom"],
  },
  {
    id: "law-firm",
    nameEn: "Law & Consulting",
    nameAr: "محاماة واستشارات",
    category: "professional",
    colors: {
      primary: "#1c1917",
      secondary: "#92400e",
      accent: "#d4a574",
      background: "#faf8f5",
      surface: "#ffffff",
      text: "#1c1917",
      textMuted: "#78716c",
      border: "#d6d3d1",
      gradient: "from-[#1c1917] to-[#44403c]",
    },
    fonts: { heading: "'Cormorant Garamond', serif", body: "'Lora', serif", accent: "'Libre Baskerville', serif" },
    borderRadius: "rounded-sm",
    shadows: { sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-24 px-4", containerMax: "max-w-6xl mx-auto", cardPadding: "p-8" },
    style: "classic-authoritative",
    unsplashKeywords: ["law office", "business meeting", "professional office", "corporate"],
  },
  {
    id: "fitness",
    nameEn: "Fitness & Gym",
    nameAr: "رياضة وجيم",
    category: "sports",
    colors: {
      primary: "#dc2626",
      secondary: "#16a34a",
      accent: "#eab308",
      background: "#0a0a0a",
      surface: "#171717",
      text: "#fafafa",
      textMuted: "#a3a3a3",
      border: "#262626",
      gradient: "from-[#dc2626] to-[#ea580c]",
    },
    fonts: { heading: "'Bebas Neue', sans-serif", body: "'Roboto', sans-serif", accent: "'Oswald', sans-serif" },
    borderRadius: "rounded-lg",
    shadows: { sm: "shadow-sm", md: "shadow-lg shadow-red-500/10", lg: "shadow-xl shadow-red-500/20", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-20 px-4", containerMax: "max-w-7xl mx-auto", cardPadding: "p-6" },
    style: "bold-energetic",
    unsplashKeywords: ["gym workout", "fitness training", "crossfit", "running athlete"],
  },
  {
    id: "travel",
    nameEn: "Travel & Tourism",
    nameAr: "سياحة وسفر",
    category: "travel",
    colors: {
      primary: "#0369a1",
      secondary: "#059669",
      accent: "#f97316",
      background: "#f0f9ff",
      surface: "#ffffff",
      text: "#0c4a6e",
      textMuted: "#64748b",
      border: "#bae6fd",
      gradient: "from-[#0369a1] to-[#059669]",
    },
    fonts: { heading: "'Montserrat', sans-serif", body: "'Open Sans', sans-serif", accent: "'Pacifico', cursive" },
    borderRadius: "rounded-2xl",
    shadows: { sm: "shadow-sm", md: "shadow-md shadow-sky-100/30", lg: "shadow-lg", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-24 px-4", containerMax: "max-w-7xl mx-auto", cardPadding: "p-6" },
    style: "bright-adventurous",
    unsplashKeywords: ["travel destination", "beach resort", "mountain landscape", "city skyline"],
  },
  {
    id: "wedding",
    nameEn: "Wedding & Events",
    nameAr: "أعراس ومناسبات",
    category: "events",
    colors: {
      primary: "#831843",
      secondary: "#be185d",
      accent: "#fbbf24",
      background: "#fdf2f8",
      surface: "#ffffff",
      text: "#1e1e1e",
      textMuted: "#9ca3af",
      border: "#fce7f3",
      gradient: "from-[#831843] to-[#be185d]",
    },
    fonts: { heading: "'Cormorant Garamond', serif", body: "'Quicksand', sans-serif", accent: "'Great Vibes', cursive" },
    borderRadius: "rounded-3xl",
    shadows: { sm: "shadow-sm", md: "shadow-md shadow-pink-100/40", lg: "shadow-lg shadow-pink-100/50", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-28 px-4", containerMax: "max-w-5xl mx-auto", cardPadding: "p-10" },
    style: "romantic-elegant",
    unsplashKeywords: ["wedding flowers", "event decoration", "wedding venue", "elegant party"],
  },
  {
    id: "saas",
    nameEn: "SaaS Platform",
    nameAr: "منصة SaaS",
    category: "technology",
    colors: {
      primary: "#4f46e5",
      secondary: "#0ea5e9",
      accent: "#10b981",
      background: "#ffffff",
      surface: "#f8fafc",
      text: "#0f172a",
      textMuted: "#64748b",
      border: "#e2e8f0",
      gradient: "from-[#4f46e5] to-[#0ea5e9]",
    },
    fonts: { heading: "'Cal Sans', 'Inter', sans-serif", body: "'Inter', sans-serif", accent: "'Fira Code', monospace" },
    borderRadius: "rounded-xl",
    shadows: { sm: "shadow-sm", md: "shadow-md shadow-indigo-100/30", lg: "shadow-lg shadow-indigo-100/40", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-20 px-4", containerMax: "max-w-7xl mx-auto", cardPadding: "p-6" },
    style: "clean-modern",
    unsplashKeywords: ["saas dashboard", "laptop workspace", "analytics screen", "team collaboration"],
  },
  {
    id: "beauty-salon",
    nameEn: "Beauty & Spa",
    nameAr: "تجميل وسبا",
    category: "beauty",
    colors: {
      primary: "#7e22ce",
      secondary: "#e879f9",
      accent: "#fcd34d",
      background: "#faf5ff",
      surface: "#ffffff",
      text: "#1e1e1e",
      textMuted: "#a78bfa",
      border: "#ede9fe",
      gradient: "from-[#7e22ce] to-[#e879f9]",
    },
    fonts: { heading: "'Playfair Display', serif", body: "'Poppins', sans-serif", accent: "'Satisfy', cursive" },
    borderRadius: "rounded-2xl",
    shadows: { sm: "shadow-sm", md: "shadow-md shadow-purple-100/40", lg: "shadow-lg shadow-purple-100/50", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-24 px-4", containerMax: "max-w-6xl mx-auto", cardPadding: "p-8" },
    style: "luxurious-feminine",
    unsplashKeywords: ["spa interior", "beauty salon", "skincare products", "wellness"],
  },
  {
    id: "construction",
    nameEn: "Construction & Engineering",
    nameAr: "مقاولات وهندسة",
    category: "industrial",
    colors: {
      primary: "#d97706",
      secondary: "#1e3a5f",
      accent: "#f59e0b",
      background: "#ffffff",
      surface: "#f5f5f4",
      text: "#1c1917",
      textMuted: "#78716c",
      border: "#d6d3d1",
      gradient: "from-[#d97706] to-[#b45309]",
    },
    fonts: { heading: "'Rajdhani', sans-serif", body: "'Roboto', sans-serif", accent: "'Oswald', sans-serif" },
    borderRadius: "rounded-lg",
    shadows: { sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-20 px-4", containerMax: "max-w-7xl mx-auto", cardPadding: "p-6" },
    style: "strong-industrial",
    unsplashKeywords: ["construction site", "building architecture", "engineering blueprint", "heavy equipment"],
  },
  {
    id: "arabic-modern",
    nameEn: "Modern Arabic",
    nameAr: "عربي عصري",
    category: "arabic",
    colors: {
      primary: "#1e3a5f",
      secondary: "#c7a94e",
      accent: "#0d9488",
      background: "#faf9f6",
      surface: "#ffffff",
      text: "#1a1a2e",
      textMuted: "#6b7280",
      border: "#e5e7eb",
      gradient: "from-[#1e3a5f] to-[#0d9488]",
    },
    fonts: { heading: "'Tajawal', sans-serif", body: "'Cairo', sans-serif", accent: "'Amiri', serif" },
    borderRadius: "rounded-xl",
    shadows: { sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg", xl: "shadow-2xl" },
    spacing: { sectionPadding: "py-24 px-4", containerMax: "max-w-7xl mx-auto", cardPadding: "p-8" },
    style: "arabic-elegant",
    unsplashKeywords: ["arabic architecture", "middle east modern", "islamic pattern", "dubai skyline"],
  },
];

export function generateColorPalette(baseColor: string): Record<string, string> {
  const hex = baseColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const hsl = rgbToHsl(r, g, b);
  const h = hsl[0];
  const s = hsl[1];

  return {
    "50": hslToHex(h, Math.min(s * 1.2, 100), 97),
    "100": hslToHex(h, Math.min(s * 1.1, 100), 93),
    "200": hslToHex(h, s, 86),
    "300": hslToHex(h, s * 0.95, 76),
    "400": hslToHex(h, s * 0.9, 62),
    "500": hslToHex(h, s * 0.85, 50),
    "600": hslToHex(h, s * 0.8, 42),
    "700": hslToHex(h, s * 0.75, 34),
    "800": hslToHex(h, s * 0.7, 26),
    "900": hslToHex(h, s * 0.65, 18),
    "950": hslToHex(h, s * 0.6, 10),
    complementary: hslToHex((h + 180) % 360, s * 0.8, 50),
    analogous1: hslToHex((h + 30) % 360, s * 0.9, 50),
    analogous2: hslToHex((h + 330) % 360, s * 0.9, 50),
    triadic1: hslToHex((h + 120) % 360, s * 0.7, 50),
    triadic2: hslToHex((h + 240) % 360, s * 0.7, 50),
    textOnPrimary: hsl[2] > 55 ? "#1a1a2e" : "#ffffff",
    surfaceLight: hslToHex(h, Math.min(s * 0.3, 20), 97),
    surfaceDark: hslToHex(h, Math.min(s * 0.5, 30), 10),
    borderLight: hslToHex(h, Math.min(s * 0.2, 15), 90),
  };
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s: number;
  const l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function detectTheme(prompt: string): ThemeConfig | null {
  const lower = prompt.toLowerCase();
  const keywords: Record<string, string[]> = {
    "real-estate": ["عقار", "عقاري", "real estate", "property", "بيت", "شقة", "أرض", "villa", "apartment"],
    "restaurant": ["مطعم", "مقهى", "restaurant", "cafe", "food", "أكل", "طعام", "قهوة", "coffee", "menu"],
    "medical": ["طبي", "مستشفى", "عيادة", "medical", "clinic", "hospital", "doctor", "health", "صحة", "طبيب"],
    "tech-startup": ["تقنية", "تكنولوجيا", "tech", "startup", "app", "تطبيق", "برمجة", "software", "saas"],
    "ecommerce": ["متجر", "تسوق", "store", "shop", "ecommerce", "e-commerce", "منتجات", "products", "بيع"],
    "portfolio": ["بورتفوليو", "portfolio", "أعمالي", "معرض", "freelance", "مستقل", "creative"],
    "education": ["تعليم", "أكاديمية", "education", "academy", "course", "دورة", "مدرسة", "school", "university", "جامعة"],
    "law-firm": ["محاماة", "قانون", "law", "legal", "consulting", "استشار", "محامي", "lawyer"],
    "fitness": ["رياضة", "جيم", "gym", "fitness", "workout", "تمارين", "لياقة", "crossfit"],
    "travel": ["سياحة", "سفر", "travel", "tourism", "فندق", "hotel", "رحلة", "trip", "booking"],
    "wedding": ["زفاف", "عرس", "wedding", "event", "مناسب", "حفلة", "party"],
    "saas": ["saas", "platform", "منصة", "dashboard", "لوحة تحكم", "analytics", "subscription"],
    "beauty-salon": ["تجميل", "سبا", "beauty", "salon", "spa", "عناية", "بشرة", "skincare"],
    "construction": ["مقاولات", "بناء", "construction", "engineering", "هندسة", "مشاريع"],
    "arabic-modern": ["عربي", "arabic", "إسلامي", "islamic"],
  };

  for (const [themeId, kws] of Object.entries(keywords)) {
    if (kws.some(kw => lower.includes(kw))) {
      return PROFESSIONAL_THEMES.find(t => t.id === themeId) || null;
    }
  }
  return null;
}

export function getThemeById(id: string): ThemeConfig | null {
  return PROFESSIONAL_THEMES.find(t => t.id === id) || null;
}

export function getThemeCSSVariables(theme: ThemeConfig): string {
  return `:root {
  --color-primary: ${theme.colors.primary};
  --color-secondary: ${theme.colors.secondary};
  --color-accent: ${theme.colors.accent};
  --color-background: ${theme.colors.background};
  --color-surface: ${theme.colors.surface};
  --color-text: ${theme.colors.text};
  --color-text-muted: ${theme.colors.textMuted};
  --color-border: ${theme.colors.border};
  --font-heading: ${theme.fonts.heading};
  --font-body: ${theme.fonts.body};
  --font-accent: ${theme.fonts.accent};
}`;
}

export function getThemePromptContext(theme: ThemeConfig): string {
  return `
=== THEME: ${theme.nameEn} (${theme.nameAr}) ===
Style: ${theme.style}
Colors:
- Primary: ${theme.colors.primary} (use for buttons, headings, CTAs)
- Secondary: ${theme.colors.secondary} (use for accents, badges, highlights)
- Accent: ${theme.colors.accent} (use for hover states, special elements)
- Background: ${theme.colors.background} | Surface: ${theme.colors.surface}
- Text: ${theme.colors.text} | Muted: ${theme.colors.textMuted}
- Gradient: bg-gradient-to-r ${theme.colors.gradient}

Fonts: Heading="${theme.fonts.heading}" | Body="${theme.fonts.body}" | Accent="${theme.fonts.accent}"
Border Radius: ${theme.borderRadius}
Shadows: sm="${theme.shadows.sm}" md="${theme.shadows.md}" lg="${theme.shadows.lg}"
Section Padding: ${theme.spacing.sectionPadding}
Container: ${theme.spacing.containerMax}

Image keywords for Unsplash: ${theme.unsplashKeywords.join(", ")}
Use images from: https://images.unsplash.com/photo-{relevant-id}?w=1200&h=800&fit=crop
===`;
}

export function getAllThemesSummary(): string {
  return PROFESSIONAL_THEMES.map(t =>
    `• ${t.id}: ${t.nameEn} / ${t.nameAr} — ${t.style} (${t.category})`
  ).join("\n");
}

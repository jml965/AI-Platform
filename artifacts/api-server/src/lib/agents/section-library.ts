export interface SectionVariant {
  id: string;
  sectionType: string;
  variantName: string;
  description: string;
  code: string;
}

export const SECTION_LIBRARY: SectionVariant[] = [
  // ═══════════════════════════════════════
  //  HERO SECTIONS (4 variants)
  // ═══════════════════════════════════════
  {
    id: "hero-gradient-split",
    sectionType: "hero",
    variantName: "Gradient Split",
    description: "Full-width gradient hero with text left, image right, floating stats cards",
    code: `function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] via-[var(--color-primary)]/90 to-[var(--color-secondary)]" />
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div className="text-white space-y-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm border border-white/20">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>Welcome to our platform</span>
          </div>
          <h1 className="text-5xl lg:text-7xl font-bold leading-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Build Something
            <span className="block bg-gradient-to-r from-white via-blue-200 to-white bg-clip-text text-transparent">
              Extraordinary
            </span>
          </h1>
          <p className="text-xl text-white/80 max-w-lg leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>
            Transform your vision into reality with our cutting-edge solutions designed for modern businesses.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="px-8 py-4 bg-white text-[var(--color-primary)] font-bold rounded-xl hover:shadow-2xl hover:shadow-white/20 transform hover:-translate-y-0.5 transition-all duration-300">
              Get Started Free
            </button>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
              Watch Demo
            </button>
          </div>
          <div className="flex gap-8 pt-4">
            {[{n:"10K+",l:"Active Users"},{n:"99.9%",l:"Uptime"},{n:"150+",l:"Countries"}].map((s,i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-white">{s.n}</div>
                <div className="text-sm text-white/60">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative hidden lg:block">
          <div className="absolute -inset-4 bg-gradient-to-r from-white/10 to-white/5 rounded-3xl blur-xl" />
          <img src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop" alt="Hero" className="relative rounded-2xl shadow-2xl w-full object-cover" />
          <div className="absolute -bottom-6 -left-6 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
            <div className="text-2xl font-bold text-white">4.9★</div>
            <div className="text-xs text-white/70">Customer Rating</div>
          </div>
        </div>
      </div>
    </section>
  );
}`,
  },
  {
    id: "hero-centered-video",
    sectionType: "hero",
    variantName: "Centered with Video BG",
    description: "Centered text over dark overlay with animated gradient border CTA",
    code: `function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center text-center overflow-hidden">
      <div className="absolute inset-0">
        <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=1080&fit=crop" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      </div>
      <div className="relative z-10 max-w-4xl mx-auto px-4 space-y-8">
        <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 text-sm text-white/80">
          ✨ Trusted by 500+ companies worldwide
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.1] tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          The Future of
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Digital Innovation</span>
        </h1>
        <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed">
          Empowering businesses with next-generation tools that drive growth, efficiency, and success.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <button className="group relative px-10 py-4 rounded-xl font-bold text-lg overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 group-hover:scale-105" />
            <span className="relative text-white">Start Free Trial</span>
          </button>
          <button className="px-10 py-4 rounded-xl font-medium text-lg text-white border border-white/20 hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
            Schedule a Demo →
          </button>
        </div>
        <div className="flex justify-center gap-1 pt-8">
          {[1,2,3,4,5].map(i => (
            <img key={i} src={\`https://i.pravatar.cc/40?img=\${i+10}\`} alt="" className="w-10 h-10 rounded-full border-2 border-white/20 -ml-2 first:ml-0" />
          ))}
          <span className="ml-3 text-white/70 text-sm self-center">Join 10,000+ happy users</span>
        </div>
      </div>
    </section>
  );
}`,
  },
  {
    id: "hero-minimal-elegant",
    sectionType: "hero",
    variantName: "Minimal Elegant",
    description: "Clean minimal hero with large typography and subtle animations",
    code: `function HeroSection() {
  return (
    <section className="min-h-screen flex items-center" style={{ background: "var(--color-background)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="max-w-3xl space-y-10">
          <div className="flex items-center gap-3">
            <div className="h-px w-12 bg-[var(--color-primary)]" />
            <span className="text-sm font-medium tracking-widest uppercase" style={{ color: "var(--color-primary)" }}>Welcome</span>
          </div>
          <h1 className="text-6xl lg:text-8xl font-bold leading-[1.05] tracking-tight" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
            We craft digital
            <br />
            <span style={{ color: "var(--color-primary)" }}>experiences.</span>
          </h1>
          <p className="text-xl leading-relaxed max-w-xl" style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-body)" }}>
            A creative studio specializing in brand identity, web design, and digital strategy for ambitious brands.
          </p>
          <div className="flex items-center gap-6">
            <button className="px-8 py-4 font-semibold text-white rounded-full transition-all duration-300 hover:shadow-xl hover:shadow-[var(--color-primary)]/20 transform hover:-translate-y-0.5" style={{ background: "var(--color-primary)" }}>
              View Our Work
            </button>
            <button className="flex items-center gap-2 font-medium transition-colors hover:opacity-70" style={{ color: "var(--color-primary)" }}>
              <span>Learn More</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}`,
  },
  {
    id: "hero-cards-floating",
    sectionType: "hero",
    variantName: "Floating Cards",
    description: "Hero with floating feature cards and animated background shapes",
    code: `function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" style={{ background: "var(--color-background)" }}>
      <div className="absolute top-20 right-20 w-72 h-72 rounded-full opacity-20 blur-3xl" style={{ background: "var(--color-primary)" }} />
      <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "var(--color-secondary)" }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-16 items-center relative">
        <div className="space-y-8">
          <h1 className="text-5xl lg:text-6xl font-bold leading-tight" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
            Powerful tools for
            <span className="block" style={{ color: "var(--color-primary)" }}>modern teams</span>
          </h1>
          <p className="text-lg leading-relaxed max-w-lg" style={{ color: "var(--color-text-muted)" }}>
            Everything you need to manage, collaborate, and scale your business in one unified platform.
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="px-8 py-3.5 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl transform hover:-translate-y-0.5" style={{ background: "var(--color-primary)" }}>
              Start Building →
            </button>
            <button className="px-8 py-3.5 font-medium rounded-xl border-2 transition-colors" style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}>
              View Pricing
            </button>
          </div>
        </div>
        <div className="relative hidden lg:grid grid-cols-2 gap-4">
          {[{icon:"📊",t:"Analytics",d:"Real-time insights"},{icon:"🔒",t:"Security",d:"Enterprise-grade"},{icon:"⚡",t:"Performance",d:"Lightning fast"},{icon:"🌍",t:"Global CDN",d:"150+ locations"}].map((c,i) => (
            <div key={i} className="p-6 rounded-2xl border backdrop-blur-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <div className="text-3xl mb-3">{c.icon}</div>
              <h3 className="font-bold mb-1" style={{ color: "var(--color-text)" }}>{c.t}</h3>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{c.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },

  // ═══════════════════════════════════════
  //  FEATURES SECTIONS (3 variants)
  // ═══════════════════════════════════════
  {
    id: "features-grid-icons",
    sectionType: "features",
    variantName: "Icon Grid",
    description: "3-column grid with icon cards, hover effects, and gradient accents",
    code: `function FeaturesSection() {
  const features = [
    { icon: "🚀", title: "Lightning Fast", desc: "Optimized performance with sub-second load times across all devices and networks." },
    { icon: "🔒", title: "Enterprise Security", desc: "Bank-grade encryption, SOC 2 compliance, and advanced threat protection built-in." },
    { icon: "📊", title: "Smart Analytics", desc: "AI-powered insights that help you make data-driven decisions in real-time." },
    { icon: "🌐", title: "Global Scale", desc: "Deploy to 150+ edge locations worldwide with automatic scaling and load balancing." },
    { icon: "🔗", title: "Easy Integration", desc: "Connect with 200+ tools through our REST API and pre-built integrations." },
    { icon: "💬", title: "24/7 Support", desc: "Dedicated support team with average response time under 5 minutes." },
  ];
  return (
    <section className="py-24 px-4" style={{ background: "var(--color-surface)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "var(--color-primary)" }}>Features</span>
          <h2 className="text-4xl lg:text-5xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>Everything you need to succeed</h2>
          <p className="text-lg" style={{ color: "var(--color-text-muted)" }}>Powerful features designed to give your business the competitive edge it deserves.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="group p-8 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1" style={{ background: "var(--color-background)", borderColor: "var(--color-border)" }}>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl mb-6 transition-transform duration-300 group-hover:scale-110" style={{ background: \`\${getComputedStyle(document.documentElement).getPropertyValue('--color-primary')}15\` }}>
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: "var(--color-text)" }}>{f.title}</h3>
              <p className="leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },
  {
    id: "features-alternating",
    sectionType: "features",
    variantName: "Alternating Image-Text",
    description: "Alternating left-right layout with images and feature descriptions",
    code: `function FeaturesSection() {
  const features = [
    { title: "Intuitive Dashboard", desc: "Monitor all your key metrics in one beautiful, customizable dashboard. Get real-time insights that matter most to your business.", img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop" },
    { title: "Team Collaboration", desc: "Work together seamlessly with built-in chat, file sharing, task management, and real-time editing capabilities.", img: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop" },
    { title: "Advanced Automation", desc: "Set up powerful workflows that automate repetitive tasks, saving your team hundreds of hours every month.", img: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=600&h=400&fit=crop" },
  ];
  return (
    <section className="py-24 px-4" style={{ background: "var(--color-background)" }}>
      <div className="max-w-6xl mx-auto space-y-32">
        {features.map((f, i) => (
          <div key={i} className={\`flex flex-col \${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-16 items-center\`}>
            <div className="flex-1 space-y-6">
              <span className="inline-block text-sm font-semibold px-3 py-1 rounded-full" style={{ background: \`\${getComputedStyle(document.documentElement).getPropertyValue('--color-primary')}15\`, color: "var(--color-primary)" }}>Feature {i + 1}</span>
              <h3 className="text-3xl lg:text-4xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>{f.title}</h3>
              <p className="text-lg leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{f.desc}</p>
              <button className="inline-flex items-center gap-2 font-semibold transition-all hover:gap-3" style={{ color: "var(--color-primary)" }}>
                Learn more <span>→</span>
              </button>
            </div>
            <div className="flex-1">
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl opacity-20 blur-2xl" style={{ background: "var(--color-primary)" }} />
                <img src={f.img} alt={f.title} className="relative rounded-2xl shadow-2xl w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}`,
  },
  {
    id: "features-bento",
    sectionType: "features",
    variantName: "Bento Grid",
    description: "Modern bento-box grid layout with varied card sizes",
    code: `function FeaturesSection() {
  return (
    <section className="py-24 px-4" style={{ background: "var(--color-background)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl lg:text-5xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>Built for scale</h2>
          <p className="text-lg" style={{ color: "var(--color-text-muted)" }}>Every feature designed to help your business grow without limits.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-8 rounded-2xl border relative overflow-hidden group" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl group-hover:opacity-20 transition-opacity" style={{ background: "var(--color-primary)" }} />
            <h3 className="text-2xl font-bold mb-3 relative" style={{ color: "var(--color-text)" }}>Advanced Analytics Dashboard</h3>
            <p className="text-base mb-6 max-w-md relative" style={{ color: "var(--color-text-muted)" }}>Real-time metrics, custom reports, and AI-powered predictions all in one place.</p>
            <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=300&fit=crop" alt="" className="rounded-xl w-full relative" />
          </div>
          <div className="p-8 rounded-2xl border group hover:shadow-lg transition-all" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>Blazing Fast</h3>
            <p style={{ color: "var(--color-text-muted)" }}>Sub-100ms response times with our global edge network. Your users never wait.</p>
          </div>
          <div className="p-8 rounded-2xl border group hover:shadow-lg transition-all" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>Secure by Default</h3>
            <p style={{ color: "var(--color-text-muted)" }}>End-to-end encryption, 2FA, SSO, and compliance with GDPR, SOC2, HIPAA.</p>
          </div>
          <div className="lg:col-span-2 p-8 rounded-2xl flex items-center gap-8 border group hover:shadow-lg transition-all" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-3" style={{ color: "var(--color-text)" }}>200+ Integrations</h3>
              <p style={{ color: "var(--color-text-muted)" }}>Connect with all your favorite tools — Slack, Notion, GitHub, Figma, and more.</p>
            </div>
            <div className="hidden md:flex gap-3 flex-wrap max-w-xs">
              {["📱","💻","🎨","📧","📁","🔧","📊","🗂️"].map((e,i) => (
                <div key={i} className="w-12 h-12 rounded-xl border flex items-center justify-center text-xl hover:scale-110 transition-transform" style={{ borderColor: "var(--color-border)" }}>{e}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}`,
  },

  // ═══════════════════════════════════════
  //  PRICING SECTIONS (3 variants)
  // ═══════════════════════════════════════
  {
    id: "pricing-three-tier",
    sectionType: "pricing",
    variantName: "Three Tier Cards",
    description: "Classic 3-tier pricing with highlighted popular plan",
    code: `function PricingSection() {
  const plans = [
    { name: "Starter", price: "29", period: "/mo", desc: "Perfect for individuals", features: ["5 Projects", "10GB Storage", "Email Support", "Basic Analytics", "API Access"], popular: false },
    { name: "Professional", price: "79", period: "/mo", desc: "For growing teams", features: ["Unlimited Projects", "100GB Storage", "Priority Support", "Advanced Analytics", "API Access", "Custom Domains", "Team Collaboration"], popular: true },
    { name: "Enterprise", price: "199", period: "/mo", desc: "For large organizations", features: ["Everything in Pro", "Unlimited Storage", "24/7 Phone Support", "Custom Integrations", "SLA Guarantee", "Dedicated Manager", "SSO & SAML", "Audit Logs"], popular: false },
  ];
  return (
    <section className="py-24 px-4" style={{ background: "var(--color-background)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "var(--color-primary)" }}>Pricing</span>
          <h2 className="text-4xl lg:text-5xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>Simple, transparent pricing</h2>
          <p className="text-lg" style={{ color: "var(--color-text-muted)" }}>No hidden fees. Cancel anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {plans.map((p, i) => (
            <div key={i} className={\`relative rounded-2xl border p-8 transition-all duration-300 hover:shadow-xl \${p.popular ? "scale-105 shadow-xl border-2" : ""}\`} style={{ background: "var(--color-surface)", borderColor: p.popular ? "var(--color-primary)" : "var(--color-border)" }}>
              {p.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-sm font-medium" style={{ background: "var(--color-primary)" }}>Most Popular</div>}
              <h3 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>{p.name}</h3>
              <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>{p.desc}</p>
              <div className="mb-6">
                <span className="text-5xl font-bold" style={{ color: "var(--color-text)" }}>\${p.price}</span>
                <span style={{ color: "var(--color-text-muted)" }}>{p.period}</span>
              </div>
              <button className={\`w-full py-3 rounded-xl font-semibold transition-all duration-300 \${p.popular ? "text-white shadow-lg hover:shadow-xl" : "border-2 hover:shadow-md"}\`} style={p.popular ? { background: "var(--color-primary)" } : { borderColor: "var(--color-primary)", color: "var(--color-primary)" }}>
                Get Started
              </button>
              <ul className="mt-8 space-y-3">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm">
                    <svg className="w-5 h-5 flex-shrink-0" style={{ color: "var(--color-primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span style={{ color: "var(--color-text)" }}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },
  {
    id: "pricing-toggle",
    sectionType: "pricing",
    variantName: "Monthly/Annual Toggle",
    description: "Pricing with toggle switch between monthly and annual billing",
    code: `function PricingSection() {
  const [annual, setAnnual] = React.useState(false);
  const plans = [
    { name: "Basic", monthly: 19, annual: 15, features: ["3 Projects", "5GB Storage", "Community Support"] },
    { name: "Pro", monthly: 49, annual: 39, features: ["Unlimited Projects", "50GB Storage", "Priority Support", "API Access", "Custom Domains"], popular: true },
    { name: "Business", monthly: 99, annual: 79, features: ["Everything in Pro", "500GB Storage", "Phone Support", "SSO", "Advanced Security", "Custom Reports"] },
  ];
  return (
    <section className="py-24 px-4" style={{ background: "var(--color-surface)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-4">
          <h2 className="text-4xl lg:text-5xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>Choose your plan</h2>
          <div className="flex items-center justify-center gap-4 mt-6">
            <span className={\`text-sm font-medium \${!annual ? "opacity-100" : "opacity-50"}\`} style={{ color: "var(--color-text)" }}>Monthly</span>
            <button onClick={() => setAnnual(!annual)} className="relative w-14 h-7 rounded-full transition-colors duration-300" style={{ background: annual ? "var(--color-primary)" : "var(--color-border)" }}>
              <div className={\`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 \${annual ? "translate-x-8" : "translate-x-1"}\`} />
            </button>
            <span className={\`text-sm font-medium \${annual ? "opacity-100" : "opacity-50"}\`} style={{ color: "var(--color-text)" }}>Annual <span className="text-xs px-2 py-0.5 rounded-full text-white ml-1" style={{ background: "var(--color-primary)" }}>Save 20%</span></span>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((p, i) => (
            <div key={i} className={\`rounded-2xl border p-8 transition-all duration-300 hover:shadow-xl \${(p as any).popular ? "ring-2 ring-offset-2" : ""}\`} style={{ background: "var(--color-background)", borderColor: "var(--color-border)", ...(p as any).popular ? { ringColor: "var(--color-primary)" } as any : {} }}>
              <h3 className="text-xl font-bold mb-1" style={{ color: "var(--color-text)" }}>{p.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold" style={{ color: "var(--color-text)" }}>\${annual ? p.annual : p.monthly}</span>
                <span style={{ color: "var(--color-text-muted)" }}>/month</span>
              </div>
              <button className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:shadow-lg" style={{ background: "var(--color-primary)" }}>Get Started</button>
              <ul className="mt-6 space-y-3">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm"><span style={{ color: "var(--color-primary)" }}>✓</span><span style={{ color: "var(--color-text)" }}>{f}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },

  // ═══════════════════════════════════════
  //  TESTIMONIALS (3 variants)
  // ═══════════════════════════════════════
  {
    id: "testimonials-cards",
    sectionType: "testimonials",
    variantName: "Card Grid",
    description: "Grid of testimonial cards with avatars, ratings, and quotes",
    code: `function TestimonialsSection() {
  const testimonials = [
    { name: "Sarah Johnson", role: "CEO, TechFlow", avatar: "https://i.pravatar.cc/80?img=1", quote: "This platform transformed how we operate. We saw a 40% increase in productivity within the first month.", rating: 5 },
    { name: "Ahmed Hassan", role: "CTO, DataVerse", avatar: "https://i.pravatar.cc/80?img=3", quote: "The best investment we've made. The support team is incredible and the features keep getting better.", rating: 5 },
    { name: "Maria Garcia", role: "Founder, DesignLab", avatar: "https://i.pravatar.cc/80?img=5", quote: "Clean, intuitive, and powerful. Everything I need in one place without the complexity.", rating: 5 },
    { name: "James Kim", role: "VP Engineering, Scale", avatar: "https://i.pravatar.cc/80?img=8", quote: "We migrated from three different tools to this single platform. Our team couldn't be happier.", rating: 4 },
    { name: "Fatima Al-Rashid", role: "Director, CloudFirst", avatar: "https://i.pravatar.cc/80?img=9", quote: "Enterprise-grade security with startup-level simplicity. Exactly what our clients needed.", rating: 5 },
    { name: "David Chen", role: "PM, InnovateCo", avatar: "https://i.pravatar.cc/80?img=11", quote: "The analytics alone are worth the price. We're making better decisions faster than ever before.", rating: 5 },
  ];
  return (
    <section className="py-24 px-4" style={{ background: "var(--color-background)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: "var(--color-primary)" }}>Testimonials</span>
          <h2 className="text-4xl lg:text-5xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>Loved by thousands</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <div className="flex gap-1 mb-4">{Array.from({length: t.rating}).map((_,j) => <span key={j} className="text-yellow-400">★</span>)}</div>
              <p className="mb-6 leading-relaxed" style={{ color: "var(--color-text)" }}>"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full" />
                <div>
                  <div className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{t.name}</div>
                  <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },
  {
    id: "testimonials-large-quote",
    sectionType: "testimonials",
    variantName: "Large Single Quote",
    description: "One large featured testimonial with company logos below",
    code: `function TestimonialsSection() {
  return (
    <section className="py-24 px-4" style={{ background: "var(--color-surface)" }}>
      <div className="max-w-4xl mx-auto text-center space-y-10">
        <div className="text-6xl" style={{ color: "var(--color-primary)" }}>"</div>
        <blockquote className="text-2xl lg:text-3xl font-medium leading-relaxed" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>
          This platform didn't just improve our workflow — it completely reinvented how our team collaborates. We've never been more productive or more aligned.
        </blockquote>
        <div className="flex flex-col items-center gap-3">
          <img src="https://i.pravatar.cc/96?img=12" alt="" className="w-16 h-16 rounded-full ring-4" style={{ ringColor: "var(--color-primary)" }} />
          <div>
            <div className="font-bold text-lg" style={{ color: "var(--color-text)" }}>Alexandra Mitchell</div>
            <div style={{ color: "var(--color-text-muted)" }}>VP of Product, FutureScale Inc.</div>
          </div>
        </div>
        <div className="pt-12 border-t" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-sm mb-6" style={{ color: "var(--color-text-muted)" }}>Trusted by industry leaders</p>
          <div className="flex justify-center gap-12 opacity-40 flex-wrap">
            {["Google", "Microsoft", "Amazon", "Meta", "Apple"].map((c, i) => (
              <span key={i} className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{c}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}`,
  },

  // ═══════════════════════════════════════
  //  FAQ SECTIONS (3 variants)
  // ═══════════════════════════════════════
  {
    id: "faq-accordion",
    sectionType: "faq",
    variantName: "Accordion",
    description: "Expandable accordion FAQ with smooth animations",
    code: `function FAQSection() {
  const [open, setOpen] = React.useState<number | null>(0);
  const faqs = [
    { q: "How do I get started?", a: "Simply sign up for a free account, choose your plan, and you'll be guided through the setup process. It takes less than 5 minutes to get your first project running." },
    { q: "Can I cancel my subscription anytime?", a: "Yes, you can cancel your subscription at any time from your account settings. There are no cancellation fees, and you'll continue to have access until the end of your billing period." },
    { q: "Do you offer a free trial?", a: "We offer a 14-day free trial on all paid plans. No credit card required. You get full access to all features during the trial period." },
    { q: "Is my data secure?", a: "Absolutely. We use AES-256 encryption, SOC 2 Type II compliance, regular security audits, and your data is stored in geographically distributed data centers with 99.99% uptime." },
    { q: "Can I upgrade or downgrade my plan?", a: "Yes, you can change your plan at any time. When upgrading, you'll be charged the prorated difference. When downgrading, the credit will be applied to your next billing cycle." },
    { q: "Do you offer custom enterprise solutions?", a: "Yes! Contact our sales team for custom pricing, dedicated support, custom integrations, and SLA agreements tailored to your organization's needs." },
  ];
  return (
    <section className="py-24 px-4" style={{ background: "var(--color-background)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl lg:text-5xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>Frequently Asked Questions</h2>
          <p className="text-lg" style={{ color: "var(--color-text-muted)" }}>Everything you need to know about our platform.</p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border overflow-hidden transition-all" style={{ borderColor: "var(--color-border)", background: open === i ? "var(--color-surface)" : "transparent" }}>
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                <span className="font-semibold" style={{ color: "var(--color-text)" }}>{faq.q}</span>
                <svg className={\`w-5 h-5 transition-transform duration-300 \${open === i ? "rotate-180" : ""}\`} style={{ color: "var(--color-primary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div className={\`overflow-hidden transition-all duration-300 \${open === i ? "max-h-40 pb-5 px-5" : "max-h-0"}\`}>
                <p className="leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },

  // ═══════════════════════════════════════
  //  CTA SECTIONS (3 variants)
  // ═══════════════════════════════════════
  {
    id: "cta-gradient-banner",
    sectionType: "cta",
    variantName: "Gradient Banner",
    description: "Full-width gradient CTA with compelling copy and dual buttons",
    code: `function CTASection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden p-12 lg:p-20 text-center" style={{ background: \`linear-gradient(135deg, var(--color-primary), var(--color-secondary))\` }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative space-y-6">
            <h2 className="text-4xl lg:text-5xl font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>Ready to get started?</h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">Join thousands of teams already using our platform to build better products, faster.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button className="px-10 py-4 bg-white font-bold rounded-xl shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-300" style={{ color: "var(--color-primary)" }}>
                Start Free Trial
              </button>
              <button className="px-10 py-4 bg-white/10 backdrop-blur-sm text-white font-medium rounded-xl border border-white/20 hover:bg-white/20 transition-all duration-300">
                Talk to Sales
              </button>
            </div>
            <p className="text-sm text-white/60">No credit card required • 14-day free trial • Cancel anytime</p>
          </div>
        </div>
      </div>
    </section>
  );
}`,
  },
  {
    id: "cta-newsletter",
    sectionType: "cta",
    variantName: "Newsletter Signup",
    description: "Email capture CTA with input field and social proof",
    code: `function CTASection() {
  const [email, setEmail] = React.useState("");
  return (
    <section className="py-24 px-4" style={{ background: "var(--color-surface)" }}>
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h2 className="text-4xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>Stay in the loop</h2>
        <p className="text-lg" style={{ color: "var(--color-text-muted)" }}>Get the latest updates, tips, and exclusive offers delivered to your inbox.</p>
        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" className="flex-1 px-5 py-3.5 rounded-xl border focus:outline-none focus:ring-2 transition-all" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", color: "var(--color-text)", ringColor: "var(--color-primary)" }} />
          <button className="px-8 py-3.5 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all" style={{ background: "var(--color-primary)" }}>Subscribe</button>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Join 10,000+ subscribers • Unsubscribe anytime</p>
      </div>
    </section>
  );
}`,
  },

  // ═══════════════════════════════════════
  //  FOOTER SECTIONS (3 variants)
  // ═══════════════════════════════════════
  {
    id: "footer-mega",
    sectionType: "footer",
    variantName: "Mega Footer",
    description: "Full mega footer with columns, newsletter, and social links",
    code: `function FooterSection() {
  const columns = [
    { title: "Product", links: ["Features", "Pricing", "Integrations", "Changelog", "Documentation"] },
    { title: "Company", links: ["About Us", "Careers", "Blog", "Press", "Partners"] },
    { title: "Resources", links: ["Community", "Help Center", "Tutorials", "API Docs", "Status"] },
    { title: "Legal", links: ["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR", "Security"] },
  ];
  return (
    <footer className="pt-20 pb-8 px-4 border-t" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
          <div className="col-span-2 md:col-span-4 lg:col-span-1 space-y-4">
            <h3 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Brand</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>Building the future of digital experiences, one product at a time.</p>
            <div className="flex gap-3">
              {["𝕏", "in", "📘", "📷"].map((s, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg border flex items-center justify-center text-sm hover:opacity-70 transition-opacity" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>{s}</a>
              ))}
            </div>
          </div>
          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="font-semibold mb-4 text-sm" style={{ color: "var(--color-text)" }}>{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link, j) => (
                  <li key={j}><a href="#" className="text-sm hover:opacity-70 transition-opacity" style={{ color: "var(--color-text-muted)" }}>{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>© 2025 Brand. All rights reserved.</p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Cookies"].map((l, i) => (
              <a key={i} href="#" className="text-sm hover:opacity-70 transition-opacity" style={{ color: "var(--color-text-muted)" }}>{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}`,
  },
  {
    id: "footer-minimal",
    sectionType: "footer",
    variantName: "Minimal Footer",
    description: "Clean single-line footer with logo and links",
    code: `function FooterSection() {
  return (
    <footer className="py-8 px-4 border-t" style={{ borderColor: "var(--color-border)" }}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--color-primary)" }}>B</div>
          <span className="font-bold" style={{ color: "var(--color-text)" }}>Brand</span>
        </div>
        <nav className="flex gap-8">
          {["About", "Features", "Pricing", "Blog", "Contact"].map((l, i) => (
            <a key={i} href="#" className="text-sm hover:opacity-70 transition-opacity" style={{ color: "var(--color-text-muted)" }}>{l}</a>
          ))}
        </nav>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>© 2025</p>
      </div>
    </footer>
  );
}`,
  },

  // ═══════════════════════════════════════
  //  NAVBAR (2 variants)
  // ═══════════════════════════════════════
  {
    id: "navbar-sticky-glass",
    sectionType: "navbar",
    variantName: "Sticky Glassmorphism",
    description: "Sticky top navbar with glass effect, logo, links, and CTA button",
    code: `function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={\`fixed top-0 left-0 right-0 z-50 transition-all duration-300 \${scrolled ? "py-3 shadow-lg backdrop-blur-xl" : "py-5"}\`} style={{ background: scrolled ? "rgba(255,255,255,0.85)" : "transparent" }}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: "var(--color-primary)" }}>B</div>
          <span className={\`text-lg font-bold transition-colors \${scrolled ? "" : "text-white"}\`} style={scrolled ? { color: "var(--color-text)" } : {}}>Brand</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {["Home", "Features", "Pricing", "About", "Contact"].map((l, i) => (
            <a key={i} href="#" className={\`text-sm font-medium transition-colors hover:opacity-70 \${scrolled ? "" : "text-white"}\`} style={scrolled ? { color: "var(--color-text-muted)" } : {}}>{l}</a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button className={\`px-4 py-2 text-sm font-medium rounded-lg transition-colors \${scrolled ? "" : "text-white"}\`} style={scrolled ? { color: "var(--color-text)" } : {}}>Sign In</button>
          <button className="px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-lg transition-all hover:shadow-xl" style={{ background: "var(--color-primary)" }}>Get Started</button>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2">
          <svg className="w-6 h-6" fill="none" stroke={scrolled ? "var(--color-text)" : "white"} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden mt-2 mx-4 p-4 rounded-xl shadow-xl backdrop-blur-xl" style={{ background: "var(--color-surface)" }}>
          {["Home", "Features", "Pricing", "About", "Contact"].map((l, i) => (
            <a key={i} href="#" className="block py-2 text-sm font-medium" style={{ color: "var(--color-text)" }}>{l}</a>
          ))}
          <button className="w-full mt-3 py-2.5 text-white font-semibold rounded-lg" style={{ background: "var(--color-primary)" }}>Get Started</button>
        </div>
      )}
    </nav>
  );
}`,
  },

  // ═══════════════════════════════════════
  //  CONTACT (2 variants)
  // ═══════════════════════════════════════
  {
    id: "contact-split-form",
    sectionType: "contact",
    variantName: "Split Form + Info",
    description: "Left side info cards, right side contact form",
    code: `function ContactSection() {
  return (
    <section className="py-24 px-4" style={{ background: "var(--color-background)" }}>
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16">
        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>Get in touch</h2>
            <p className="text-lg" style={{ color: "var(--color-text-muted)" }}>Have a question or want to work together? We'd love to hear from you.</p>
          </div>
          {[{icon:"📧",t:"Email",d:"hello@brand.com"},{icon:"📍",t:"Office",d:"123 Business Ave, Suite 100"},{icon:"📱",t:"Phone",d:"+1 (555) 000-0000"}].map((c,i) => (
            <div key={i} className="flex items-start gap-4 p-5 rounded-xl border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
              <div className="text-2xl">{c.icon}</div>
              <div>
                <div className="font-semibold" style={{ color: "var(--color-text)" }}>{c.t}</div>
                <div style={{ color: "var(--color-text-muted)" }}>{c.d}</div>
              </div>
            </div>
          ))}
        </div>
        <form className="space-y-5 p-8 rounded-2xl border" style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <div className="grid grid-cols-2 gap-4">
            <input placeholder="First Name" className="px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", ringColor: "var(--color-primary)" }} />
            <input placeholder="Last Name" className="px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", ringColor: "var(--color-primary)" }} />
          </div>
          <input placeholder="Email Address" className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", ringColor: "var(--color-primary)" }} />
          <textarea rows={5} placeholder="Your Message" className="w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 transition-all resize-none" style={{ borderColor: "var(--color-border)", background: "var(--color-background)", ringColor: "var(--color-primary)" }} />
          <button className="w-full py-3.5 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all" style={{ background: "var(--color-primary)" }}>Send Message</button>
        </form>
      </div>
    </section>
  );
}`,
  },

  // ═══════════════════════════════════════
  //  STATS / NUMBERS (1 variant)
  // ═══════════════════════════════════════
  {
    id: "stats-counter",
    sectionType: "stats",
    variantName: "Counter Bar",
    description: "Horizontal stats bar with large numbers and labels",
    code: `function StatsSection() {
  const stats = [
    { number: "10K+", label: "Active Users" },
    { number: "500+", label: "Companies" },
    { number: "99.9%", label: "Uptime" },
    { number: "150+", label: "Countries" },
  ];
  return (
    <section className="py-16 px-4" style={{ background: "var(--color-surface)" }}>
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s, i) => (
          <div key={i} className="text-center space-y-2">
            <div className="text-4xl lg:text-5xl font-bold" style={{ color: "var(--color-primary)" }}>{s.number}</div>
            <div className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}`,
  },

  // ═══════════════════════════════════════
  //  TEAM SECTION
  // ═══════════════════════════════════════
  {
    id: "team-grid",
    sectionType: "team",
    variantName: "Team Grid",
    description: "Team members grid with photos, names, and roles",
    code: `function TeamSection() {
  const team = [
    { name: "Alex Johnson", role: "CEO & Founder", img: "https://i.pravatar.cc/200?img=1" },
    { name: "Sarah Chen", role: "CTO", img: "https://i.pravatar.cc/200?img=5" },
    { name: "Omar Hassan", role: "Head of Design", img: "https://i.pravatar.cc/200?img=3" },
    { name: "Maria Garcia", role: "Head of Marketing", img: "https://i.pravatar.cc/200?img=9" },
  ];
  return (
    <section className="py-24 px-4" style={{ background: "var(--color-background)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-text)" }}>Meet our team</h2>
          <p style={{ color: "var(--color-text-muted)" }}>The talented people behind our success.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((m, i) => (
            <div key={i} className="group text-center space-y-4">
              <div className="relative overflow-hidden rounded-2xl">
                <img src={m.img} alt={m.name} className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div>
                <h3 className="font-bold text-lg" style={{ color: "var(--color-text)" }}>{m.name}</h3>
                <p className="text-sm" style={{ color: "var(--color-primary)" }}>{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
  },
];

export function getSectionsByType(type: string): SectionVariant[] {
  return SECTION_LIBRARY.filter(s => s.sectionType === type);
}

export function getRandomVariant(type: string): SectionVariant | null {
  const sections = getSectionsByType(type);
  if (sections.length === 0) return null;
  return sections[Math.floor(Math.random() * sections.length)];
}

export function getSectionLibraryPrompt(requestedSections?: string[]): string {
  const types = requestedSections || ["hero", "features", "pricing", "testimonials", "faq", "cta", "footer", "navbar", "contact", "stats", "team"];
  
  let prompt = `\n=== PROFESSIONAL SECTION LIBRARY — USE THESE AS REFERENCE ===\n`;
  prompt += `Below are production-quality section code examples. Use these as REFERENCE for structure, styling patterns, and quality level.\n`;
  prompt += `You MUST match or exceed this quality level in your generated code.\n\n`;

  for (const type of types) {
    const sections = getSectionsByType(type);
    if (sections.length === 0) continue;
    const chosen = sections[0];
    prompt += `--- ${type.toUpperCase()} SECTION (${chosen.variantName}) ---\n`;
    prompt += `${chosen.description}\n`;
    prompt += `\`\`\`tsx\n${chosen.code}\n\`\`\`\n\n`;
  }

  prompt += `=== END SECTION LIBRARY ===\n`;
  return prompt;
}

export function getAllSectionTypes(): string[] {
  return [...new Set(SECTION_LIBRARY.map(s => s.sectionType))];
}

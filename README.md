# منصة البناء الذكي | AI Smart Builder Platform

منصة متكاملة لبناء المشاريع البرمجية باستخدام الذكاء الاصطناعي. تعمل بـ 8 وكلاء ذكاء اصطناعي متخصصين لتخطيط وبرمجة ومراجعة ونشر المشاريع تلقائياً.

## المميزات

- **8 وكلاء ذكاء اصطناعي**: Planner, Coder, Reviewer, Repair, Deployer, Security Scanner, وغيرها
- **واجهة عمل ثلاثية الألواح**: محرر كود + معاينة حية + سجل تنفيذ
- **تنفيذ مباشر (SSE)**: متابعة مراحل البناء لحظة بلحظة
- **تصدير المشاريع**: تحميل كـ tar.gz أو رفع إلى GitHub
- **دعم ثنائي اللغة**: عربي / إنجليزي
- **الوضع الداكن والفاتح**
- **حفظ المشاريع**: جميع المشاريع محفوظة ومستمرة

## النماذج المستخدمة

| الوكيل | النموذج |
|--------|---------|
| Planner (المخطط) | Claude Sonnet 4 |
| Reviewer (المراجع) | Claude Sonnet 4 |
| Coder (المبرمج) | GPT-5.2 |
| Repair (الإصلاح) | GPT-5.2 |

## التثبيت والتشغيل

### 1. استنساخ المشروع
```bash
git clone https://github.com/jml965/AI-Platform.git
cd AI-Platform
```

### 2. تثبيت الحزم
```bash
npm install
```

### 3. إعداد متغيرات البيئة
```bash
cp .env.example .env
```
عدّل ملف `.env` وأضف مفاتيح API:
- `OPENAI_API_KEY` - من https://platform.openai.com/api-keys
- `ANTHROPIC_API_KEY` - من https://console.anthropic.com/settings/keys

### 4. التشغيل
```bash
# وضع التطوير
npm run dev

# وضع الإنتاج
npm run build
npm start
```

المنصة ستعمل على `http://localhost:5000`

## النشر بـ Docker

```bash
docker build -t ai-platform .
docker run -p 5000:5000 --env-file .env ai-platform
```

## النشر السريع على سيرفر

```bash
curl -fsSL https://raw.githubusercontent.com/jml965/AI-Platform/main/deploy.sh | bash
```

## هيكل المشروع

```
client/          # واجهة المستخدم (React + TypeScript)
server/          # الخادم (Express)
src/             # محرك الذكاء الاصطناعي والوكلاء
  engine/        # المحرك الرئيسي
  agents/        # الوكلاء (8 وكلاء)
shared/          # الأنواع والمخططات المشتركة
script/          # سكربتات البناء
```

## التقنيات

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express, TypeScript
- **AI**: OpenAI GPT-5.2, Anthropic Claude Sonnet 4
- **Build**: Vite, esbuild

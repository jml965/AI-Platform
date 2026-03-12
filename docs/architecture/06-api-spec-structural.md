# تصميم واجهات API الهيكلي — Structural API Spec

---

## نظرة عامة

جميع الـ endpoints تحت المسار `/api`. التحقق من المدخلات عبر Zod schemas المولَّدة من OpenAPI spec.

---

## مجموعات API

### 1. المصادقة (Auth) — `/api/auth`

| Method | Path | الوصف | المصادقة |
|--------|------|-------|----------|
| GET | /api/auth/login | بدء تسجيل الدخول (Replit OIDC) | لا |
| GET | /api/auth/callback | استقبال callback من Replit | لا |
| POST | /api/auth/logout | تسجيل الخروج | نعم |
| GET | /api/auth/me | بيانات المستخدم الحالي | نعم |
| PATCH | /api/auth/me | تحديث الملف الشخصي (اللغة مثلاً) | نعم |

### 2. المشاريع (Projects) — `/api/projects`

| Method | Path | الوصف | الصلاحية |
|--------|------|-------|----------|
| GET | /api/projects | قائمة مشاريع المستخدم | مالك / عضو فريق |
| POST | /api/projects | إنشاء مشروع جديد | مالك / مطور |
| GET | /api/projects/:id | تفاصيل مشروع | مالك / عضو فريق |
| PATCH | /api/projects/:id | تحديث مشروع | مالك / مطور |
| DELETE | /api/projects/:id | حذف مشروع | مالك / مدير |
| GET | /api/projects/:id/files | قائمة ملفات المشروع | مالك / عضو فريق |
| GET | /api/projects/:id/files/:fileId | محتوى ملف | مالك / عضو فريق |

### 3. البناء (Build) — `/api/build`

| Method | Path | الوصف | الصلاحية |
|--------|------|-------|----------|
| POST | /api/build/start | بدء بناء موقع | مالك / مطور |
| GET | /api/build/:buildId/status | حالة البناء الحالي | مالك / عضو فريق |
| POST | /api/build/:buildId/cancel | إلغاء بناء قيد التنفيذ | مالك / مطور |
| GET | /api/build/:buildId/logs | سجل تنفيذ البناء | مالك / عضو فريق |

### 4. الوكلاء (Agents) — `/api/agents`

| Method | Path | الوصف | الصلاحية |
|--------|------|-------|----------|
| GET | /api/agents/status | حالة جميع الوكلاء | مالك / عضو فريق |
| GET | /api/agents/:taskId | حالة مهمة محددة | مالك / عضو فريق |

### 5. التوكن والاستهلاك (Tokens) — `/api/tokens`

| Method | Path | الوصف | الصلاحية |
|--------|------|-------|----------|
| GET | /api/tokens/usage | استهلاك التوكن (بفلتر: يوم/شهر/مشروع) | مالك |
| GET | /api/tokens/limits | الحدود الحالية | مالك |
| PATCH | /api/tokens/limits | تعديل الحدود | مالك |
| GET | /api/tokens/summary | ملخص الاستهلاك والتكلفة | مالك |

### 6. الفوترة والاشتراكات (Billing) — `/api/billing`

| Method | Path | الوصف | الصلاحية |
|--------|------|-------|----------|
| GET | /api/billing/plans | قائمة الخطط المتاحة | عام |
| GET | /api/billing/subscription | الاشتراك الحالي | مالك / مدير |
| POST | /api/billing/checkout | إنشاء جلسة دفع Stripe | مالك / مدير |
| POST | /api/billing/webhook | استقبال إشعارات Stripe | نظامي |
| GET | /api/billing/invoices | سجل الفواتير | مالك / مدير |
| GET | /api/billing/credits | الرصيد الحالي | مالك / مدير |
| POST | /api/billing/topup | تعبئة الرصيد | مالك / مدير |

### 7. الفرق (Teams) — `/api/teams`

| Method | Path | الوصف | الصلاحية |
|--------|------|-------|----------|
| GET | /api/teams | قائمة فرقي | مالك / عضو |
| POST | /api/teams | إنشاء فريق جديد | مالك |
| GET | /api/teams/:id | تفاصيل الفريق | عضو فريق |
| PATCH | /api/teams/:id | تعديل الفريق | مدير |
| DELETE | /api/teams/:id | حذف الفريق | مدير |
| GET | /api/teams/:id/members | قائمة الأعضاء | عضو فريق |
| POST | /api/teams/:id/invite | دعوة عضو جديد | مدير |
| PATCH | /api/teams/:id/members/:userId | تغيير دور عضو | مدير |
| DELETE | /api/teams/:id/members/:userId | إزالة عضو | مدير |
| POST | /api/teams/accept/:token | قبول دعوة | المدعو |

### 8. المعاينة (Preview) — `/api/preview`

| Method | Path | الوصف | الصلاحية |
|--------|------|-------|----------|
| GET | /api/preview/:projectId | عرض المعاينة المباشرة | مالك / عضو فريق |

### 9. صحة النظام (Health)

| Method | Path | الوصف | المصادقة |
|--------|------|-------|----------|
| GET | /api/healthz | فحص صحة الخادم | لا |

---

## أنماط الاستجابة

### استجابة ناجحة
```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### استجابة خطأ
```json
{
  "error": {
    "code": "LIMIT_EXCEEDED",
    "message": "Daily token limit reached",
    "message_ar": "تم الوصول إلى الحد اليومي للتوكن"
  }
}
```

---

## أكواد الأخطاء المخصصة

| الكود | الوصف | HTTP Status |
|-------|-------|-------------|
| AUTH_REQUIRED | مصادقة مطلوبة | 401 |
| FORBIDDEN | لا تملك صلاحية | 403 |
| NOT_FOUND | غير موجود | 404 |
| LIMIT_EXCEEDED | تجاوز الحد | 429 |
| INSUFFICIENT_CREDITS | رصيد غير كافٍ | 402 |
| BUILD_IN_PROGRESS | بناء قيد التنفيذ بالفعل | 409 |
| TOKEN_LIMIT_REACHED | حد التوكن وصل | 429 |
| MAX_PROJECTS_REACHED | حد المشاريع وصل | 403 |
| AGENT_ERROR | خطأ في الوكيل | 500 |
| AI_API_ERROR | خطأ في واجهة الذكاء الاصطناعي | 502 |

---

## أحداث الوقت الفعلي (Server-Sent Events)

لتحديث المعاينة وسجل التنفيذ بدون إعادة تحميل الصفحة:

```
GET /api/build/:buildId/events (SSE)

أنواع الأحداث:
├── task_started   { taskId, agent, file }
├── task_completed { taskId, agent, file, tokensUsed }
├── task_failed    { taskId, agent, error }
├── file_ready     { fileId, filePath }
├── build_completed { projectId, totalTokens, totalCost }
└── build_failed    { projectId, error }
```

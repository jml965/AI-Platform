# مخطط قاعدة البيانات — Database Schema Design

---

## نظرة عامة

جميع الجداول تستخدم PostgreSQL + Drizzle ORM. كل جدول يتبع المعايير التالية:
- `id` من نوع UUID كمفتاح أساسي
- `created_at` و `updated_at` لتتبع التواريخ
- العلاقات الخارجية مع `ON DELETE CASCADE` عند الحاجة

---

## الجداول

### 1. users — المستخدمون

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID (PK) | معرّف فريد |
| replit_id | VARCHAR UNIQUE | معرّف Replit Auth |
| email | VARCHAR UNIQUE | البريد الإلكتروني |
| display_name | VARCHAR | اسم العرض |
| avatar_url | VARCHAR | رابط الصورة |
| locale | VARCHAR(5) | اللغة المفضلة (ar / en) |
| daily_limit_usd | DECIMAL(10,2) | الحد اليومي بالدولار (افتراضي: 10) |
| monthly_limit_usd | DECIMAL(10,2) | الحد الشهري بالدولار (افتراضي: 50) |
| created_at | TIMESTAMP | تاريخ الإنشاء |
| updated_at | TIMESTAMP | تاريخ آخر تحديث |

### 2. teams — الفرق

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID (PK) | معرّف الفريق |
| name | VARCHAR | اسم الفريق |
| owner_id | UUID (FK → users) | مالك الفريق |
| created_at | TIMESTAMP | تاريخ الإنشاء |
| updated_at | TIMESTAMP | تاريخ آخر تحديث |

### 3. team_members — أعضاء الفرق

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID (PK) | معرّف العضوية |
| team_id | UUID (FK → teams) | الفريق |
| user_id | UUID (FK → users) | المستخدم |
| role | ENUM('admin','developer','reviewer','viewer') | الدور |
| invited_at | TIMESTAMP | تاريخ الدعوة |
| accepted_at | TIMESTAMP NULL | تاريخ القبول |
| created_at | TIMESTAMP | تاريخ الإنشاء |

### 4. projects — المشاريع

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID (PK) | معرّف المشروع |
| user_id | UUID (FK → users) | المالك |
| team_id | UUID (FK → teams) NULL | الفريق (اختياري) |
| name | VARCHAR | اسم المشروع |
| description | TEXT | وصف المشروع |
| status | ENUM('draft','building','ready','failed') | الحالة |
| total_tokens_used | INTEGER | إجمالي التوكن المستخدم |
| total_cost_usd | DECIMAL(10,4) | إجمالي التكلفة |
| created_at | TIMESTAMP | تاريخ الإنشاء |
| updated_at | TIMESTAMP | تاريخ آخر تحديث |

### 5. project_files — ملفات المشروع

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID (PK) | معرّف الملف |
| project_id | UUID (FK → projects) | المشروع |
| file_path | VARCHAR | مسار الملف (مثل: index.html) |
| content | TEXT | محتوى الملف |
| file_type | VARCHAR | نوع الملف (html, css, js) |
| version | INTEGER | رقم النسخة |
| created_at | TIMESTAMP | تاريخ الإنشاء |
| updated_at | TIMESTAMP | تاريخ آخر تحديث |

### 6. build_tasks — مهام البناء

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID (PK) | معرّف المهمة |
| project_id | UUID (FK → projects) | المشروع |
| agent_type | ENUM('codegen','reviewer','fixer','filemanager') | نوع الوكيل |
| status | ENUM('pending','in_progress','completed','failed') | الحالة |
| input_prompt | TEXT | المدخلات للوكيل |
| output_content | TEXT NULL | المخرجات |
| target_file | VARCHAR | الملف المستهدف |
| tokens_used | INTEGER | التوكن المستخدم |
| cost_usd | DECIMAL(10,4) | التكلفة |
| retry_count | INTEGER DEFAULT 0 | عدد المحاولات |
| duration_ms | INTEGER NULL | مدة التنفيذ بالميلي ثانية |
| error_message | TEXT NULL | رسالة الخطأ (إن وجدت) |
| created_at | TIMESTAMP | تاريخ الإنشاء |
| completed_at | TIMESTAMP NULL | تاريخ الإنتهاء |

### 7. execution_logs — سجل التنفيذ

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID (PK) | معرّف السجل |
| project_id | UUID (FK → projects) | المشروع |
| task_id | UUID (FK → build_tasks) NULL | المهمة |
| agent_type | VARCHAR | نوع الوكيل |
| action | VARCHAR | نوع العملية (generate, review, fix) |
| status | VARCHAR | النتيجة (success, failure) |
| details | JSONB | تفاصيل إضافية |
| tokens_used | INTEGER | التوكن |
| duration_ms | INTEGER | المدة |
| created_at | TIMESTAMP | التاريخ |

### 8. token_usage — استهلاك التوكن

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID (PK) | معرّف |
| user_id | UUID (FK → users) | المستخدم |
| project_id | UUID (FK → projects) | المشروع |
| agent_type | VARCHAR | نوع الوكيل |
| model_name | VARCHAR | اسم النموذج (gpt-4, claude-3.5) |
| tokens_input | INTEGER | توكن المدخلات |
| tokens_output | INTEGER | توكن المخرجات |
| cost_usd | DECIMAL(10,6) | التكلفة |
| created_at | TIMESTAMP | التاريخ |

### 9. plans — خطط الاشتراك

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID (PK) | معرّف الخطة |
| name | VARCHAR | اسم الخطة |
| name_ar | VARCHAR | الاسم بالعربية |
| price_monthly_usd | DECIMAL(10,2) | السعر الشهري |
| max_projects | INTEGER | الحد الأقصى للمشاريع |
| monthly_token_limit | INTEGER | حد التوكن الشهري |
| features | JSONB | الميزات المضمنة |
| is_active | BOOLEAN | هل الخطة متاحة |
| created_at | TIMESTAMP | تاريخ الإنشاء |

### 10. subscriptions — الاشتراكات

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID (PK) | معرّف |
| user_id | UUID (FK → users) | المستخدم |
| plan_id | UUID (FK → plans) | الخطة |
| stripe_subscription_id | VARCHAR | معرّف Stripe |
| status | ENUM('active','cancelled','past_due','trialing') | الحالة |
| current_period_start | TIMESTAMP | بداية الفترة الحالية |
| current_period_end | TIMESTAMP | نهاية الفترة الحالية |
| created_at | TIMESTAMP | تاريخ الإنشاء |

### 11. invoices — الفواتير

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID (PK) | معرّف |
| user_id | UUID (FK → users) | المستخدم |
| stripe_invoice_id | VARCHAR | معرّف Stripe |
| amount_usd | DECIMAL(10,2) | المبلغ |
| status | ENUM('paid','pending','failed') | الحالة |
| description | TEXT | الوصف |
| paid_at | TIMESTAMP NULL | تاريخ الدفع |
| created_at | TIMESTAMP | تاريخ الإنشاء |

### 12. credits_ledger — سجل الرصيد

| العمود | النوع | الوصف |
|--------|-------|-------|
| id | UUID (PK) | معرّف |
| user_id | UUID (FK → users) | المستخدم |
| type | ENUM('credit','debit') | نوع الحركة |
| amount_usd | DECIMAL(10,4) | المبلغ |
| balance_after | DECIMAL(10,4) | الرصيد بعد الحركة |
| reason | VARCHAR | السبب (topup, ai_usage, refund) |
| reference_id | UUID NULL | مرجع (invoice_id أو task_id) |
| created_at | TIMESTAMP | التاريخ |

---

## مخطط العلاقات (ERD Summary)

```
users ──1:N──► projects
users ──1:N──► teams (owner)
users ──1:N──► subscriptions
users ──1:N──► token_usage
users ──1:N──► credits_ledger
users ──1:N──► invoices

teams ──1:N──► team_members
teams ──1:N──► projects

projects ──1:N──► project_files
projects ──1:N──► build_tasks
projects ──1:N──► execution_logs
projects ──1:N──► token_usage

build_tasks ──1:N──► execution_logs

plans ──1:N──► subscriptions
```

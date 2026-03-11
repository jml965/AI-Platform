#!/bin/bash
# ============================================
# سكربت نشر منصة البناء الذكي
# AI Platform Deployment Script
# ============================================

set -e

echo "=========================================="
echo "  منصة البناء الذكي - سكربت النشر"
echo "=========================================="

# --- المتطلبات ---
echo ""
echo "[1/6] التحقق من المتطلبات..."

if ! command -v node &> /dev/null; then
    echo "⚠ Node.js غير مثبت. جاري التثبيت..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v npm &> /dev/null; then
    echo "⚠ npm غير مثبت."
    exit 1
fi

NODE_VER=$(node -v)
echo "✓ Node.js: $NODE_VER"
echo "✓ npm: $(npm -v)"

# --- استنساخ المشروع ---
echo ""
echo "[2/6] تجهيز ملفات المشروع..."

APP_DIR="/opt/ai-platform"

if [ -d "$APP_DIR" ]; then
    echo "→ تحديث المشروع الموجود..."
    cd "$APP_DIR"
    git pull origin main 2>/dev/null || true
else
    echo "→ استنساخ المشروع..."
    sudo mkdir -p "$APP_DIR"
    sudo chown $USER:$USER "$APP_DIR"
    git clone https://github.com/jml965/AI-Platform.git "$APP_DIR"
    cd "$APP_DIR"
fi

# --- تثبيت الحزم ---
echo ""
echo "[3/6] تثبيت الحزم..."
npm install --production=false

# --- متغيرات البيئة ---
echo ""
echo "[4/6] إعداد متغيرات البيئة..."

ENV_FILE="$APP_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "→ إنشاء ملف .env ..."
    cat > "$ENV_FILE" << 'ENVEOF'
# === مفاتيح API المطلوبة ===
# مفتاح OpenAI (للوكيل Coder + Repair)
OPENAI_API_KEY=sk-your-openai-key-here

# مفتاح Anthropic (للوكيل Planner + Reviewer)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# مفتاح الجلسة
SESSION_SECRET=change-this-to-random-string

# GitHub Token (اختياري - للرفع إلى GitHub)
GITHUB_TOKEN=

# إعدادات السيرفر
NODE_ENV=production
PORT=5000
ENVEOF

    echo ""
    echo "⚠ يرجى تعديل ملف .env وإضافة مفاتيح API:"
    echo "  nano $ENV_FILE"
    echo ""
fi

# --- بناء المشروع ---
echo ""
echo "[5/6] بناء المشروع..."
npm run build 2>/dev/null || echo "→ سيعمل في وضع التطوير"

# --- إعداد systemd ---
echo ""
echo "[6/6] إعداد الخدمة..."

SERVICE_FILE="/etc/systemd/system/ai-platform.service"

sudo tee "$SERVICE_FILE" > /dev/null << SERVICEEOF
[Unit]
Description=AI Platform - منصة البناء الذكي
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=$(which node) node_modules/.bin/tsx server/index.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICEEOF

sudo systemctl daemon-reload
sudo systemctl enable ai-platform
sudo systemctl restart ai-platform

echo ""
echo "=========================================="
echo "  ✓ تم النشر بنجاح!"
echo "=========================================="
echo ""
echo "  المنصة تعمل على: http://$(hostname -I | awk '{print $1}'):5000"
echo ""
echo "  أوامر مفيدة:"
echo "    sudo systemctl status ai-platform    # حالة الخدمة"
echo "    sudo systemctl restart ai-platform   # إعادة تشغيل"
echo "    sudo systemctl stop ai-platform      # إيقاف"
echo "    sudo journalctl -u ai-platform -f    # مشاهدة السجلات"
echo ""
echo "  ⚠ لا تنسى تعديل ملف .env بمفاتيح API:"
echo "    nano $APP_DIR/.env"
echo ""

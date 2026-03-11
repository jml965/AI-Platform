
# Deployment Runbook

## Recommended Target
vps-docker-nginx

## Fallback Target
cloud-run

## Startup Command
NODE_ENV=production node dist/index.cjs

## Ports
3000, 8080, 80, 4000

## Healthcheck
/api/health

## Steps
1. Validate environment variables — راجع متغيرات البيئة المطلوبة وحدد PORT=3000 والقيم الحساسة في مزود الأسرار.
2. Run production build — شغّل build إنتاجي وتحقق أن startup command يعمل بدون أخطاء.
3. Build Docker image — ابنِ صورة Docker نهائية للمشروع مع تثبيت نسخة Node ثابتة.
4. Run container on VPS — شغّل الحاوية على المنفذ 3000 واربطها عبر Nginx reverse proxy.
5. Enable health checks and restart policy — فعّل restart policy وراقب endpoint الصحة بعد النشر.

Generated automatically by Deployment Intelligence.

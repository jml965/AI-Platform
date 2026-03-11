export class NginxConfigGenerator {
  build(params: { domain?: string; upstreamPort: number; projectId: string }) {
    const serverName = params.domain?.trim() || "_";

    return `
server {
  listen 80;
  server_name ${serverName};

  location / {
    proxy_pass http://127.0.0.1:${params.upstreamPort};
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }

  access_log /var/log/nginx/${params.projectId}.access.log;
  error_log /var/log/nginx/${params.projectId}.error.log;
}
`.trim();
  }
}

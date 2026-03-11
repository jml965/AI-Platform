export class ProvisionScriptBuilder {
  build(params: {
    projectId: string;
    remotePath: string;
    appPort: number;
    domain?: string;
  }): string {
    return `#!/bin/bash
set -e

echo "Provisioning ${params.projectId}..."

cp ${params.remotePath}/deploy/nginx.conf /etc/nginx/sites-available/${params.projectId}.conf
ln -sf /etc/nginx/sites-available/${params.projectId}.conf /etc/nginx/sites-enabled/${params.projectId}.conf

nginx -t && systemctl reload nginx

echo "Nginx configured for ${params.domain || params.projectId}"

cd ${params.remotePath}

if [ -f "Dockerfile" ]; then
  docker build -t ${params.projectId} .
  docker stop ${params.projectId} 2>/dev/null || true
  docker rm ${params.projectId} 2>/dev/null || true
  docker run -d --name ${params.projectId} -p ${params.appPort}:80 ${params.projectId}
  echo "Container started on port ${params.appPort}"
elif [ -f "package.json" ]; then
  npm install --production
  npm start &
  echo "Node app started"
else
  echo "Static site deployed via nginx"
fi

echo "Provisioning complete."
`;
  }
}

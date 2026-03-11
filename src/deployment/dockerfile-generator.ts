import { RuntimeType } from "./app-runtime-detector";

export class DockerfileGenerator {
  build(runtime: RuntimeType): string {
    if (runtime === "static-site") {
      return `
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
`;
    }

    if (runtime === "node-app") {
      return `
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm","start"]
`;
    }

    if (runtime === "react-app") {
      return `
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve","-s","build"]
`;
    }

    return `
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
`;
  }
}

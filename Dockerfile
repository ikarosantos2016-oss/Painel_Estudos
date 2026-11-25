FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build:css && npm run build

FROM nginx:alpine
COPY --from=build /app/src/ /usr/share/nginx/html/
COPY --from=build /app/dist/ /usr/share/nginx/dist/
COPY imagens/ /usr/share/nginx/imagens/
COPY nginx.default.conf /etc/nginx/conf.d/default.conf
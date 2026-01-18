# Estágio 1: Build (Gera os arquivos estáticos do React)
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio 2: Produção (Nginx servindo o React)
FROM nginx:alpine

# 1. Remove a configuração padrão do Nginx para evitar conflitos
RUN rm /etc/nginx/conf.d/default.conf

# 2. Copia a SUA configuração (que você moveu para a pasta frontend)
COPY default.conf /etc/nginx/conf.d/default.conf

# 3. Copia os arquivos do React gerados no Estágio 1 para a pasta do Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# 4. Expõe a porta 80
EXPOSE 80

# 5. Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]
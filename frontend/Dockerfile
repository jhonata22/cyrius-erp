# Estágio 1: Build do React
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio 2: Servindo com Nginx
FROM nginx:stable-alpine
# Copia o build para a pasta que o Nginx usa para servir arquivos
COPY --from=build /app/dist /usr/share/nginx/html
# Copiaremos a configuração do Nginx no próximo passo
EXPOSE 80
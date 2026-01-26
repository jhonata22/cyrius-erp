FROM node:20-alpine

WORKDIR /app

# Instala dependências do sistema
RUN apk add --no-cache xdg-utils

# Expõe a porta que o Vite usa
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
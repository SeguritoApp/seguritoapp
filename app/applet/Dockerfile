FROM node:22-alpine

WORKDIR /app

# Copiamos package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalamos dependencias limpias
RUN npm ci

# Copiamos el resto del código
COPY . .

# Construimos el frontend y el backend
RUN npm run build

# Exponemos el puerto 3000 (Cloud Run automáticamente inyecta la variable PORT, pero 3000 es nuestro default interno)
EXPOSE 3000
ENV PORT=3000

# Iniciamos el servidor de producción (node dist/server.cjs)
CMD ["npm", "start"]

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5002
CMD ["sh", "-c", "npm run build && npm run preview -- --host"]
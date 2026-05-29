FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p uploads/car-images uploads/documents uploads/parts
EXPOSE 5000
CMD ["node", "src/app.js"]

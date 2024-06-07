FROM node:20.11.0-alpine3.18
WORKDIR /usr/src/app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 9999
CMD [ "npm", "start" ]
FROM node:lts

RUN apt update && apt install build-essential -y
RUN npm install -g nodemon
WORKDIR /usr/src/app
COPY package.json ./
COPY packages/pipeline/package.json ./packages/pipeline/
COPY packages/common/package.json ./packages/common/
COPY packages/http_server/package.json ./packages/http_server/
RUN yarn install
COPY . .
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
CMD npm run prod:pipeline
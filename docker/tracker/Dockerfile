FROM node:lts

RUN apt update && apt install build-essential -y
RUN npm install -g nodemon
WORKDIR /usr/src/app
COPY package.json ./
COPY packages/tracker/package.json ./packages/tracker/
COPY packages/common/package.json ./packages/common/
RUN yarn install
COPY . .
COPY packages/tracker/mmdb /usr/lib/mmdb
ENV HOST=0.0.0.0
ENV PORT=80
EXPOSE 80
CMD npx tsx watch --clear-screen=false -- packages/tracker/index.ts
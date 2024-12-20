FROM node:lts

RUN apt update && apt install build-essential net-tools -y
WORKDIR /usr/src/app
COPY package.json ./
COPY packages/consolidator/package.json ./packages/consolidator/
COPY packages/common/package.json ./packages/common/
RUN yarn install
COPY . .
CMD node --watch packages/consolidator/index.js
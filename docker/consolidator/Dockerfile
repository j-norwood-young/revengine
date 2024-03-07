FROM node:lts

RUN apt update && apt install build-essential -y
RUN npm install -g nodemon
WORKDIR /usr/src/app
COPY package.json ./
COPY packages/consolidator/package.json ./packages/consolidator/
COPY packages/common/package.json ./packages/common/
RUN yarn install
COPY . .
CMD npm run prod:consolidator
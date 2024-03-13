FROM node:lts

RUN apt update && apt install build-essential -y
RUN npm install -g nodemon
WORKDIR /usr/src/app
COPY package.json ./
COPY packages/wordpress_api/package.json ./packages/wordpress_api/
COPY packages/common/package.json ./packages/common/
COPY packages/reports/package.json ./packages/reports/
RUN yarn install
COPY . .
ENV HOST=0.0.0.0
ENV PORT=4030
EXPOSE 4030
CMD npm run prod:wordpress_api
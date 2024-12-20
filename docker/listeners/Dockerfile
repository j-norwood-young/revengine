FROM node:lts

RUN apt update && apt install build-essential -y
RUN npm install -g nodemon
WORKDIR /usr/src/app
COPY package.json ./
COPY packages/listeners/package.json ./packages/listeners/
COPY packages/common/package.json ./packages/common/
COPY packages/http_server/package.json ./packages/http_server/
COPY packages/reports/package.json ./packages/reports/
COPY packages/mailer/package.json ./packages/mailer/
COPY packages/sync/package.json ./packages/sync/
COPY packages/ml/package.json ./packages/ml/
COPY packages/wordpress-auth/package.json ./packages/wordpress-auth/
COPY packages/autogen_newsletter/package.json ./packages/autogen_newsletter/
RUN yarn install
COPY . .
CMD ["node", "--watch", "packages/listeners/index.js"]
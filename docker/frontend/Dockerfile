FROM node:lts

RUN apt update && apt install build-essential -y
RUN npm install -g nodemon
WORKDIR /usr/src/app
COPY package.json ./
COPY packages/common/package.json ./packages/common/
COPY packages/reports/package.json ./packages/reports/
COPY packages/mailer/package.json ./packages/mailer/
COPY packages/wordpress-auth/package.json ./packages/wordpress-auth/
COPY packages/http_server/package.json ./packages/http_server/
COPY packages/article_ml/package.json ./packages/article_ml/
COPY packages/frontend/package.json ./packages/frontend/
RUN yarn install
COPY . .
RUN cd packages/frontend && yarn build
ENV HOST=0.0.0.0
ENV PORT=4014
EXPOSE 4014
CMD npm run prod:frontend
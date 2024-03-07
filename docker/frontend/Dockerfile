FROM node:lts

RUN apt update && apt install build-essential -y
RUN npm install -g nodemon
WORKDIR /usr/src/app
COPY . .
RUN yarn install
ENV HOST=0.0.0.0
ENV PORT=4014
EXPOSE 4014
CMD npm run prod:frontend
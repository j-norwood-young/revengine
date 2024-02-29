FROM node:lts

RUN apt update && apt install build-essential -y
RUN npm install -g nodemon
RUN mkdir -p /usr/src/app/logs
WORKDIR /usr/src/app
COPY . .
RUN yarn install
ENV HOST=0.0.0.0
ENV PORT=3014
EXPOSE 3014
CMD npm run dev:frontend
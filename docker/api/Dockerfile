FROM node:20

RUN apt update && apt install build-essential -y
WORKDIR /usr/src/app
COPY package.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/common/package.json ./packages/common/
RUN yarn install
COPY . .
ENV HOST=0.0.0.0
ENV PORT=4001
EXPOSE 4001
CMD node --max-old-space-size=6144 --watch packages/api
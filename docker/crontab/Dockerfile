FROM node:bookworm

RUN curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
 gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
--dearmor
RUN echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
RUN apt update && apt install mongodb-org awscli build-essential -y
WORKDIR /usr/src/app
ENV WORKDIR=/usr/src/app
COPY . .
RUN yarn install
CMD node packages/cron
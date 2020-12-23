FROM node:lts-alpine

WORKDIR /app

ADD . .

VOLUME /data

RUN apk add --no-cache --virtual .build python3 make g++ && npm i && apk del .build

CMD node_modules/.bin/ts-node bin/record-snapshot.ts
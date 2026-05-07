FROM node:lts-alpine
MAINTAINER totalplatform "info@totaljs.com"

RUN apk add --no-cache ffmpeg tini bash

VOLUME /www
WORKDIR /www
RUN mkdir -p /www/bundles

COPY index.js .
COPY config .
COPY package.json .
COPY /--bundles--/app.bundle ./bundles/
COPY /--bundles--/bookmarks.bundle ./bundles/

RUN npm install
EXPOSE 8000

ENTRYPOINT ["/sbin/tini", "--"]
CMD [ "/bin/bash", "-c", "mkdir -p logs; npm i; npm start 2>&1 | tee logs/debug.log" ]
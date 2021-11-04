FROM node:16-alpine
MAINTAINER totalplatform "info@totaljs.com"

VOLUME /www
WORKDIR /www
RUN mkdir -p /www/packages

COPY index.js .
COPY config .
COPY package.json .
COPY ./packages/flow.package ./packages/flow.package

RUN npm install
EXPOSE 8000

CMD [ "npm", "start" ]
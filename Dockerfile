FROM node:10-alpine

MAINTAINER dev@adex.network

ENV PORT=
ENV DB_MONGO_URL=
ENV DB_MONGO_NAME=

RUN apk add --update alpine-sdk
RUN apk add --update python

WORKDIR /app 

EXPOSE ${PORT}

ADD . .

RUN npm install --production

CMD PORT=${PORT} node index.js 

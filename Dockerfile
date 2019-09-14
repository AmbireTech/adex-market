FROM node:10-alpine

MAINTAINER dev@adex.network

ENV PORT=
ENV DB_MONGO_URL=
ENV DB_MONGO_NAME=

RUN apk add --update alpine-sdk
RUN apk add --update python

COPY cloudflare_origin.crt /usr/local/share/ca-certificates/

RUN update-ca-certificates

ENV NODE_EXTRA_CA_CERTS=/usr/local/share/ca-certificates/cloudflare_origin.crt

WORKDIR /app 

EXPOSE ${PORT}

ADD . .

RUN npm install --production

CMD PORT=${PORT} node index.js 

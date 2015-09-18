FROM alpine:latest
MAINTAINER me@gbraad.nl

RUN apk add --update nodejs

COPY . /app
RUN cd /app && npm install

EXPOSE 4000
CMD cd /app && node server

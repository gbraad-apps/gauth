FROM mhart/alpine-node:9.8
MAINTAINER me@gbraad.nl

COPY . /app
WORKDIR /app

RUN npm install

EXPOSE 8080
ENV IPADDR=0.0.0.0

CMD node server

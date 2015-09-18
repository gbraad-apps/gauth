FROM mhart/alpine-node:0.10
MAINTAINER me@gbraad.nl

COPY . /app
RUN cd /app && npm install

EXPOSE 4000
CMD cd /app && node server

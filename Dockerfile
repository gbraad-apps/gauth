FROM node:0.10

COPY . /app
RUN cd /app && npm install

EXPOSE 4000
CMD cd /app && node server

FROM node:10.19.0-alpine

ENV NODE_ENV production

RUN mkdir -p /app
WORKDIR /app

COPY . ./

RUN yarn

EXPOSE 3005

ENTRYPOINT ["npm", "start"]

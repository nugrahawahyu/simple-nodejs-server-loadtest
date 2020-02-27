FROM node:9-alpine

RUN apk update && apk upgrade && \
  apk add --no-cache git

ENV NODE_ENV production

RUN mkdir -p /app
WORKDIR /app

COPY . ./

RUN yarn

EXPOSE 3004

ENTRYPOINT ["npm", "start"]

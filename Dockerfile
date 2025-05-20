FROM node:hydrogen-alpine as builder

WORKDIR /usr/src/app

COPY ./package.json .
COPY ./yarn.lock .

RUN yarn

COPY . .

RUN yarn build

FROM node:hydrogen-alpine as production

WORKDIR /app

COPY ./package.json .

RUN yarn

COPY --from=builder /usr/src/app/.build .build

CMD ["yarn", "start"]
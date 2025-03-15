FROM node:lts

WORKDIR /app

COPY . .

WORKDIR /app/frontend

RUN npm install

RUN npm run build && mkdir -p dist

WORKDIR /app

RUN cp -r frontend/dist backend/src
RUN cp -r frontend/public backend/src

RUN rm -rf frontend

WORKDIR /app/backend

RUN npm install
RUN npm install -g prisma

EXPOSE 3002

CMD npx prisma migrate deploy && npx prisma generate && npx prisma db push --accept-data-loss && npm run dev
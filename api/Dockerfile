FROM golang:1.25-alpine AS build

WORKDIR /src

RUN apk add --no-cache ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/api .

FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=build /out/api ./api
COPY --from=build /src/notifications.yaml ./notifications.yaml
COPY --from=build /src/crons.yaml ./crons.yaml

ENV GIN_MODE=release
ENV PORT=8080
ENV API_COMMAND=serve

EXPOSE 8080

CMD ["sh", "-c", "./api ${API_COMMAND:-serve}"]

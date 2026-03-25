FROM golang:1.25-alpine AS build

WORKDIR /src

RUN apk add --no-cache ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w" -o /out/realtime-gateway .

FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=build /out/realtime-gateway ./realtime-gateway

ENV GIN_MODE=release
ENV PORT=8090

EXPOSE 8090

CMD ["./realtime-gateway"]

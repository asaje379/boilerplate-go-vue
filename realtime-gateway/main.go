package main

import (
	"context"
	"log"
	"os/signal"
	"syscall"

	"realtime-gateway/internal/bootstrap"
	"realtime-gateway/internal/platform/config"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config loading failed: %v", err)
	}

	app, err := bootstrap.NewApplication(cfg)
	if err != nil {
		log.Fatalf("application bootstrap failed: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	if err := app.Run(ctx); err != nil {
		log.Fatalf("gateway shutdown failed: %v", err)
	}
}

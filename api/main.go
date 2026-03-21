package main

import (
	"log"
	"os"

	_ "api/docs"
	"api/internal/bootstrap"
	"api/internal/platform/config"
	_ "github.com/joho/godotenv/autoload"
)

// @title Boilerplate Go Vue API
// @version 1.0
// @description API server built with Gin, Gorm, Postgres, JWT auth, refresh tokens, and Swaggo.
// @BasePath /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Use `Bearer <token>`.
func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config loading failed: %v", err)
	}

	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	switch command {
	case "serve":
		runServer(cfg)
	case "worker":
		log.Printf("starting api worker")
		if err := bootstrap.RunWorker(cfg); err != nil {
			log.Fatalf("worker command failed: %v", err)
		}
	case "migrate":
		if err := bootstrap.RunMigrations(cfg); err != nil {
			log.Fatalf("migration command failed: %v", err)
		}
		log.Print("migrations applied")
	case "seed":
		if err := bootstrap.RunSeeds(cfg); err != nil {
			log.Fatalf("seed command failed: %v", err)
		}
		log.Print("seeds applied")
	default:
		log.Fatalf("unknown command %q\nusage: %s [serve|worker|migrate|seed]", command, os.Args[0])
	}
}

func runServer(cfg config.Config) {
	app, err := bootstrap.NewApplication(cfg)
	if err != nil {
		log.Fatalf("application bootstrap failed: %v", err)
	}

	if err := app.Run(); err != nil {
		log.Fatalf("server startup failed: %v", err)
	}
}

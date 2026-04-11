package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/exec"
	"os/signal"
	"syscall"
	"time"

	_ "api/docs"
	"api/internal/bootstrap"
	"api/internal/platform/config"
	_ "github.com/joho/godotenv/autoload"
)

const swagCliVersion = "v1.16.6"

// @title Boilerplate Go Vue API
// @version 1.0
// @description API server built with Gin, Gorm, Postgres, JWT auth, refresh tokens, and Swaggo.
// @BasePath /
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Use `Bearer <token>`.
func main() {
	command := "serve"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	switch command {
	case "swagger":
		if err := runSwagger(); err != nil {
			log.Fatalf("swagger command failed: %v", err)
		}
		log.Print("swagger docs generated")
	case "serve":
		cfg, err := config.Load()
		if err != nil {
			log.Fatalf("config loading failed: %v", err)
		}
		runServer(cfg)
	case "worker":
		cfg, err := config.Load()
		if err != nil {
			log.Fatalf("config loading failed: %v", err)
		}
		log.Printf("starting api worker")
		if err := runWorker(cfg); err != nil {
			log.Fatalf("worker command failed: %v", err)
		}
	case "migrate":
		cfg, err := config.Load()
		if err != nil {
			log.Fatalf("config loading failed: %v", err)
		}
		if err := bootstrap.RunMigrations(cfg); err != nil {
			log.Fatalf("migration command failed: %v", err)
		}
		log.Print("migrations applied")
	case "seed":
		cfg, err := config.Load()
		if err != nil {
			log.Fatalf("config loading failed: %v", err)
		}
		if err := bootstrap.RunSeeds(cfg); err != nil {
			log.Fatalf("seed command failed: %v", err)
		}
		log.Print("seeds applied")
	default:
		log.Fatalf("unknown command %q\nusage: %s [serve|worker|migrate|seed|swagger]", command, os.Args[0])
	}
}

func runSwagger() error {
	cmd := exec.Command("go", "run", "github.com/swaggo/swag/cmd/swag@"+swagCliVersion, "init", "-g", "main.go")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	return cmd.Run()
}

func runWorker(cfg config.Config) error {
	if !cfg.WorkerHTTPEnabled {
		return bootstrap.RunWorker(cfg)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	healthServer := &http.Server{
		Addr:    ":" + cfg.WorkerHTTPPort,
		Handler: workerHealthHandler(),
	}

	errCh := make(chan error, 2)
	go func() {
		if err := healthServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
	}()

	go func() {
		errCh <- bootstrap.RunWorker(cfg)
	}()

	select {
	case <-ctx.Done():
	case err := <-errCh:
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = healthServer.Shutdown(shutdownCtx)
		return err
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := healthServer.Shutdown(shutdownCtx); err != nil {
		return err
	}
	return nil
}

func workerHealthHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/health", func(writer http.ResponseWriter, request *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		writer.WriteHeader(http.StatusOK)
		_, _ = writer.Write([]byte(`{"status":"ok","service":"worker"}`))
	})
	return mux
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

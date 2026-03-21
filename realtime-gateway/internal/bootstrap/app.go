package bootstrap

import (
	"context"
	"fmt"
	"net/http"
	"time"

	appauth "realtime-gateway/internal/application/auth"
	apprealtime "realtime-gateway/internal/application/realtime"
	"realtime-gateway/internal/interfaces/http/router"
	"realtime-gateway/internal/platform/broker"
	"realtime-gateway/internal/platform/config"
)

type Application struct {
	cfg      config.Config
	server   *http.Server
	consumer *broker.Consumer
	registry *apprealtime.Registry
}

func NewApplication(cfg config.Config) (*Application, error) {
	registry := apprealtime.NewRegistry()
	authService := appauth.NewService(cfg.JWTSecret)
	handler := router.New(authService, registry, cfg)
	consumer := broker.NewConsumer(cfg.RabbitMQURL, cfg.RabbitMQRealtimeExchange, cfg.QueueName(), cfg.InstanceID)

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	return &Application{cfg: cfg, server: server, consumer: consumer, registry: registry}, nil
}

func (a *Application) Run(ctx context.Context) error {
	consumerErrCh := make(chan error, 1)
	go func() {
		consumerErrCh <- a.consumer.Run(ctx, func(event broker.Event) error {
			a.registry.Broadcast(apprealtime.Event(event))
			return nil
		})
	}()

	serverErrCh := make(chan error, 1)
	go func() {
		if err := a.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			serverErrCh <- err
			return
		}
		serverErrCh <- nil
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := a.server.Shutdown(shutdownCtx); err != nil {
			return err
		}
		return nil
	case err := <-consumerErrCh:
		if err != nil && ctx.Err() == nil {
			return fmt.Errorf("broker consumer failed: %w", err)
		}
		return nil
	case err := <-serverErrCh:
		return err
	}
}

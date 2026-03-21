package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

type Config struct {
	Port                     string
	JWTSecret                string
	RabbitMQURL              string
	RabbitMQRealtimeExchange string
	CORSAllowedOrigins       []string
	InstanceID               string
	QueuePrefix              string
	HeartbeatInterval        time.Duration
	WriteTimeout             time.Duration
}

func Load() (Config, error) {
	cfg := Config{
		Port:                     getEnv("PORT", "8090"),
		JWTSecret:                strings.TrimSpace(os.Getenv("JWT_SECRET")),
		RabbitMQURL:              strings.TrimSpace(os.Getenv("RABBITMQ_URL")),
		RabbitMQRealtimeExchange: getEnv("RABBITMQ_REALTIME_EXCHANGE", "boilerplate.realtime"),
		CORSAllowedOrigins:       splitCSV(os.Getenv("CORS_ALLOWED_ORIGINS")),
		InstanceID:               getEnv("REALTIME_INSTANCE_ID", hostnameOr("realtime-gateway")),
		QueuePrefix:              getEnv("REALTIME_QUEUE_PREFIX", "realtime-gateway"),
		HeartbeatInterval:        mustDuration("REALTIME_HEARTBEAT_SECONDS", 25*time.Second),
		WriteTimeout:             mustDuration("REALTIME_WRITE_TIMEOUT_SECONDS", 10*time.Second),
	}

	if cfg.JWTSecret == "" {
		return Config{}, fmt.Errorf("JWT_SECRET is required")
	}
	if cfg.RabbitMQURL == "" {
		return Config{}, fmt.Errorf("RABBITMQ_URL is required")
	}

	return cfg, nil
}

func (c Config) QueueName() string {
	prefix := strings.Trim(strings.TrimSpace(c.QueuePrefix), ".")
	if prefix == "" {
		return strings.TrimSpace(c.InstanceID)
	}
	return prefix + "." + strings.TrimSpace(c.InstanceID)
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && strings.TrimSpace(value) != "" {
		return strings.TrimSpace(value)
	}
	return fallback
}

func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func hostnameOr(fallback string) string {
	hostname, err := os.Hostname()
	if err != nil || strings.TrimSpace(hostname) == "" {
		return fallback
	}
	return hostname
}

func mustDuration(envKey string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(envKey))
	if value == "" {
		return fallback
	}
	seconds, err := time.ParseDuration(value + "s")
	if err != nil || seconds <= 0 {
		return fallback
	}
	return seconds
}

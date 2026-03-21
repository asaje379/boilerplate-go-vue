package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Port                         string
	DatabaseURL                  string
	JWTSecret                    string
	AccessTokenTTL               time.Duration
	RefreshTokenTTL              time.Duration
	FileSignedURLTTL             time.Duration
	FileMaxSizeBytes             int64
	LoginOTPTTL                  time.Duration
	PasswordResetOTPTTL          time.Duration
	DefaultAdminName             string
	DefaultAdminEmail            string
	DefaultAdminPass             string
	DefaultUserName              string
	DefaultUserEmail             string
	DefaultUserPass              string
	SwaggerUsername              string
	SwaggerPassword              string
	CORSAllowedOrigins           []string
	RateLimitRPM                 int
	RateLimitBurst               int
	AllowedEmails                []string
	AllowedDomains               []string
	ObjectStorageProvider        string
	ObjectStorageEndpointURL     string
	ObjectStorageAccessKeyID     string
	ObjectStorageSecretAccessKey string
	ObjectStorageBucket          string
	BucketBasePath               string
	ObjectStorageRegion          string
	MinIOEndpoint                string
	MinIOPort                    int
	MinIOUseSSL                  bool
	MinIOPublicURL               string
	MailchimpTransactionalAPIKey string
	MailFromEmail                string
	MailFromName                 string
	DefaultLocale                string
	RabbitMQURL                  string
	RabbitMQTasksExchange        string
	RabbitMQRealtimeExchange     string
	RabbitMQWorkerQueue          string
	RabbitMQWorkerConsumerTag    string
}

func Load() (Config, error) {
	ttlMinutes, err := strconv.Atoi(getEnv("ACCESS_TOKEN_TTL_MINUTES", "60"))
	if err != nil || ttlMinutes <= 0 {
		return Config{}, fmt.Errorf("ACCESS_TOKEN_TTL_MINUTES must be a positive integer")
	}

	refreshTTLMinutes, err := strconv.Atoi(getEnv("REFRESH_TOKEN_TTL_MINUTES", "10080"))
	if err != nil || refreshTTLMinutes <= 0 {
		return Config{}, fmt.Errorf("REFRESH_TOKEN_TTL_MINUTES must be a positive integer")
	}

	rateLimitRPM, err := strconv.Atoi(getEnv("RATE_LIMIT_RPM", "120"))
	if err != nil || rateLimitRPM <= 0 {
		return Config{}, fmt.Errorf("RATE_LIMIT_RPM must be a positive integer")
	}

	rateLimitBurst, err := strconv.Atoi(getEnv("RATE_LIMIT_BURST", "60"))
	if err != nil || rateLimitBurst <= 0 {
		return Config{}, fmt.Errorf("RATE_LIMIT_BURST must be a positive integer")
	}

	fileSignedTTLMinutes, err := strconv.Atoi(getEnv("FILE_SIGNED_URL_TTL_MINUTES", "15"))
	if err != nil || fileSignedTTLMinutes <= 0 {
		return Config{}, fmt.Errorf("FILE_SIGNED_URL_TTL_MINUTES must be a positive integer")
	}

	fileMaxSizeMB, err := strconv.Atoi(getEnv("FILE_MAX_SIZE_MB", "25"))
	if err != nil || fileMaxSizeMB <= 0 {
		return Config{}, fmt.Errorf("FILE_MAX_SIZE_MB must be a positive integer")
	}

	loginOTPTTLMinutes, err := strconv.Atoi(getEnv("LOGIN_OTP_TTL_MINUTES", "10"))
	if err != nil || loginOTPTTLMinutes <= 0 {
		return Config{}, fmt.Errorf("LOGIN_OTP_TTL_MINUTES must be a positive integer")
	}

	passwordResetOTPTTLMinutes, err := strconv.Atoi(getEnv("PASSWORD_RESET_OTP_TTL_MINUTES", "15"))
	if err != nil || passwordResetOTPTTLMinutes <= 0 {
		return Config{}, fmt.Errorf("PASSWORD_RESET_OTP_TTL_MINUTES must be a positive integer")
	}

	minioPort, err := strconv.Atoi(getEnv("MINIO_PORT", "9000"))
	if err != nil || minioPort <= 0 {
		return Config{}, fmt.Errorf("MINIO_PORT must be a positive integer")
	}

	minioUseSSL, err := strconv.ParseBool(getEnv("MINIO_USE_SSL", "false"))
	if err != nil {
		return Config{}, fmt.Errorf("MINIO_USE_SSL must be a boolean")
	}

	cfg := Config{
		Port:                         getEnv("PORT", "8080"),
		DatabaseURL:                  os.Getenv("DATABASE_URL"),
		JWTSecret:                    os.Getenv("JWT_SECRET"),
		AccessTokenTTL:               time.Duration(ttlMinutes) * time.Minute,
		RefreshTokenTTL:              time.Duration(refreshTTLMinutes) * time.Minute,
		FileSignedURLTTL:             time.Duration(fileSignedTTLMinutes) * time.Minute,
		FileMaxSizeBytes:             int64(fileMaxSizeMB) * 1024 * 1024,
		LoginOTPTTL:                  time.Duration(loginOTPTTLMinutes) * time.Minute,
		PasswordResetOTPTTL:          time.Duration(passwordResetOTPTTLMinutes) * time.Minute,
		DefaultAdminName:             getEnv("ADMIN_NAME", "Admin"),
		DefaultAdminEmail:            os.Getenv("ADMIN_EMAIL"),
		DefaultAdminPass:             os.Getenv("ADMIN_PASSWORD"),
		DefaultUserName:              getEnv("SEED_USER_NAME", "User"),
		DefaultUserEmail:             os.Getenv("SEED_USER_EMAIL"),
		DefaultUserPass:              os.Getenv("SEED_USER_PASSWORD"),
		SwaggerUsername:              os.Getenv("SWAGGER_USERNAME"),
		SwaggerPassword:              os.Getenv("SWAGGER_PASSWORD"),
		CORSAllowedOrigins:           splitCSV(os.Getenv("CORS_ALLOWED_ORIGINS")),
		RateLimitRPM:                 rateLimitRPM,
		RateLimitBurst:               rateLimitBurst,
		AllowedEmails:                splitCSV(os.Getenv("REGISTER_ALLOWED_EMAILS")),
		AllowedDomains:               splitCSV(os.Getenv("REGISTER_ALLOWED_DOMAINS")),
		ObjectStorageProvider:        strings.ToLower(getEnv("OBJECT_STORAGE_PROVIDER", defaultStorageProvider())),
		ObjectStorageEndpointURL:     strings.TrimSpace(firstNonEmpty(os.Getenv("AWS_ENDPOINT_URL"), buildMinIOEndpointURL(getEnv("MINIO_ENDPOINT", ""), minioPort, minioUseSSL))),
		ObjectStorageAccessKeyID:     firstNonEmpty(os.Getenv("AWS_ACCESS_KEY_ID"), os.Getenv("MINIO_ACCESS_KEY")),
		ObjectStorageSecretAccessKey: firstNonEmpty(os.Getenv("AWS_SECRET_ACCESS_KEY"), os.Getenv("MINIO_SECRET_KEY")),
		ObjectStorageBucket:          firstNonEmpty(os.Getenv("AWS_S3_BUCKET"), os.Getenv("MINIO_BUCKET_NAME")),
		BucketBasePath:               strings.Trim(strings.TrimSpace(os.Getenv("BUCKET_BASE_PATH")), "/"),
		ObjectStorageRegion:          getEnv("AWS_REGION", "us-east-1"),
		MinIOEndpoint:                getEnv("MINIO_ENDPOINT", ""),
		MinIOPort:                    minioPort,
		MinIOUseSSL:                  minioUseSSL,
		MinIOPublicURL:               strings.TrimSpace(os.Getenv("MINIO_PUBLIC_URL")),
		MailchimpTransactionalAPIKey: strings.TrimSpace(os.Getenv("MAILCHIMP_TRANSACTIONAL_API_KEY")),
		MailFromEmail:                strings.TrimSpace(os.Getenv("MAIL_FROM_EMAIL")),
		MailFromName:                 getEnv("MAIL_FROM_NAME", "Boilerplate API"),
		DefaultLocale:                strings.ToLower(getEnv("DEFAULT_LOCALE", "fr")),
		RabbitMQURL:                  strings.TrimSpace(os.Getenv("RABBITMQ_URL")),
		RabbitMQTasksExchange:        getEnv("RABBITMQ_TASKS_EXCHANGE", "boilerplate.tasks"),
		RabbitMQRealtimeExchange:     getEnv("RABBITMQ_REALTIME_EXCHANGE", "boilerplate.realtime"),
		RabbitMQWorkerQueue:          getEnv("RABBITMQ_WORKER_QUEUE", "api.worker.default"),
		RabbitMQWorkerConsumerTag:    getEnv("RABBITMQ_WORKER_CONSUMER_TAG", "api-worker"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required and must be a full Postgres URL")
	}

	if cfg.JWTSecret == "" {
		return Config{}, fmt.Errorf("JWT_SECRET is required")
	}

	if cfg.SwaggerUsername == "" || cfg.SwaggerPassword == "" {
		return Config{}, fmt.Errorf("SWAGGER_USERNAME and SWAGGER_PASSWORD are required")
	}

	if cfg.ObjectStorageAccessKeyID == "" || cfg.ObjectStorageSecretAccessKey == "" || cfg.ObjectStorageBucket == "" {
		return Config{}, fmt.Errorf("object storage credentials and bucket are required")
	}

	if cfg.ObjectStorageProvider == "minio" && cfg.MinIOEndpoint == "" {
		return Config{}, fmt.Errorf("MINIO_ENDPOINT is required when OBJECT_STORAGE_PROVIDER=minio")
	}

	if cfg.MailchimpTransactionalAPIKey == "" {
		return Config{}, fmt.Errorf("MAILCHIMP_TRANSACTIONAL_API_KEY is required")
	}

	if cfg.MailFromEmail == "" {
		return Config{}, fmt.Errorf("MAIL_FROM_EMAIL is required")
	}

	if cfg.DefaultLocale != "fr" && cfg.DefaultLocale != "en" {
		return Config{}, fmt.Errorf("DEFAULT_LOCALE must be one of: fr, en")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
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

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}

	return ""
}

func defaultStorageProvider() string {
	if strings.TrimSpace(os.Getenv("MINIO_ENDPOINT")) != "" {
		return "minio"
	}

	return "aws"
}

func buildMinIOEndpointURL(endpoint string, port int, useSSL bool) string {
	if strings.TrimSpace(endpoint) == "" {
		return ""
	}

	scheme := "http"
	if useSSL {
		scheme = "https"
	}

	return fmt.Sprintf("%s://%s:%d", scheme, strings.TrimSpace(endpoint), port)
}

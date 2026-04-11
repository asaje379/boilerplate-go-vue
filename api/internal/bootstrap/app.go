package bootstrap

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	appauth "api/internal/application/auth"
	appcommon "api/internal/application/common"
	appfile "api/internal/application/file"
	appnotification "api/internal/application/notification"
	appuser "api/internal/application/user"
	userdomain "api/internal/domain/user"
	"api/internal/infrastructure/persistence/postgres"
	storages3 "api/internal/infrastructure/storage/s3"
	"api/internal/interfaces/http/router"
	platformasync "api/internal/platform/async"
	"api/internal/platform/config"
	platformcron "api/internal/platform/cron"
	platformemail "api/internal/platform/email"
	platformmailer "api/internal/platform/mailer"
	brevomailer "api/internal/platform/mailer/brevo"
	mailchimpmailer "api/internal/platform/mailer/mailchimp"
	smtpmailer "api/internal/platform/mailer/smtp"
	"api/internal/platform/migrations"
	platformnotification "api/internal/platform/notification"
	platformrabbitmq "api/internal/platform/rabbitmq"
	platformrealtime "api/internal/platform/realtime"
	"api/internal/platform/seeder"
	platformwhatsapp "api/internal/platform/whatsapp"
	"api/internal/platform/worker"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Application struct {
	config config.Config
	engine *gin.Engine
	users  postgres.UserRepository
	auth   appauth.Service
	files  appfile.Service
	notifs appnotification.Service
}

func NewApplication(cfg config.Config) (*Application, error) {
	deps, err := newDependencies(cfg)
	if err != nil {
		return nil, err
	}

	if err := deps.runMigrations(); err != nil {
		return nil, err
	}

	app := &Application{
		config: cfg,
		users:  deps.users,
		auth:   deps.auth,
		files:  deps.file,
		notifs: deps.notification,
	}

	app.engine = router.New(cfg, deps.db, deps.auth, deps.user, deps.file, deps.notification)
	return app, nil
}

func RunMigrations(cfg config.Config) error {
	deps, err := newDependencies(cfg)
	if err != nil {
		return err
	}

	return deps.runMigrations()
}

func RunSeeds(cfg config.Config) error {
	deps, err := newDependencies(cfg)
	if err != nil {
		return err
	}

	if err := deps.runMigrations(); err != nil {
		return err
	}

	seedRunner := seeder.New(deps.users, deps.auth, seeder.Config{
		AdminName:     cfg.DefaultAdminName,
		AdminEmail:    cfg.DefaultAdminEmail,
		AdminPassword: cfg.DefaultAdminPass,
		UserName:      cfg.DefaultUserName,
		UserEmail:     cfg.DefaultUserEmail,
		UserPassword:  cfg.DefaultUserPass,
	})

	return seedRunner.Run(context.Background())
}

type dependencies struct {
	db           *gorm.DB
	users        postgres.UserRepository
	auth         appauth.Service
	user         appuser.Service
	file         appfile.Service
	notification appnotification.Service
	config       config.Config
	mailer       platformmailer.Mailer
}

func newDependencies(cfg config.Config) (*dependencies, error) {
	log.Printf(
		"api bootstrap config: rabbitmq_enabled=%t rabbitmq=%s tasks_exchange=%s realtime_exchange=%s worker_queue=%s worker_consumer_tag=%s",
		cfg.RabbitMQURL != "",
		describeAMQPURL(cfg.RabbitMQURL),
		cfg.RabbitMQTasksExchange,
		cfg.RabbitMQRealtimeExchange,
		cfg.RabbitMQWorkerQueue,
		cfg.RabbitMQWorkerConsumerTag,
	)

	emailValidator, err := platformemail.NewValidator(cfg.AllowedEmails, cfg.AllowedDomains)
	if err != nil {
		return nil, err
	}

	db, err := postgres.New(cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}

	userRepository := postgres.NewUserRepository(db)
	fileRepository := postgres.NewFileRepository(db)
	notificationRepository := postgres.NewNotificationRepository(db)
	refreshTokenRepository := postgres.NewRefreshTokenRepository(db)
	emailOTPRepository := postgres.NewEmailOTPRepository(db)
	storage, err := storages3.New(cfg)
	if err != nil {
		return nil, err
	}
	mailer := newMailer(cfg)
	var emailDispatcher platformasync.EmailDispatcher = platformasync.NewDirectEmailDispatcher(mailer)
	var eventPublisher appcommon.EventPublisher = appcommon.NoopEventPublisher{}

	if cfg.RabbitMQURL != "" {
		tasksPublisher, err := platformrabbitmq.NewPublisher(cfg.RabbitMQURL, platformrabbitmq.Exchange{Name: cfg.RabbitMQTasksExchange, Kind: "topic"})
		if err != nil {
			return nil, fmt.Errorf("rabbitmq tasks publisher: %w", err)
		}
		realtimePublisher, err := platformrabbitmq.NewPublisher(cfg.RabbitMQURL, platformrabbitmq.Exchange{Name: cfg.RabbitMQRealtimeExchange, Kind: "topic"})
		if err != nil {
			return nil, fmt.Errorf("rabbitmq realtime publisher: %w", err)
		}
		emailDispatcher = platformasync.NewRabbitMQEmailDispatcher(tasksPublisher, cfg.RabbitMQTasksExchange)
		eventPublisher = platformrealtime.NewPublisher(realtimePublisher, cfg.RabbitMQRealtimeExchange)
	}
	authService := appauth.NewService(appauth.ServiceConfig{
		Users:               userRepository,
		RefreshTokens:       refreshTokenRepository,
		OTPs:                emailOTPRepository,
		EmailDispatcher:     emailDispatcher,
		EmailValidator:      emailValidator,
		JWTSecret:           cfg.JWTSecret,
		AccessTokenTTL:      cfg.AccessTokenTTL,
		RefreshTokenTTL:     cfg.RefreshTokenTTL,
		LoginOTPTTL:         cfg.LoginOTPTTL,
		PasswordResetOTPTTL: cfg.PasswordResetOTPTTL,
		DefaultLocale:       userdomain.Locale(cfg.DefaultLocale),
	})
	userService := appuser.NewService(userRepository, fileRepository, eventPublisher, emailValidator)
	fileService := appfile.NewService(fileRepository, storage, cfg.BucketBasePath, cfg.PublicAPIBaseURL, cfg.FileSignedURLTTL, cfg.FileMaxSizeBytes, eventPublisher)
	notificationService := appnotification.NewService(notificationRepository)

	return &dependencies{
		db:           db,
		users:        userRepository,
		auth:         authService,
		user:         userService,
		file:         fileService,
		notification: notificationService,
		config:       cfg,
		mailer:       mailer,
	}, nil
}

func (a *Application) Run() error {
	srv := &http.Server{
		Addr:    ":" + a.config.Port,
		Handler: a.engine,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		return fmt.Errorf("server forced to shutdown: %w", err)
	}

	log.Println("Server exited gracefully")
	return nil
}

func (a *Application) runSeeds() error {
	seedRunner := seeder.New(a.users, a.auth, seeder.Config{
		AdminName:     a.config.DefaultAdminName,
		AdminEmail:    a.config.DefaultAdminEmail,
		AdminPassword: a.config.DefaultAdminPass,
		UserName:      a.config.DefaultUserName,
		UserEmail:     a.config.DefaultUserEmail,
		UserPassword:  a.config.DefaultUserPass,
	})

	return seedRunner.Run(context.Background())
}

func (d *dependencies) runMigrations() error {
	sqlDB, err := d.db.DB()
	if err != nil {
		return err
	}

	return migrations.NewRunner().Run(context.Background(), sqlDB)
}

func RunWorker(cfg config.Config) error {
	log.Printf(
		"worker bootstrap config: rabbitmq_enabled=%t rabbitmq=%s tasks_exchange=%s worker_queue=%s worker_consumer_tag=%s",
		cfg.RabbitMQURL != "",
		describeAMQPURL(cfg.RabbitMQURL),
		cfg.RabbitMQTasksExchange,
		cfg.RabbitMQWorkerQueue,
		cfg.RabbitMQWorkerConsumerTag,
	)
	mailer := newMailer(cfg)
	emailWorker := worker.NewEmailWorker(cfg.RabbitMQURL, cfg.RabbitMQTasksExchange, cfg.RabbitMQWorkerQueue, cfg.RabbitMQWorkerConsumerTag, 10, mailer)

	db, err := postgres.New(cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("worker db: %w", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		return fmt.Errorf("worker sql db: %w", err)
	}
	if err := migrations.NewRunner().Run(context.Background(), sqlDB); err != nil {
		return fmt.Errorf("worker migrations: %w", err)
	}

	notifConfig, err := platformnotification.LoadConfig("notifications.yaml")
	if err != nil {
		return fmt.Errorf("load notification config: %w", err)
	}
	notificationRepo := postgres.NewNotificationRepository(db)
	userRepo := postgres.NewUserRepository(db)
	var eventPublisher appcommon.EventPublisher = appcommon.NoopEventPublisher{}
	var whatsappClient *platformwhatsapp.Client
	if cfg.RabbitMQURL != "" {
		realtimePublisher, err := platformrabbitmq.NewPublisher(cfg.RabbitMQURL, platformrabbitmq.Exchange{Name: cfg.RabbitMQRealtimeExchange, Kind: "topic"})
		if err != nil {
			return fmt.Errorf("worker realtime publisher: %w", err)
		}
		eventPublisher = platformrealtime.NewPublisher(realtimePublisher, cfg.RabbitMQRealtimeExchange)
	}
	if cfg.WasenderAPIKey != "" {
		whatsappClient = platformwhatsapp.NewClient(cfg.WasenderAPIKey)
	}
	dispatcher := platformnotification.NewDispatcher(notifConfig, notificationRepo, userRepo, mailer, whatsappClient, eventPublisher, userdomain.Locale(cfg.DefaultLocale))
	notificationWorker := worker.NewNotificationWorker(cfg.RabbitMQURL, cfg.RabbitMQRealtimeExchange, workerEnvOrDefault("RABBITMQ_NOTIFICATION_QUEUE", "api.worker.notifications"), workerEnvOrDefault("RABBITMQ_NOTIFICATION_CONSUMER_TAG", "api-notification-worker"), 10, dispatcher)

	cronConfig, err := platformcron.LoadConfig("crons.yaml")
	if err != nil {
		return fmt.Errorf("load cron config: %w", err)
	}
	startCronJobs(db, cronConfig)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	errCh := make(chan error, 2)
	go func() { errCh <- emailWorker.Run(ctx) }()
	go func() { errCh <- notificationWorker.Run(ctx) }()
	return <-errCh
}

func workerEnvOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func startCronJobs(db *gorm.DB, cfg *platformcron.Config) {
	if cfg == nil {
		return
	}

	jobs := map[string]func(context.Context){
		"prune_expired_email_otps": func(ctx context.Context) {
			cutoff := time.Now().UTC().Add(-30 * 24 * time.Hour)
			if err := db.WithContext(ctx).Exec("DELETE FROM email_otps WHERE expires_at < NOW() OR (consumed_at IS NOT NULL AND consumed_at < ?)", cutoff).Error; err != nil {
				log.Printf("cron prune_expired_email_otps failed: %v", err)
			}
		},
		"prune_expired_refresh_tokens": func(ctx context.Context) {
			cutoff := time.Now().UTC().Add(-30 * 24 * time.Hour)
			if err := db.WithContext(ctx).Exec("DELETE FROM refresh_tokens WHERE expires_at < NOW() OR (revoked_at IS NOT NULL AND revoked_at < ?)", cutoff).Error; err != nil {
				log.Printf("cron prune_expired_refresh_tokens failed: %v", err)
			}
		},
	}

	for name, fn := range jobs {
		if !cfg.IsEnabled(name) {
			continue
		}
		interval := cfg.GetInterval(name)
		if interval <= 0 {
			continue
		}
		go func(jobName string, jobFn func(context.Context), delay time.Duration) {
			ticker := time.NewTicker(delay)
			defer ticker.Stop()
			for range ticker.C {
				jobFn(context.Background())
				log.Printf("cron %s completed", jobName)
			}
		}(name, fn, interval)
	}
}

func newMailer(cfg config.Config) platformmailer.Mailer {
	switch cfg.MailProvider {
	case "brevo":
		return brevomailer.New(cfg)
	case "smtp":
		return smtpmailer.New(cfg)
	default:
		return mailchimpmailer.New(cfg)
	}
}

func describeAMQPURL(raw string) string {
	parsed, err := url.Parse(raw)
	if err != nil {
		return "invalid-url"
	}

	host := parsed.Hostname()
	port := parsed.Port()
	if port == "" {
		port = "5672"
	}

	vhost := parsed.Path
	if vhost == "" || vhost == "/" {
		vhost = "/"
	}

	return fmt.Sprintf("%s://%s:%s%s", parsed.Scheme, host, port, vhost)
}

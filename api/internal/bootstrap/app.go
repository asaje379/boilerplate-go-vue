package bootstrap

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"

	appauth "api/internal/application/auth"
	appcommon "api/internal/application/common"
	appfile "api/internal/application/file"
	appuser "api/internal/application/user"
	userdomain "api/internal/domain/user"
	"api/internal/infrastructure/persistence/postgres"
	storages3 "api/internal/infrastructure/storage/s3"
	"api/internal/interfaces/http/router"
	platformasync "api/internal/platform/async"
	"api/internal/platform/config"
	platformemail "api/internal/platform/email"
	mailchimpmailer "api/internal/platform/mailer/mailchimp"
	"api/internal/platform/migrations"
	platformrabbitmq "api/internal/platform/rabbitmq"
	platformrealtime "api/internal/platform/realtime"
	"api/internal/platform/seeder"
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
	}

	app.engine = router.New(cfg, deps.db, deps.auth, deps.user, deps.file)
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
	db     *gorm.DB
	users  postgres.UserRepository
	auth   appauth.Service
	user   appuser.Service
	file   appfile.Service
	config config.Config
	mailer *mailchimpmailer.Mailer
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
	refreshTokenRepository := postgres.NewRefreshTokenRepository(db)
	emailOTPRepository := postgres.NewEmailOTPRepository(db)
	storage, err := storages3.New(cfg)
	if err != nil {
		return nil, err
	}
	mailer := mailchimpmailer.New(cfg)
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
	fileService := appfile.NewService(fileRepository, storage, cfg.BucketBasePath, cfg.FileSignedURLTTL, cfg.FileMaxSizeBytes, eventPublisher)

	return &dependencies{
		db:     db,
		users:  userRepository,
		auth:   authService,
		user:   userService,
		file:   fileService,
		config: cfg,
		mailer: mailer,
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
	mailer := mailchimpmailer.New(cfg)
	emailWorker := worker.NewEmailWorker(cfg.RabbitMQURL, cfg.RabbitMQTasksExchange, cfg.RabbitMQWorkerQueue, cfg.RabbitMQWorkerConsumerTag, 10, mailer)
	return emailWorker.Run(context.Background())
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

package s3

import (
	"context"
	"fmt"
	"net/url"
	"path"
	"strings"
	"time"

	filedomain "api/internal/domain/file"
	"api/internal/platform/config"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type Storage struct {
	client        *awss3.Client
	presign       *awss3.PresignClient
	bucket        string
	provider      string
	publicBaseURL string
}

func New(cfg config.Config) (*Storage, error) {
	provider := strings.ToLower(strings.TrimSpace(cfg.ObjectStorageProvider))
	if provider != "aws" && provider != "minio" {
		return nil, fmt.Errorf("OBJECT_STORAGE_PROVIDER must be one of: aws, minio")
	}

	loadOptions := newLoadOptions(cfg, cfg.ObjectStorageEndpointURL)

	usePathStyle := false
	publicBaseURL := ""
	presignEndpoint := strings.TrimSpace(cfg.ObjectStorageEndpointURL)
	if provider == "minio" {
		endpoint := cfg.MinIOPublicURL
		if endpoint == "" {
			scheme := "http"
			if cfg.MinIOUseSSL {
				scheme = "https"
			}
			endpoint = fmt.Sprintf("%s://%s:%d", scheme, cfg.MinIOEndpoint, cfg.MinIOPort)
		}
		publicBaseURL = strings.TrimRight(endpoint, "/") + "/" + cfg.ObjectStorageBucket
		usePathStyle = true
		if strings.TrimSpace(cfg.MinIOPublicURL) != "" {
			presignEndpoint = strings.TrimSpace(cfg.MinIOPublicURL)
		}
	} else if cfg.ObjectStorageEndpointURL != "" {
		publicBaseURL = strings.TrimRight(cfg.ObjectStorageEndpointURL, "/") + "/" + cfg.ObjectStorageBucket
	} else {
		publicBaseURL = fmt.Sprintf("https://%s.s3.%s.amazonaws.com", cfg.ObjectStorageBucket, cfg.ObjectStorageRegion)
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(), loadOptions...)
	if err != nil {
		return nil, err
	}

	client := awss3.NewFromConfig(awsCfg, func(o *awss3.Options) {
		if usePathStyle {
			o.UsePathStyle = true
		}
	})
	presignClient := awss3.NewPresignClient(client)
	if presignEndpoint != "" && presignEndpoint != strings.TrimSpace(cfg.ObjectStorageEndpointURL) {
		presignCfg, err := awsconfig.LoadDefaultConfig(context.Background(), newLoadOptions(cfg, presignEndpoint)...)
		if err != nil {
			return nil, err
		}

		publicClient := awss3.NewFromConfig(presignCfg, func(o *awss3.Options) {
			if usePathStyle {
				o.UsePathStyle = true
			}
		})
		presignClient = awss3.NewPresignClient(publicClient)
	}

	return &Storage{
		client:        client,
		presign:       presignClient,
		bucket:        cfg.ObjectStorageBucket,
		provider:      provider,
		publicBaseURL: strings.TrimRight(publicBaseURL, "/"),
	}, nil
}

func newLoadOptions(cfg config.Config, baseEndpoint string) []func(*awsconfig.LoadOptions) error {
	loadOptions := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.ObjectStorageRegion),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.ObjectStorageAccessKeyID, cfg.ObjectStorageSecretAccessKey, "")),
	}

	if strings.TrimSpace(baseEndpoint) != "" {
		loadOptions = append(loadOptions, awsconfig.WithBaseEndpoint(strings.TrimSpace(baseEndpoint)))
	}

	return loadOptions
}

func (s *Storage) UploadObject(ctx context.Context, input filedomain.UploadObjectInput) error {
	acl := types.ObjectCannedACLPrivate
	if input.Visibility == filedomain.VisibilityPublic {
		acl = types.ObjectCannedACLPublicRead
	}

	_, err := s.client.PutObject(ctx, &awss3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(input.Key),
		Body:        input.Body,
		ContentType: aws.String(input.ContentType),
		ACL:         acl,
	})
	return err
}

func (s *Storage) DeleteObject(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &awss3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	return err
}

func (s *Storage) GetSignedDownloadURL(ctx context.Context, key string, ttl time.Duration, fileName string) (string, error) {
	result, err := s.presign.PresignGetObject(ctx, &awss3.GetObjectInput{
		Bucket:                     aws.String(s.bucket),
		Key:                        aws.String(key),
		ResponseContentDisposition: aws.String(contentDisposition(fileName)),
	}, func(options *awss3.PresignOptions) {
		options.Expires = ttl
	})
	if err != nil {
		return "", err
	}

	return result.URL, nil
}

func (s *Storage) GetPublicURL(key string) string {
	if s.publicBaseURL == "" {
		return ""
	}

	base, err := url.Parse(s.publicBaseURL)
	if err != nil {
		return ""
	}
	base.Path = path.Join(base.Path, key)
	return base.String()
}

func (s *Storage) Bucket() string {
	return s.bucket
}

func (s *Storage) Provider() string {
	return s.provider
}

func contentDisposition(fileName string) string {
	escaped := strings.ReplaceAll(fileName, `"`, "")
	return fmt.Sprintf(`attachment; filename="%s"`, escaped)
}

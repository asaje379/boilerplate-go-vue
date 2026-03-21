package realtime

import (
	"context"

	appcommon "api/internal/application/common"
	"api/internal/platform/rabbitmq"
)

type Publisher struct {
	publisher *rabbitmq.Publisher
	exchange  string
}

func NewPublisher(publisher *rabbitmq.Publisher, exchange string) Publisher {
	return Publisher{publisher: publisher, exchange: exchange}
}

func (p Publisher) Publish(ctx context.Context, event appcommon.RealtimeEvent) error {
	return p.publisher.PublishJSON(ctx, p.exchange, event.Type, event)
}

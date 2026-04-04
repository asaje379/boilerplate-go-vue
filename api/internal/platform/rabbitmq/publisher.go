package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Exchange struct {
	Name string
	Kind string
}

type Publisher struct {
	url       string
	exchanges []Exchange

	mu      sync.Mutex
	conn    *amqp.Connection
	channel *amqp.Channel
	ready   bool
}

func NewPublisher(url string, exchanges ...Exchange) (*Publisher, error) {
	p := &Publisher{url: url, exchanges: exchanges}
	log.Printf("rabbitmq publisher initializing: endpoint=%s exchanges=%s", describeAMQPURL(url), formatExchanges(exchanges))
	if err := p.connect(); err != nil {
		return nil, err
	}

	return p, nil
}

func (p *Publisher) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	var firstErr error
	if p.channel != nil {
		if err := p.channel.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	if p.conn != nil {
		if err := p.conn.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	p.channel = nil
	p.conn = nil
	p.ready = false

	return firstErr
}

func (p *Publisher) PublishJSON(ctx context.Context, exchange, routingKey string, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		log.Printf("rabbitmq publish marshal failed: exchange=%s routing_key=%s err=%v", exchange, routingKey, err)
		return err
	}

	return p.publish(ctx, exchange, routingKey, body)
}

func (p *Publisher) publish(ctx context.Context, exchange, routingKey string, body []byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	if err := p.ensureConnected(); err != nil {
		log.Printf("rabbitmq publisher unavailable: endpoint=%s exchange=%s routing_key=%s err=%v", describeAMQPURL(p.url), exchange, routingKey, err)
		return err
	}

	log.Printf("rabbitmq publish attempt: endpoint=%s exchange=%s routing_key=%s bytes=%d", describeAMQPURL(p.url), exchange, routingKey, len(body))
	if err := p.channel.PublishWithContext(ctx, exchange, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now().UTC(),
		Body:         body,
	}); err == nil {
		log.Printf("rabbitmq publish succeeded: endpoint=%s exchange=%s routing_key=%s bytes=%d", describeAMQPURL(p.url), exchange, routingKey, len(body))
		return nil
	} else {
		log.Printf("rabbitmq publish failed: endpoint=%s exchange=%s routing_key=%s err=%v", describeAMQPURL(p.url), exchange, routingKey, err)
	}

	p.resetLocked()
	log.Printf("rabbitmq publisher reconnecting after publish failure: endpoint=%s", describeAMQPURL(p.url))
	if err := p.connectLocked(); err != nil {
		log.Printf("rabbitmq publisher reconnect failed: endpoint=%s err=%v", describeAMQPURL(p.url), err)
		return err
	}

	log.Printf("rabbitmq publish retry: endpoint=%s exchange=%s routing_key=%s bytes=%d", describeAMQPURL(p.url), exchange, routingKey, len(body))
	if err := p.channel.PublishWithContext(ctx, exchange, routingKey, false, false, amqp.Publishing{
		ContentType:  "application/json",
		DeliveryMode: amqp.Persistent,
		Timestamp:    time.Now().UTC(),
		Body:         body,
	}); err != nil {
		log.Printf("rabbitmq publish retry failed: endpoint=%s exchange=%s routing_key=%s err=%v", describeAMQPURL(p.url), exchange, routingKey, err)
		return err
	}

	log.Printf("rabbitmq publish retry succeeded: endpoint=%s exchange=%s routing_key=%s bytes=%d", describeAMQPURL(p.url), exchange, routingKey, len(body))
	return nil
}

func (p *Publisher) ensureConnected() error {
	if p.ready && p.conn != nil && !p.conn.IsClosed() && p.channel != nil {
		return nil
	}

	return p.connectLocked()
}

func (p *Publisher) connect() error {
	p.mu.Lock()
	defer p.mu.Unlock()

	return p.connectLocked()
}

func (p *Publisher) connectLocked() error {
	if p.url == "" {
		return fmt.Errorf("rabbitmq url is required")
	}

	log.Printf("rabbitmq publisher dialing: endpoint=%s", describeAMQPURL(p.url))
	conn, err := amqp.Dial(p.url)
	if err != nil {
		return err
	}
	log.Printf("rabbitmq publisher connected: endpoint=%s", describeAMQPURL(p.url))

	channel, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return err
	}
	log.Printf("rabbitmq publisher channel opened: endpoint=%s", describeAMQPURL(p.url))

	for _, exchange := range p.exchanges {
		if err := channel.ExchangeDeclare(exchange.Name, exchange.Kind, true, false, false, false, nil); err != nil {
			_ = channel.Close()
			_ = conn.Close()
			return err
		}
		log.Printf("rabbitmq publisher exchange declared: endpoint=%s name=%s kind=%s durable=%t", describeAMQPURL(p.url), exchange.Name, exchange.Kind, true)
	}

	p.resetLocked()
	p.conn = conn
	p.channel = channel
	p.ready = true

	return nil
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

func formatExchanges(exchanges []Exchange) string {
	if len(exchanges) == 0 {
		return "<none>"
	}

	formatted := make([]string, 0, len(exchanges))
	for _, exchange := range exchanges {
		formatted = append(formatted, fmt.Sprintf("%s(%s)", exchange.Name, exchange.Kind))
	}

	return fmt.Sprintf("[%s]", joinStrings(formatted, ", "))
}

func joinStrings(values []string, separator string) string {
	if len(values) == 0 {
		return ""
	}

	result := values[0]
	for i := 1; i < len(values); i++ {
		result += separator + values[i]
	}

	return result
}

func (p *Publisher) resetLocked() {
	if p.channel != nil {
		_ = p.channel.Close()
	}
	if p.conn != nil {
		_ = p.conn.Close()
	}
	p.channel = nil
	p.conn = nil
	p.ready = false
}

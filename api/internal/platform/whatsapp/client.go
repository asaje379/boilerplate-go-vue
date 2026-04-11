package whatsapp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
}

func NewClient(apiKey string) *Client {
	return &Client{
		apiKey:  apiKey,
		baseURL: "https://wasenderapi.com/api",
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

type sendMessageRequest struct {
	To   string `json:"to"`
	Text string `json:"text"`
}

func (c *Client) Send(ctx context.Context, phone, text string) error {
	body, err := json.Marshal(sendMessageRequest{To: phone, Text: text})
	if err != nil {
		return fmt.Errorf("whatsapp marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/send-message", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("whatsapp request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("whatsapp send: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode >= 400 {
		return fmt.Errorf("whatsapp send failed: status %d body=%s", resp.StatusCode, respBody)
	}

	return nil
}

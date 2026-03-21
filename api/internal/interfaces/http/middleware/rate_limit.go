package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"github.com/gin-gonic/gin"
)

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

type RateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	limit    rate.Limit
	burst    int
	ttl      time.Duration
}

func NewRateLimiter(requestsPerMinute int, burst int, ttl time.Duration) *RateLimiter {
	if requestsPerMinute <= 0 {
		requestsPerMinute = 60
	}
	if burst <= 0 {
		burst = requestsPerMinute
	}
	if ttl <= 0 {
		ttl = 10 * time.Minute
	}

	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		limit:    rate.Every(time.Minute / time.Duration(requestsPerMinute)),
		burst:    burst,
		ttl:      ttl,
	}

	go rl.cleanup()
	return rl
}

func (r *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := clientIP(c)
		limiter := r.get(ip)
		if !limiter.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}

		c.Next()
	}
}

func (r *RateLimiter) get(ip string) *rate.Limiter {
	r.mu.Lock()
	defer r.mu.Unlock()

	if entry, ok := r.visitors[ip]; ok {
		entry.lastSeen = time.Now()
		return entry.limiter
	}

	limiter := rate.NewLimiter(r.limit, r.burst)
	r.visitors[ip] = &visitor{limiter: limiter, lastSeen: time.Now()}
	return limiter
}

func (r *RateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		cutoff := time.Now().Add(-r.ttl)
		r.mu.Lock()
		for ip, entry := range r.visitors {
			if entry.lastSeen.Before(cutoff) {
				delete(r.visitors, ip)
			}
		}
		r.mu.Unlock()
	}
}

func clientIP(c *gin.Context) string {
	ip := c.ClientIP()
	if parsed := net.ParseIP(ip); parsed != nil {
		return parsed.String()
	}
	return ip
}

package cron

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type JobConfig struct {
	Enabled     bool   `yaml:"enabled"`
	Interval    string `yaml:"interval"`
	Description string `yaml:"description,omitempty"`
}

func (j JobConfig) IntervalDuration() (time.Duration, error) {
	return time.ParseDuration(j.Interval)
}

type Config struct {
	Crons map[string]JobConfig `yaml:"crons"`
}

func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read cron config: %w", err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parse cron config: %w", err)
	}

	for name, job := range cfg.Crons {
		if _, err := time.ParseDuration(job.Interval); err != nil {
			return nil, fmt.Errorf("invalid interval for cron %q: %w", name, err)
		}
	}

	return &cfg, nil
}

func (c *Config) IsEnabled(name string) bool {
	job, ok := c.Crons[name]
	if !ok {
		return false
	}
	return job.Enabled
}

func (c *Config) GetInterval(name string) time.Duration {
	job, ok := c.Crons[name]
	if !ok {
		return 0
	}
	d, _ := time.ParseDuration(job.Interval)
	return d
}

# Security

## En place

- Swagger protege par basic auth
- JWT access + refresh token avec rotation et logout par revocation
- Rate limiting local en memoire par IP
- Headers HTTP de securite de base
- CORS avec whitelist d'origines configurable
- Blocage des emails temporaires + allowlist de domaines/emails metier

## Plan anti DDoS minimal recommande

1. Conserver le rate limiting applicatif actuel pour freiner l'abus basique.
2. Ajouter un reverse proxy en frontal (Nginx, Caddy, Traefik ou cloud load balancer) avec limites de connexions et timeouts stricts.
3. Activer une protection edge/CDN/WAF (Cloudflare, AWS WAF, Fastly, etc.) pour filtrer avant l'application.
4. Externaliser le rate limiting vers Redis si plusieurs instances API sont deployees.
5. Ajouter une observabilite de securite: logs de 401/403/429, alerting et dashboards.

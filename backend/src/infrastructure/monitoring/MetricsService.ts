import { register, collectDefaultMetrics, Counter, Histogram } from "prom-client";

/**
 * Service de monitoring pour exposer les métriques Prometheus.
 * Suit le temps de réponse des requêtes et compte le nombre total de requêtes.
 */
export class MetricsService {
  public static readonly httpRequestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "Duration of HTTP requests in seconds",
    labelNames: ["method", "route", "status_code"],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
  });

  public static readonly totalRequests = new Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
  });

  constructor() {
    collectDefaultMetrics();
  }

  public async getMetrics(): Promise<string> {
    return register.metrics();
  }

  public getContentType(): string {
    return register.contentType;
  }
}

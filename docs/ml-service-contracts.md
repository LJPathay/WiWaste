# ML Service Contracts Review

## Overview
This document reviews the ML service contracts and API contracts between the Laravel backend and the Python ML service.

## Current ML Service Endpoints

### Forecast Service (ARIMA)
- **Endpoint**: `POST /forecast/generate`
- **Endpoint**: `GET /forecast/overview`
- **Endpoint**: `GET /forecast/{product_id}`
- **Service**: `ml-service/app/main.py`

### Loss Risk Service (XGBoost)
- **Endpoint**: `POST /loss-risk/predict`
- **Endpoint**: `GET /loss-risk/items`
- **Endpoint**: `GET /loss-risk/summary`

### Inventory Analytics (GA Optimization)
- **Endpoint**: `POST /optimization/replenishment`
- **Endpoint**: `GET /analytics/turnover`
- **Endpoint**: `GET /analytics/overstock`
- **Endpoint**: `GET /analytics/dead-stock`
- **Endpoint**: `GET /analytics/dashboard-summary`

### Forecast Accuracy Tracking
- **Endpoint**: `POST /ml/accuracy`
- **Endpoint**: `GET /ml/accuracy/alerts`
- **Endpoint**: `GET /ml/accuracy/{product_id}`

### Loss Risk (XGBoost)
- **Endpoint**: `POST /loss-risk/predict`
- **Endpoint**: `GET /loss-risk/items`
- **Endpoint**: `GET /loss-risk/summary`

## Contract Definitions

### Forecast Service
```yaml
# Request: POST /forecast/generate
{
  "horizon_days": 30,
  "confidence_level": 0.95
}

# Response
{
  "generated": 150,
  "timestamp": "2024-01-15T10:30:00Z"
}

# Request: GET /forecast/overview
# Response
{
  "generated_at": "2024-01-15T10:30:00Z",
  "total_products": 150,
  "avg_confidence": 0.87,
  "model": "ARIMA",
  "horizon_days": 30,
  "top_risks": [...],
  "series": [...]
}
```

### Loss Risk Service
```yaml
# Request: POST /loss-risk/predict
{}

# Response
{
  "generated_at": "2024-01-15T10:30:00Z",
  "engine": "XGBoost",
  "total": 150,
  "items": [...],
  "summary": {
    "total_products": 150,
    "high_risk": 12,
    "medium_risk": 35,
    "low_risk": 103,
    "total_expected_loss": 45600
  }
}
```

### Inventory Analytics
```yaml
# Request: GET /analytics/turnover
# Response
{
  "products": [...],
  "avg_turnover": 4.5,
  "total_dead_stock": 12
}

# Request: GET /analytics/overstock
# Response
{
  "items": [...],
  "total_exposure": 125000,
  "total_items": 8
}

# Request: GET /analytics/dead-stock
# Response
{
  "items": [...],
  "total_locked_capital": 45000,
  "total_items": 5
}
```

### Optimization Service
```yaml
# Request: POST /optimization/replenishment
{
  "budget": 500000,
  "horizon_days": 30,
  "include_product_ids": [1, 2, 3],
  "persist": true,
  "seed": 42
}

# Response
{
  "plan": [...],
  "total_order_value": 485000,
  "budget": 500000,
  "fitness": 0.92,
  "gen0_fitness": 0.75,
  "generations_run": 100,
  "confidence": 0.89,
  "generated_at": "2024-01-15T10:30:00Z",
  "recommendations_written": 15
}
```

### Forecast Accuracy
```yaml
# Request: POST /ml/accuracy
{
  "period": "monthly"
}

# Response
{
  "generated": 150,
  "timestamp": "2024-01-15T10:30:00Z"
}

# Request: GET /ml/accuracy/alerts
# Response
{
  "alerts": [
    {
      "product_id": 123,
      "product_name": "Product A",
      "mape": 0.25,
      "threshold": 0.20,
      "severity": "high"
    }
  ]
}
```

## Health Check Endpoints

Each ML service should expose:
- `GET /health` - Service health status
- `GET /metrics` - Prometheus metrics
- `GET /version` - Service version

## Contract Validation

### Request Validation
- All endpoints validate request payloads
- Required fields enforced
- Type checking on all fields
- Range validation on numeric fields

### Response Validation
- Consistent response structure
- Error handling with standard format
- Pagination for list endpoints
- Rate limiting headers

## Integration Testing

### Contract Tests
- Run against staging ML service
- Validate request/response schemas
- Test error scenarios
- Performance benchmarks

### Health Checks
- Monitor ML service availability
- Alert on contract violations
- Track API latency

## Versioning Strategy

### API Versioning
- URL versioning: `/api/v1/`
- Header versioning: `Accept: application/vnd.wiwaste.v1+json`
- Backward compatibility: 12 months minimum

### Breaking Changes
- Deprecation notices: 3 months advance
- Migration guides provided
- Parallel run period: 1 month minimum

## Monitoring & Alerting

### Key Metrics
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Throughput (req/s)
- ML model accuracy (MAPE, RMSE)

### Alerts
- ML service down > 1 min
- Error rate > 5%
- Latency p95 > 5s
- Model accuracy drop > 10%

## Deployment Contracts

### ML Service Deployment
- Blue-green deployment
- Canary release: 5% traffic
- Automated rollback on error rate > 10%
- Health check: `/health` endpoint

### Rollback Procedure
- Automated on health check failure
- Manual override available
- Database migration rollback if needed
# PTSI Deployment Guide

## Production Deployment Checklist

- [ ] Generate strong JWT secret...
- [ ] Configure MongoDB (Atlas or self-hosted)
- [ ] Configure Redis (ElastiCache or self-hosted)
- [ ] Set up SSL/TLS certificates
- [ ] Configure CORS origins
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline
- [ ] Load test the system
- [ ] Configure uptime monitoring

---

## Deployment Methods

### 1. Docker Compose (Recommended for Small-Medium)

```bash
# Copy env file
cp .env.prod.example .env.prod

# Edit .env.prod with production values
nano .env.prod

# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

### 2. Kubernetes (For Large Scale)

First create namespace:
```bash
kubectl create namespace ptsi
```

Create secrets:
```bash
kubectl create secret generic ptsi-secrets \
  --from-literal=mongodb-uri='mongodb://admin:pass@mongodb:27017/ptsi_db' \
  --from-literal=redis-password='secure_password' \
  --from-literal=jwt-secret='long_secure_secret_key' \
  -n ptsi
```

Deploy:
```bash
kubectl apply -f k8s/namespace.yml
kubectl apply -f k8s/mongodb-statefulset.yml
kubectl apply -f k8s/redis-deployment.yml
kubectl apply -f k8s/ai-service-deployment.yml
kubectl apply -f k8s/backend-deployment.yml
kubectl apply -f k8s/frontend-deployment.yml
kubectl apply -f k8s/ingress.yml
```

### 3. AWS ECS

Create task definitions for each service, then deploy via CloudFormation or AWS CLI:

```bash
aws ecs create-service \
  --cluster ptsi-production \
  --service-name ptsi-backend \
  --task-definition ptsi-backend:1 \
  --desired-count 3 \
  --launch-type FARGATE
```

### 4. Azure Container Instances

```bash
az container create \
  --resource-group ptsi-prod \
  --name ptsi-backend \
  --image ptsi-backend:latest \
  --cpu 2 \
  --memory 4
```

---

## SSL/TLS Setup

### Using Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Update nginx config
sudo nano /etc/nginx/sites-available/ptsi
```

Example nginx config:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Backend proxy
    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # WebSocket
    location /ws {
        proxy_pass ws://backend:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # AI Service
    location /ai/ {
        proxy_pass http://ai-service:8000/;
    }

    # Frontend
    location / {
        proxy_pass http://frontend:5173;
    }
}

server {
    listen 80;
    server_name yourdomain.com api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Database Backup & Recovery

### MongoDB Backup

```bash
# Daily backup
mongodump --uri "mongodb://admin:pass@host:27017/ptsi_db" --out /backups/ptsi_$(date +%Y%m%d)

# Restore
mongorestore --uri "mongodb://admin:pass@host:27017" /backups/ptsi_20240305
```

### Redis Backup

```bash
# Create backup
redis-cli --rdb /backups/redis_$(date +%Y%m%d).rdb

# Restore
cp redis_backup.rdb /var/lib/redis/dump.rdb
sudo systemctl restart redis-server
```

---

## Monitoring & Logging

### Application Monitoring (Recommended)

Using Datadog:
```bash
# Install Datadog agent
DD_API_KEY=<your_key> bash -c "$(curl -L https://s3.amazonaws.com/datadog-agent/scripts/install_mac_os.sh)"

# Configure agent for Node.js
npm install --save dd-trace
```

### Log Aggregation

Using ELK Stack:
```yaml
# docker-compose addition
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
  environment:
    - discovery.type=single-node
  ports:
    - "9200:9200"

kibana:
  image: docker.elastic.co/kibana/kibana:8.0.0
  ports:
    - "5601:5601"
```

### Health Checks

Configure endpoints:
- Backend: `GET /health`
- AI Service: `GET /health`
- MongoDB: `db.adminCommand('ping')`

---

## Auto-Scaling

### Docker Swarm

```bash
docker service create \
  --name ptsi-backend \
  --replicas 3 \
  --limit-cpu 2.0 \
  --limit-memory 2G \
  ptsi-backend:latest
```

### Kubernetes

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-autoscaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Secret Management

### Using HashiCorp Vault

```bash
# Run Vault container
docker run -d -p 8200:8200 vault

# Store secrets
vault kv put secret/ptsi/database \
  mongodb_uri='mongodb://...' \
  redis_password='...' \
  jwt_secret='...'

# Retrieve in app
const secret = await vault.read('secret/ptsi/database');
```

---

## Performance Optimization

### Redis Caching

```javascript
// Cache analytics results
const cacheKey = 'analytics:risk:' + date;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const data = await computeAnalytics();
await redis.setex(cacheKey, 3600, JSON.stringify(data)); // 1 hour TTL
```

### Database Indexing

```javascript
// Ensure indexes on frequently queried fields
db.incidents.createIndex({ "timestamp": -1 });
db.incidents.createIndex({ "zone_id": 1, "timestamp": -1 });
db.alerts.createIndex({ "zone_name": 1, "timestamp": -1 });
```

### CDN for Frontend

```bash
# Build optimized frontend
cd frontend
npm run build

# Upload dist/ to CDN (AWS CloudFront, Cloudflare, etc.)
aws s3 sync dist/ s3://ptsi-cdn-bucket/ --delete
```

---

## Rollback Strategy

### Zero-Downtime Deployments

Using Docker compose with load balancer:

```bash
# Start new version alongside old
docker-compose -f docker-compose.prod.yml up -d backend-v2

# Route traffic gradually to new version
# (configure load balancer)

# Stop old version once stable
docker-compose -f docker-compose.prod.yml down backend-v1
```

---

## Disaster Recovery

### Setup

1. **Multi-region replication**
   - MongoDB Atlas with multi-region replication
   - Redis with RDB snapshots to S3

2. **Regular testing**
   ```bash
   # Monthly DR drill
   - Restore from latest backup
   - Run smoke tests
   - Document issues
   ```

3. **RTO/RPO targets**
   - Recovery Time Objective (RTO): 1 hour
   - Recovery Point Objective (RPO): 15 minutes

---

## Load Testing

Using Apache JMeter:

```bash
# Create test plan
jmeter -n -t test_plan.jmx -l results.jtl -j jmeter.log

# Generate report
jmeter -g results.jtl -o ./report
```

Expected capacity:
- 100 concurrent users (sustained)
- 1000 concurrent users (peak)
- 10,000+ WebSocket connections per server

---

## Incident Response

### Runbook: High Error Rate

1. Check logs: `docker-compose logs backend | grep ERROR`
2. Check resource usage: `docker stats`
3. Check database connection: `mongostat`
4. Restart service: `docker-compose restart backend`
5. If persists, rollback to previous version
6. Post-incident review

---

## Maintenance Windows

```bash
# Planned maintenance (e.g., database migration)
# 1. Set maintenance mode in frontend
# 2. Drain in-flight requests
# 3. Stop backend services
# 4. Run migrations
# 5. Start services
# 6. Verify health
# 7. Remove maintenance mode
```

---

**Last Updated:** March 5, 2024

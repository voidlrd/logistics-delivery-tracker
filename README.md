# Logistics Delivery Tracker

A microservice-based logistics system with real-time tracking, order management, and serverless invoice generation.

## Features

- Real-time order tracking with WebSockets
- JWT-based authentication
- Serverless invoice generation
- Micro frontend architecture
- Event-driven communication
- Fully containerized with Docker

## Tech Stack

**Frontend:** Reach 19 + TypeScript + Vite + Module Federation  
**Backend:** Node.js 20 + Express + Socket.io  
**Databases:** PostgreSQL + Redis  
**Message Brokers:** RabbitMQ + Kafka  
**Cloud:** Google Cloud Functions  
**DevOps:** Docker + Docker Compose + Nginx  

## Quick Start

```bash
git clone https://github.com/yourusername/logistics-delivery-tracker.git
cd logistics-delivery-tracker

docker-compose up --build
```

Open browser: **http://localhost:5000**

## Usage

1. Click **"Login"** to authenticate
2. Click **"Place Order"** to create orders
3. Click **"Simulate Move"** to update driver locations
4. Watch real-time updates in Dashboard and LiveMap

## Architecture

```
Frontend (React MFEs) 
    -> Nginx (Load Balancer)
        -> API Gateway (WebSockets + Auth)
        -> Order Service (PostgreSQL + RabbitMQ)
        -> Tracking Service (Kafka)
        -> Google Cloud Functions (Invoice Generation)
```

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Host App | 5000 | Main application shell |
| Dashboard MFE | 5001 | Order statistics |
| Tracking MFE | 5002 | Live map |
| API Gateway | 3000 | WebSocket hub |
| Order Service | 3001 | Order management |
| Tracking Service | 3002 | Location streaming |
| Nginx | 80 | Reverse proxy |

## Google Cloud Functions Setup

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

gcloud services enable cloudfunctions.googleapis.com cloudbuild.googleapis.com
gcloud billing projects link YOUR_PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT

cd functions/invoice-generator
gcloud functions deploy generateInvoice
```

## API Endpoints

**POST /api/login** - Get JWT token  
**POST /api/orders** - Create order (requires JWT)  
**POST /api/track** - Update driver location (requires JWT)
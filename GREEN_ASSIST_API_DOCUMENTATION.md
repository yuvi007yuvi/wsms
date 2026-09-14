# Green Assist API Integration Specification
## Live Data Synchronization & Telemetry Interface

---

### Document Information
- **System**: Nature Green — Weighment Slip Management System (WSMS)
- **Client / Municipal Authority**: Nagar Nigam Mathura Vrindavan
- **Recipient**: Green Assist Technical, Analytics & Integration Team
- **Document Version**: 1.0 (Enterprise REST & Real-Time Stream)
- **Status**: Production Ready
- **Date**: September 2026

---

## 1. Overview & Architecture

The **Nature Green Weighment Slip Management System (WSMS)** is deployed at municipal solid waste (MSW) processing facilities and weighbridge sites for Nagar Nigam Mathura Vrindavan. The system captures physical vehicle weights from digital weighbridge indicators, generates official municipal weighment slips, categorizes waste streams, and provides real-time audit logs.

This document details the REST API endpoints and real-time streaming interfaces provided to **Green Assist** to continuously ingest live weighment data, vehicle trip logs, tonnage aggregations, and weighbridge scale diagnostics into the Green Assist platform.

```
┌──────────────────────────────────────────┐
│ Physical Weighbridge / Indicator (COM)   │
└────────────────────┬─────────────────────┘
                     │ (Serial 9600 baud)
┌────────────────────▼─────────────────────┐
│ Nature Green WSMS (Server & Database)     │
└────────────────────┬─────────────────────┘
                     │ HTTPS (REST) / WSS (Socket.io)
                     │ Header: x-api-key or Bearer JWT
┌────────────────────▼─────────────────────┐
│ Green Assist Central Monitoring System   │
└──────────────────────────────────────────┘
```

---

## 2. Server Environments & Base URLs

All API calls must be made over secure HTTPS. Data is exchanged in standard JSON format.

| Environment | Base URL | WebSocket URL | Usage |
| :--- | :--- | :--- | :--- |
| **Production Cloud** | `https://wsms-1.onrender.com/api` | `wss://wsms-1.onrender.com` | Live Production Ingestion |
| **Local / Edge Server** | `http://localhost:5000/api` | `ws://localhost:5000` | Site Weighbridge Terminal / Testing |

- **Default Content-Type**: `application/json`
- **Timezone**: Indian Standard Time (IST, UTC+05:30)
- **Timestamp Format**: ISO 8601 (e.g., `2026-09-14T15:30:00.000Z`)
- **Unit of Weight**: Kilograms (**KG**). *(1 Metric Ton [MT] = 1,000 KG)*

---

## 3. Authentication & Authorization

WSMS supports **two authentication methods**. For Green Assist's automated server-to-server data pipelines, **Method A (API Key)** is strongly recommended.

### Method A: Static API Key (Recommended for Green Assist)

No login calls or token refresh workflows required. Attach your secret API Key to the `x-api-key` header on every request:

```http
GET /api/weighment HTTP/1.1
Host: wsms-1.onrender.com
x-api-key: ga_live_wsms_sec_99a8b7c6d5e4
Content-Type: application/json
```

> **API Key Credentials**:
> - Header Name: `x-api-key`
> - Default Production Key: `ga_live_wsms_sec_99a8b7c6d5e4` *(Contact WSMS Administrator if key rotation is needed)*

---

### Method B: Service Account Login (JWT Bearer Token)

If Green Assist prefers session-based tokens with automated expiration (12-hour validity):

#### `POST /api/auth/login`
Authenticates a service account and returns a signed JSON Web Token (JWT).

**Request Body:**
```json
{
  "username": "greenassist_service",
  "password": "<SERVICE_ACCOUNT_PASSWORD>"
}
```

**Success Response (`200 OK`):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "b6a82a20-4df8-4f24-9b57-6e9f1a238b90",
    "username": "greenassist_service",
    "role": "operator",
    "fullName": "Green Assist Integration Service",
    "designation": "API Client"
  }
}
```

Attach the returned token to subsequent requests in the `Authorization` header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 4. Core Live Data Endpoints

### 4.1. Live Weighment Slips Feed

#### `GET /api/weighment`
Fetches individual weighment tickets generated at the weighbridge. This is the primary endpoint for Green Assist to ingest live transaction-level records.

#### Query Parameters
| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | integer | No | `1` | Page number for pagination (1-indexed). |
| `limit` | integer | No | `50` | Records per page (Max: `1000`). |
| `dateFrom` | string | No | — | Filter slips on or after date (`YYYY-MM-DD`). |
| `dateTo` | string | No | — | Filter slips on or before date (`YYYY-MM-DD`). |
| `search` | string | No | — | Keyword search across `slipNumber`, `vehicleNumber`, `material`, `remarks`, `operator`. |

#### Sample Request
```http
GET /api/weighment?limit=10&page=1&dateFrom=2026-09-14 HTTP/1.1
Host: wsms-1.onrender.com
x-api-key: ga_live_wsms_sec_99a8b7c6d5e4
```

#### Success Response (`200 OK`)
```json
{
  "total": 142,
  "data": [
    {
      "id": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",
      "slipNumber": "WS260914-0028",
      "date": "2026-09-14T10:14:22.000Z",
      "grossWeight": 14280,
      "tareWeight": 5640,
      "netWeight": 8640,
      "driverName": "Ramesh Kumar",
      "remarks": "Segregated waste from Ward 12",
      "createdAt": "2026-09-14T10:14:22.512Z",
      "vehicle": {
        "vehicleNumber": "UP85-BT-4512",
        "driverName": "Ramesh Kumar",
        "vehicleType": {
          "name": "Compactor"
        }
      },
      "material": {
        "name": "Municipal Solid Waste (MSW)"
      },
      "source": {
        "name": "Ward 12 - Vrindavan Zone"
      },
      "destination": {
        "name": "Mathura Waste-to-Energy Plant"
      },
      "operator": {
        "username": "op_mathura_01"
      }
    }
  ]
}
```

#### Field Specifications
| Field | Data Type | Description |
| :--- | :--- | :--- |
| `id` | UUID string | Immutable unique primary key in WSMS database. |
| `slipNumber` | String | Sequential municipal ticket number (Format: `WS<YYMMDD>-<SEQ>`). |
| `date` | ISO 8601 | Exact timestamp of weighbridge scale capture. |
| `grossWeight` | Float / Number | Total loaded vehicle weight in Kilograms (**KG**). |
| `tareWeight` | Float / Number | Unloaded / Empty vehicle weight in Kilograms (**KG**). |
| `netWeight` | Float / Number | Net payload weight in Kilograms (**KG**): `grossWeight - tareWeight`. |
| `vehicle.vehicleNumber` | String | Vehicle registration / license plate number. |
| `vehicle.vehicleType.name` | String | Vehicle classification (e.g., *Dumper, Compactor, Tipper, Auto Tipper*). |
| `material.name` | String | Categorized waste stream (e.g., *MSW, Organic Waste, Dry Recyclable, C&D Waste*). |
| `source.name` | String | Point of origin (Ward / Zone / Nagar Nigam Sector). |
| `destination.name` | String | Processing site / Plant / Landfill. |
| `operator.username` | String | WSMS operator username who authorized the weighment. |
| `driverName` | String | Name of the driver operating the vehicle during ticket creation. |
| `remarks` | String \| null | Operator observations or load quality notes. |

---

### 4.2. Aggregated Weighment Summary Reports

#### `GET /api/weighment/summary`
Calculates aggregated weighment statistics (trip count, total gross, tare, and net weights) grouped by operational categories.

#### Query Parameters
| Parameter | Type | Required | Default | Allowed Values |
| :--- | :--- | :--- | :--- | :--- |
| `reportType` | string | **Yes** | `daily` | `daily`, `vehicleType`, `source` *(or `ward`)*, `destination` *(or `work`)* |
| `dateFrom` | string | No | — | Filter start date (`YYYY-MM-DD`). |
| `dateTo` | string | No | — | Filter end date (`YYYY-MM-DD`). |

#### Sample Request
```http
GET /api/weighment/summary?reportType=vehicleType&dateFrom=2026-09-01&dateTo=2026-09-14 HTTP/1.1
Host: wsms-1.onrender.com
x-api-key: ga_live_wsms_sec_99a8b7c6d5e4
```

#### Success Response (`200 OK`)
```json
{
  "data": [
    {
      "key": "Compactor",
      "count": 48,
      "grossWeight": 724800,
      "tareWeight": 288000,
      "netWeight": 436800
    },
    {
      "key": "Tipper",
      "count": 62,
      "grossWeight": 558000,
      "tareWeight": 217000,
      "netWeight": 341000
    },
    {
      "key": "Auto Tipper",
      "count": 115,
      "grossWeight": 287500,
      "tareWeight": 138000,
      "netWeight": 149500
    }
  ]
}
```

---

### 4.3. Real-Time Executive Dashboard KPIs

#### `GET /api/dashboard/stats`
Returns instantaneous key performance indicators (KPIs), daily tonnage comparison (Today vs. Yesterday), and 7-day trend aggregations.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `dateFrom` | string | No | Custom start date (`YYYY-MM-DD`). |
| `dateTo` | string | No | Custom end date (`YYYY-MM-DD`). |
| `vehicleType` | string | No | Filter by vehicle type name (or `all`). |
| `materialId` | string | No | Filter by material UUID (or `all`). |
| `sourceId` | string | No | Filter by source/ward UUID (or `all`). |

#### Success Response (`200 OK`)
```json
{
  "summary": {
    "totalSlips": 84,
    "totalNetWeight": 412500,
    "totalGrossWeight": 798200,
    "avgNetWeightPerSlip": 4910.71,
    "slipsTrend": 12.5,
    "weightTrend": 8.4
  },
  "charts": {
    "dailyTrend": [
      { "date": "2026-09-08", "netWeight": 384000, "grossWeight": 741000, "slips": 76 },
      { "date": "2026-09-09", "netWeight": 392000, "grossWeight": 756000, "slips": 79 },
      { "date": "2026-09-10", "netWeight": 405000, "grossWeight": 782000, "slips": 82 },
      { "date": "2026-09-11", "netWeight": 398000, "grossWeight": 768000, "slips": 80 },
      { "date": "2026-09-12", "netWeight": 410000, "grossWeight": 791000, "slips": 83 },
      { "date": "2026-09-13", "netWeight": 380000, "grossWeight": 732000, "slips": 75 },
      { "date": "2026-09-14", "netWeight": 412500, "grossWeight": 798200, "slips": 84 }
    ],
    "materialDistribution": [
      { "name": "Municipal Solid Waste (MSW)", "weight": 285000, "percentage": 69.1 },
      { "name": "Organic Waste", "weight": 82500, "percentage": 20.0 },
      { "name": "C&D Waste", "weight": 45000, "percentage": 10.9 }
    ]
  }
}
```

---

### 4.4. Live Weighbridge Scale Stream & Hardware Telemetry

WSMS connects directly to physical weighbridge indicators via RS-232 serial COM ports. Green Assist can monitor live scale data through REST polling or WebSocket streaming.

#### REST Snapshot: `GET /api/system/diagnose-weighbridge`
Returns the current hardware connection status, COM port assignment, and instantaneous scale weight.

**Sample Response (`200 OK`):**
```json
{
  "dataReceived": true,
  "message": "Main connection active on COM3. 50 sample(s) in buffer.",
  "ports": [
    { "path": "COM3", "manufacturer": "FTDI" }
  ],
  "connectionState": {
    "isConnected": true,
    "lastWeight": 14250,
    "lastStatus": "Stable",
    "portPath": "COM3"
  }
}
```

#### WebSocket Stream: Socket.io Channel
For sub-second live weight monitoring (e.g., watching a vehicle mount the weighbridge):
- **Protocol**: WebSocket / Socket.io (`transports: ['websocket']`)
- **Connection URL**: `wss://wsms-1.onrender.com`
- **Event Name**: `weight-update`
- **Broadcast Payload**:
```json
{
  "weight": 14250,
  "status": "Stable"
}
```
*Possible Status values*: `"Stable"`, `"Reading"`, `"Connected"`, `"Disconnected"`.

---

### 4.5. Master Reference Data Lookups

Green Assist can query master tables to map foreign identifiers to human-readable names.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/master/vehicles` | `GET` | Fleet catalog: Vehicle Number, Vehicle Type ID, Driver, Registered Tare Weight. |
| `/api/master/vehicle-types` | `GET` | Vehicle categories: Dumper, Compactor, Tipper, Auto Tipper, Tractor. |
| `/api/master/materials` | `GET` | Registered waste categories: MSW, Green Waste, Dry Recyclable, C&D Waste. |
| `/api/master/sources` | `GET` | Collection origins: Municipal Wards, Sanitary Zones, Collection Centers. |
| `/api/master/destinations` | `GET` | Processing destinations: Waste-to-Energy Plant, MRF Facility, Landfill. |

#### Sample Response (`GET /api/master/materials`):
```json
{
  "data": [
    { "id": "m-01", "name": "Municipal Solid Waste (MSW)", "description": "Unsegregated household waste", "isActive": true },
    { "id": "m-02", "name": "Organic Waste", "description": "Wet waste from hotels and markets", "isActive": true },
    { "id": "m-03", "name": "Dry Recyclables", "description": "Plastics, paper, cardboard, metals", "isActive": true },
    { "id": "m-04", "name": "Construction & Demolition (C&D)", "description": "Debris and rubble", "isActive": true }
  ]
}
```

---

### 4.6. System Health & Heartbeat

#### `GET /api/health`
Public liveness probe for monitoring server uptime.

**Response (`200 OK`):**
```json
{
  "status": "ok",
  "timestamp": "2026-09-14T10:30:00.000Z"
}
```

---

## 5. Integration Guidelines for Green Assist

### Recommended Ingestion Strategy

```
┌────────────────────────────────────────────────────────┐
│ 1. Initial Sync: Fetch master lookup tables            │
│    (Vehicles, Materials, Sources, Destinations)        │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 2. Periodic Polling (Every 30–60 seconds):              │
│    Call GET /api/weighment?limit=100&dateFrom=YYYY-MM-DD│
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ 3. Deduplication: Upsert records keyed on `slipNumber`  │
│    (Slip numbers are immutable and strictly unique)    │
└────────────────────────────────────────────────────────┘
```

1. **Polling Frequency**:
   - A polling interval of **30 to 60 seconds** is optimal for synchronizing new slips without imposing load on the database.
   - For high-volume days, Green Assist may paginate by requesting `page=1, 2, 3...` until the total record count is reached.
2. **Deduplication & Primary Key**:
   - Always use `slipNumber` (e.g., `WS260914-0028`) as the unique external key. Slip numbers in WSMS are sequentially generated and immutable.
3. **Time Window Filtering**:
   - To minimize payload size, use `dateFrom=YYYY-MM-DD` matching the current day, or keep track of the latest `createdAt` timestamp processed.
4. **Retry & Backoff**:
   - In case of network drops or HTTP `5xx` errors, retry with exponential backoff (1s, 2s, 4s, 8s).

---

## 6. HTTP Status & Error Codes

WSMS uses standard HTTP status codes. Errors return a JSON payload with an `error` message.

| HTTP Status | Meaning | Scenario / Description |
| :--- | :--- | :--- |
| **`200 OK`** | Success | Request succeeded and data returned. |
| **`201 Created`** | Created | Resource successfully created. |
| **`400 Bad Request`** | Client Error | Missing or invalid query parameters. |
| **`401 Unauthorized`** | Unauthorized | Missing `x-api-key` or `Authorization` header. |
| **`403 Forbidden`** | Forbidden | Invalid API Key or expired JWT token. |
| **`404 Not Found`** | Not Found | Requested endpoint or resource does not exist. |
| **`500 Internal Error`** | Server Error | Unhandled server error. Check `/api/health` status. |

#### Standard Error Response Format:
```json
{
  "error": "Access token or x-api-key required"
}
```

---

## 7. Ready-to-Use Code Samples

### 7.1. cURL (Terminal / Shell)
```bash
# Fetch live weighment slips for today
curl -X GET "https://wsms-1.onrender.com/api/weighment?limit=50&dateFrom=2026-09-14" \
  -H "x-api-key: ga_live_wsms_sec_99a8b7c6d5e4" \
  -H "Content-Type: application/json"
```

---

### 7.2. Python (Requests)
```python
import requests
import json

BASE_URL = "https://wsms-1.onrender.com/api"
API_KEY = "ga_live_wsms_sec_99a8b7c6d5e4"

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

def fetch_live_weighment_slips(date_from=None, limit=100):
    params = {"limit": limit}
    if date_from:
        params["dateFrom"] = date_from

    response = requests.get(f"{BASE_URL}/weighment", headers=headers, params=params)
    
    if response.status_code == 200:
        data = response.json()
        print(f"Successfully fetched {len(data['data'])} slips (Total available: {data['total']})")
        for slip in data["data"]:
            print(f"[{slip['slipNumber']}] Vehicle: {slip['vehicle']['vehicleNumber']} | "
                  f"Net Wt: {slip['netWeight']} KG | Material: {slip['material']['name']}")
        return data
    else:
        print(f"Error {response.status_code}: {response.text}")
        return None

if __name__ == "__main__":
    fetch_live_weighment_slips(date_from="2026-09-14")
```

---

### 7.3. Node.js / JavaScript (Fetch / Axios)
```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'https://wsms-1.onrender.com/api',
  headers: {
    'x-api-key': 'ga_live_wsms_sec_99a8b7c6d5e4',
    'Content-Type': 'application/json'
  }
});

async function syncWeighmentData() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await client.get('/weighment', {
      params: {
        limit: 50,
        page: 1,
        dateFrom: today
      }
    });

    const { total, data } = response.data;
    console.log(`Total live slips today (${today}): ${total}`);
    
    data.forEach(slip => {
      console.log(`Slip #${slip.slipNumber} - Vehicle: ${slip.vehicle.vehicleNumber}, Net Weight: ${slip.netWeight} KG`);
    });

  } catch (error) {
    if (error.response) {
      console.error(`API Error [${error.response.status}]:`, error.response.data);
    } else {
      console.error('Network Error:', error.message);
    }
  }
}

syncWeighmentData();
```

---

## 8. Technical Support & Point of Contact

For integration assistance, custom webhook provisioning, or API key management:

- **System Authority**: Nagar Nigam Mathura Vrindavan — Nature Green Project
- **Lead Developer**: Yuvraj Singh Tomar
- **Email Support**: support@naturegreen.in / wsms-tech@mathuranigam.in
- **Backend Host**: Render Cloud PaaS (`wsms-backend`)
- **Database Engine**: PostgreSQL 16 (High Availability AWS Pooler)

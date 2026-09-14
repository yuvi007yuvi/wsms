const fs = require('fs');
const path = require('path');
const docx = require('docx');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, ShadingType, VerticalAlign, BorderStyle
} = docx;

// Styling tokens matching Nature Green Municipal branding
const PRIMARY_COLOR = "024E3B";   // Dark Forest Green
const SECONDARY_COLOR = "059669"; // Emerald Green
const ACCENT_COLOR = "1E3A8A";    // Navy Blue
const GRAY_BG = "F8FAFC";         // Slate 50
const LIGHT_BG = "F0FDF4";        // Mint 50
const CODE_BG = "0F172A";         // Dark Slate 900
const CODE_TEXT = "38BDF8";       // Sky 400
const DARK_TEXT = "1E293B";       // Slate 800
const MUTED_TEXT = "64748B";      // Slate 500

function createTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 300, after: 120 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 34,
        color: PRIMARY_COLOR,
        font: "Calibri"
      })
    ]
  });
}

function createSubtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 300 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 22,
        color: SECONDARY_COLOR,
        font: "Calibri"
      })
    ]
  });
}

function createHeading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 150 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 26,
        color: PRIMARY_COLOR,
        font: "Calibri"
      })
    ]
  });
}

function createHeading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 100 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 21,
        color: SECONDARY_COLOR,
        font: "Calibri"
      })
    ]
  });
}

function createHeading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 18,
        color: ACCENT_COLOR,
        font: "Calibri"
      })
    ]
  });
}

function createParagraph(text, boldPrefix = "") {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({
      text: boldPrefix + " ",
      bold: true,
      size: 21,
      color: DARK_TEXT,
      font: "Calibri"
    }));
  }
  children.push(new TextRun({
    text: text,
    size: 21,
    color: DARK_TEXT,
    font: "Calibri"
  }));

  return new Paragraph({
    spacing: { before: 60, after: 100 },
    children: children
  });
}

function createBullet(text, boldPrefix = "") {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({
      text: boldPrefix + " ",
      bold: true,
      size: 21,
      color: DARK_TEXT,
      font: "Calibri"
    }));
  }
  children.push(new TextRun({
    text: text,
    size: 21,
    color: DARK_TEXT,
    font: "Calibri"
  }));

  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 60 },
    children: children
  });
}

function createCodeBlock(codeText) {
  const lines = codeText.trim().split('\n');
  const paragraphs = lines.map(line => new Paragraph({
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({
        text: line,
        color: "E2E8F0",
        size: 18,
        font: "Consolas"
      })
    ]
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: CODE_BG, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: paragraphs
          })
        ]
      })
    ]
  });
}

function createCallout(title, text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 160, right: 160 },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40 },
                children: [
                  new TextRun({ text: `✔ ${title}: `, bold: true, color: PRIMARY_COLOR, size: 20, font: "Calibri" }),
                  new TextRun({ text: text, color: DARK_TEXT, size: 20, font: "Calibri" })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function createTableHeaderCell(text) {
  return new TableCell({
    shading: { fill: PRIMARY_COLOR, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: text,
            bold: true,
            color: "FFFFFF",
            size: 19,
            font: "Calibri"
          })
        ]
      })
    ]
  });
}

function createTableCell(text, isBold = false, isBgMint = false) {
  return new TableCell({
    shading: { fill: isBgMint ? LIGHT_BG : "FFFFFF", type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: text,
            bold: isBold,
            color: DARK_TEXT,
            size: 19,
            font: "Calibri"
          })
        ]
      })
    ]
  });
}

async function buildDoc() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440
            }
          }
        },
        children: [
          // Municipal Header Banner
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: PRIMARY_COLOR, type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 120, after: 120 },
                        children: [
                          new TextRun({
                            text: "NAGAR NIGAM MATHURA VRINDAVAN — NATURE GREEN",
                            bold: true,
                            color: "FFFFFF",
                            size: 22,
                            font: "Calibri"
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),

          createTitle("Green Assist — Live API Integration Specification"),
          createSubtitle("Real-time Municipal Weighment Data Sync, Weighbridge Telemetry & Master Data Interface"),

          // Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableHeaderCell("System Name"),
                  createTableCell("Nature Green Weighment Slip Management System (WSMS)"),
                ]
              }),
              new TableRow({
                children: [
                  createTableHeaderCell("Municipal Authority"),
                  createTableCell("Nagar Nigam Mathura Vrindavan"),
                ]
              }),
              new TableRow({
                children: [
                  createTableHeaderCell("Integration Target"),
                  createTableCell("Green Assist Central Monitoring & Analytics Platform"),
                ]
              }),
              new TableRow({
                children: [
                  createTableHeaderCell("Document Version"),
                  createTableCell("1.0 (Enterprise REST & Real-Time Stream)"),
                ]
              }),
              new TableRow({
                children: [
                  createTableHeaderCell("Developer / Contact"),
                  createTableCell("Yuvraj Singh Tomar (Nature Green Lead Developer)"),
                ]
              }),
              new TableRow({
                children: [
                  createTableHeaderCell("Primary Ingestion Method"),
                  createTableCell("REST API (JSON over HTTPS) + Socket.io Live Weight Stream", true, true),
                ]
              }),
            ]
          }),

          new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),

          // 1. Executive Summary & Integration Purpose
          createHeading1("1. Executive Summary & Integration Purpose"),
          createParagraph("The Nature Green Weighment Slip Management System (WSMS) is deployed at municipal solid waste (MSW) processing plants and weighbridge stations across Nagar Nigam Mathura Vrindavan. The platform interfaces with physical weighbridge indicators, captures loaded and tare weights, and records official municipal weighment slips."),
          createParagraph("This API interface provides Green Assist with automated, real-time access to live vehicle transactions, tonnage summaries, waste stream breakdowns (MSW, Organic, C&D), and live scale telemetry to ensure unified oversight across municipal authorities and concessionaires."),

          // 2. Server Environments & Base URLs
          createHeading1("2. Server Environments & Base URLs"),
          createParagraph("All communication must be transmitted over encrypted TLS/HTTPS. Payloads are formatted as standard JSON in Indian Standard Time (IST, UTC+05:30)."),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableHeaderCell("Environment"),
                  createTableHeaderCell("Base REST URL"),
                  createTableHeaderCell("WebSocket Stream URL"),
                  createTableHeaderCell("Purpose"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Production Cloud", true),
                  createTableCell("https://wsms-1.onrender.com/api"),
                  createTableCell("wss://wsms-1.onrender.com"),
                  createTableCell("Live Municipal Ingestion", false, true),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Edge / Local Terminal", true),
                  createTableCell("http://localhost:5000/api"),
                  createTableCell("ws://localhost:5000"),
                  createTableCell("Local Weighbridge Testing"),
                ]
              }),
            ]
          }),

          new Paragraph({ spacing: { before: 100, after: 50 }, children: [] }),
          createCallout("Standard Unit of Weight", "All weights returned by the API (grossWeight, tareWeight, netWeight) are represented in Kilograms (KG). To convert to Metric Tons (MT), divide by 1,000."),

          // 3. Authentication & Authorization
          createHeading1("3. Authentication & Authorization"),
          createParagraph("WSMS provides two authentication mechanisms. For automated server-to-server data synchronization pipelines, Method A (Static API Key) is strongly recommended."),

          createHeading2("Method A: Static API Key (Recommended for Green Assist)"),
          createParagraph("Green Assist includes a secure pre-shared key in the HTTP request headers. No login request or token refresh expiration is required:"),
          createBullet("Header Key: x-api-key", "HTTP Header:"),
          createBullet("ga_live_wsms_sec_99a8b7c6d5e4 (Rotatable by admin)", "Production API Key:"),
          createBullet("Content-Type: application/json", "Header Format:"),

          createCodeBlock(`GET /api/weighment HTTP/1.1\nHost: wsms-1.onrender.com\nx-api-key: ga_live_wsms_sec_99a8b7c6d5e4\nContent-Type: application/json`),

          createHeading2("Method B: Service Account Login (JWT Bearer Token)"),
          createParagraph("Alternatively, Green Assist may authenticate using a service account via POST /api/auth/login. The returned JWT Bearer token is valid for 12 hours."),
          createCodeBlock(`POST /api/auth/login\n{\n  "username": "greenassist_service",\n  "password": "<SECRET_PASSWORD>"\n}\n\nResponse (200 OK):\n{\n  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n  "user": { "username": "greenassist_service", "role": "operator" }\n}`),

          // 4. Core Live Data Endpoints
          createHeading1("4. Core Live Data Endpoints"),

          // 4.1 Live Weighment Slips Feed
          createHeading2("4.1 Live Weighment Slips Feed — GET /api/weighment"),
          createParagraph("Primary endpoint for continuous ingestion of live weighment slips. Supports comprehensive date filters, pagination, and multi-field keyword searching."),

          createHeading3("Query Parameters"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableHeaderCell("Parameter"),
                  createTableHeaderCell("Type"),
                  createTableHeaderCell("Required"),
                  createTableHeaderCell("Default"),
                  createTableHeaderCell("Description"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("page", true),
                  createTableCell("integer"),
                  createTableCell("No"),
                  createTableCell("1"),
                  createTableCell("Page index for pagination (1-indexed)."),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("limit", true),
                  createTableCell("integer"),
                  createTableCell("No"),
                  createTableCell("50"),
                  createTableCell("Number of records to return (Max: 1000)."),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("dateFrom", true),
                  createTableCell("string"),
                  createTableCell("No"),
                  createTableCell("—"),
                  createTableCell("Start date filter in YYYY-MM-DD format."),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("dateTo", true),
                  createTableCell("string"),
                  createTableCell("No"),
                  createTableCell("—"),
                  createTableCell("End date filter in YYYY-MM-DD format."),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("search", true),
                  createTableCell("string"),
                  createTableCell("No"),
                  createTableCell("—"),
                  createTableCell("Search slip number, vehicle plate, material, driver, or operator."),
                ]
              }),
            ]
          }),

          new Paragraph({ spacing: { before: 100, after: 50 }, children: [] }),
          createHeading3("Sample JSON Response (200 OK)"),
          createCodeBlock(`{\n  "total": 142,\n  "data": [\n    {\n      "id": "e3b0c442-98fc-1c14-9afb-4c8996fb9242",\n      "slipNumber": "WS260914-0028",\n      "date": "2026-09-14T10:14:22.000Z",\n      "grossWeight": 14280,\n      "tareWeight": 5640,\n      "netWeight": 8640,\n      "driverName": "Ramesh Kumar",\n      "remarks": "Segregated waste from Ward 12",\n      "vehicle": {\n        "vehicleNumber": "UP85-BT-4512",\n        "vehicleType": { "name": "Compactor" }\n      },\n      "material": { "name": "Municipal Solid Waste (MSW)" },\n      "source": { "name": "Ward 12 - Vrindavan Zone" },\n      "destination": { "name": "Mathura Waste-to-Energy Plant" },\n      "operator": { "username": "op_mathura_01" }\n    }\n  ]\n}`),

          // 4.2 Aggregated Weighment Summary
          createHeading2("4.2 Aggregated Weighment Summary — GET /api/weighment/summary"),
          createParagraph("Provides aggregated metrics (trip count, total gross, tare, and net weights) grouped by operational categories."),
          createBullet("reportType (Required): 'daily' | 'vehicleType' | 'source' (or 'ward') | 'destination' (or 'work')", "Parameters:"),
          createBullet("dateFrom, dateTo (Optional): Date filter window (YYYY-MM-DD)", "Date Filter:"),
          createCodeBlock(`GET /api/weighment/summary?reportType=vehicleType&dateFrom=2026-09-01&dateTo=2026-09-14\n\nResponse (200 OK):\n{\n  "data": [\n    {\n      "key": "Compactor",\n      "count": 48,\n      "grossWeight": 724800,\n      "tareWeight": 288000,\n      "netWeight": 436800\n    },\n    {\n      "key": "Auto Tipper",\n      "count": 115,\n      "grossWeight": 287500,\n      "tareWeight": 138000,\n      "netWeight": 149500\n    }\n  ]\n}`),

          // 4.3 Executive Dashboard Stats
          createHeading2("4.3 Real-Time Dashboard KPIs — GET /api/dashboard/stats"),
          createParagraph("Returns real-time operational statistics, today vs. yesterday trends, and 7-day daily weight trend curves."),
          createCodeBlock(`GET /api/dashboard/stats\n\nResponse (200 OK):\n{\n  "summary": {\n    "totalSlips": 84,\n    "totalNetWeight": 412500,\n    "totalGrossWeight": 798200,\n    "avgNetWeightPerSlip": 4910.71\n  },\n  "charts": {\n    "dailyTrend": [\n      { "date": "2026-09-14", "netWeight": 412500, "grossWeight": 798200, "slips": 84 }\n    ]\n  }\n}`),

          // 4.4 Weighbridge Telemetry
          createHeading2("4.4 Live Weighbridge Scale Stream & Telemetry"),
          createParagraph("Allows Green Assist to inspect current physical weighbridge scale indicators and monitor live weight readings."),
          createBullet("GET /api/system/diagnose-weighbridge: Returns current scale status, port, last weight, and data stream health.", "REST Snapshot:"),
          createBullet("WebSocket connection to wss://wsms-1.onrender.com listening for 'weight-update' events.", "Socket.io Stream:"),
          createCodeBlock(`// Socket.io Broadcast Event: "weight-update"\n{\n  "weight": 14250,\n  "status": "Stable"\n}`),

          // 4.5 Master Reference Data
          createHeading2("4.5 Master Reference Data Lookups"),
          createParagraph("Green Assist can synchronize master catalogs to translate IDs into registered municipal entities:"),
          createBullet("GET /api/master/vehicles — Complete vehicle fleet registration and tare weights.", "Fleet Catalog:"),
          createBullet("GET /api/master/vehicle-types — Vehicle categories (Dumper, Compactor, Tipper, Auto Tipper).", "Vehicle Types:"),
          createBullet("GET /api/master/materials — Registered waste streams (MSW, Organic Waste, C&D Waste).", "Materials:"),
          createBullet("GET /api/master/sources — Origin wards, zones, and sanitary sectors.", "Origins / Wards:"),
          createBullet("GET /api/master/destinations — Municipal processing facilities, RDF plants, and dumpsites.", "Destinations:"),

          // 5. Ingestion Best Practices
          createHeading1("5. Ingestion Best Practices for Green Assist"),
          createBullet("Polling Interval: A polling frequency of 30 to 60 seconds is recommended for slip synchronization.", "Cadence:"),
          createBullet("Deduplication: Use the slipNumber field (e.g., WS260914-0028) as the unique primary key for deduplication.", "Primary Key:"),
          createBullet("Incremental Fetching: Request dateFrom=YYYY-MM-DD matching the current date to only fetch the day's records.", "Optimization:"),
          createBullet("Error Handling: Implement exponential backoff (1s, 2s, 4s, 8s) upon encountering HTTP 5xx or network timeouts.", "Resilience:"),

          // 6. Ready-to-Use Code Samples
          createHeading1("6. Ready-to-Use Code Samples"),

          createHeading2("Python (Requests)"),
          createCodeBlock(`import requests\n\nURL = "https://wsms-1.onrender.com/api/weighment"\nHEADERS = {\n    "x-api-key": "ga_live_wsms_sec_99a8b7c6d5e4",\n    "Content-Type": "application/json"\n}\n\nresponse = requests.get(URL, headers=HEADERS, params={"limit": 50, "dateFrom": "2026-09-14"})\nif response.status_code == 200:\n    result = response.json()\n    print(f"Total Slips: {result['total']}")\n    for slip in result['data']:\n        print(f"Slip: {slip['slipNumber']} | Net: {slip['netWeight']} KG")`),

          createHeading2("Node.js / JavaScript (Axios)"),
          createCodeBlock(`const axios = require('axios');\n\nasync function fetchLiveSlips() {\n  const res = await axios.get('https://wsms-1.onrender.com/api/weighment', {\n    headers: { 'x-api-key': 'ga_live_wsms_sec_99a8b7c6d5e4' },\n    params: { limit: 50, dateFrom: '2026-09-14' }\n  });\n  console.log(\`Received \${res.data.data.length} slips out of \${res.data.total}\`);\n}\nfetchLiveSlips();`),

          createHeading2("cURL (Shell Command)"),
          createCodeBlock(`curl -X GET "https://wsms-1.onrender.com/api/weighment?limit=50&dateFrom=2026-09-14" \\\n  -H "x-api-key: ga_live_wsms_sec_99a8b7c6d5e4" \\\n  -H "Content-Type: application/json"`),

          // 7. Support & Point of Contact
          createHeading1("7. Technical Support & Point of Contact"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableHeaderCell("Contact / Role"),
                  createTableHeaderCell("Details"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Municipal Project", true),
                  createTableCell("Nagar Nigam Mathura Vrindavan — Nature Green WSMS"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Lead System Developer", true),
                  createTableCell("Yuvraj Singh Tomar"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Technical Support Email", true),
                  createTableCell("support@naturegreen.in / wsms-tech@mathuranigam.in"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Cloud Infrastructure", true),
                  createTableCell("Render Cloud PaaS (Node.js/Express) + Supabase AWS PostgreSQL"),
                ]
              }),
            ]
          }),
        ]
      }
    ]
  });

  const outputPath = path.resolve(__dirname, '..', 'GREEN_ASSIST_API_DOCUMENTATION.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Successfully generated Word Document at: ${outputPath}`);
}

buildDoc().catch(err => {
  console.error("Error generating document:", err);
  process.exit(1);
});

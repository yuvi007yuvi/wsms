const fs = require('fs');
const path = require('path');
const docx = require('docx');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, ShadingType, VerticalAlign
} = docx;

// Styling tokens
const PRIMARY_COLOR = "024E3B"; // Dark Green
const SECONDARY_COLOR = "059669"; // Emerald Green
const ACCENT_COLOR = "1E3A8A"; // Navy Blue
const GRAY_BG = "F8FAFC"; // Slate 50
const LIGHT_BG = "F0FDF4"; // Light Mint
const DARK_TEXT = "1E293B"; // Slate 800

function createTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 300, after: 120 },
    children: [
      new TextRun({
        text: text,
        bold: true,
        size: 36,
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
        size: 24,
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
        size: 28,
        color: PRIMARY_COLOR,
        font: "Calibri"
      })
    ]
  });
}

function createHeading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 250, after: 100 },
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
      size: 22,
      color: DARK_TEXT,
      font: "Calibri"
    }));
  }
  children.push(new TextRun({
    text: text,
    size: 22,
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
      size: 22,
      color: DARK_TEXT,
      font: "Calibri"
    }));
  }
  children.push(new TextRun({
    text: text,
    size: 22,
    color: DARK_TEXT,
    font: "Calibri"
  }));

  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 60 },
    children: children
  });
}

function createTableHeaderCell(text) {
  return new TableCell({
    shading: { fill: PRIMARY_COLOR, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: text,
            bold: true,
            color: "FFFFFF",
            size: 20,
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
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: text,
            bold: isBold,
            color: DARK_TEXT,
            size: 20,
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
          // Header Metadata Table
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
                        spacing: { before: 100, after: 100 },
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

          createTitle("NATURE GREEN — WSMS"),
          createSubtitle("Weighment Slip Management System — Features, Functionality, Pricing & Maintenance Specification"),

          // Meta Info Table
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
                  createTableHeaderCell("Client / Authority"),
                  createTableCell("Nagar Nigam Mathura Vrindavan"),
                ]
              }),
              new TableRow({
                children: [
                  createTableHeaderCell("Developer"),
                  createTableCell("Yuvraj Singh Tomar"),
                ]
              }),
              new TableRow({
                children: [
                  createTableHeaderCell("Document Version"),
                  createTableCell("1.2 (Includes Maintenance Coverage & Commercial Pricing)"),
                ]
              }),
              new TableRow({
                children: [
                  createTableHeaderCell("Technology Stack"),
                  createTableCell("React (TypeScript), Vite, Express, Prisma ORM, Socket.io, Tailwind CSS"),
                ]
              }),
            ]
          }),

          new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),

          // 1. Executive Summary
          createHeading1("1. Executive Summary & System Purpose"),
          createParagraph("The Nature Green Weighment Slip Management System (WSMS) is an enterprise-grade, industrial web application designed for waste management, municipal solid waste (MSW) tracking, and weighbridge operations for Nagar Nigam Mathura Vrindavan."),
          createParagraph("The software bridges physical weighbridge hardware with modern cloud technology, providing real-time weight reading, ticket printing, operational analytics, master data management, full software maintenance inclusion, commercial licensing options, and offline-first resilience for uninterrupted site operations."),

          // 2. Technical Architecture & Infrastructure
          createHeading1("2. Technical Architecture & System Infrastructure"),
          createHeading2("2.1 Frontend Architecture"),
          createBullet("Built with React 18, TypeScript, and Vite for fast performance and strong type safety.", "Core Framework:"),
          createBullet("Tailwind CSS with custom slate and emerald green palette matching Nature Green branding.", "UI & Styling:"),
          createBullet("Recharts library providing interactive Area, Bar, Line, and Pie charts.", "Data Visualization:"),
          createBullet("Full English and Hindi (हिन्दी) localization powered by i18next.", "Multilingual (i18n):"),
          createBullet("Browser printing stylesheet tuned for 3-ticket thermal & dot-matrix printers.", "Printing Engine:"),

          createHeading2("2.2 Backend & Real-time Integration"),
          createBullet("Node.js with Express framework providing RESTful API endpoints.", "Server Framework:"),
          createBullet("Prisma ORM connected to SQLite (local) and PostgreSQL (cloud DB).", "Database Layer:"),
          createBullet("Socket.io for low-latency streaming of serial COM port weighbridge data.", "Real-time Stream:"),
          createBullet("JWT authentication with HTTP-only cookies and bcrypt password hashing.", "Security:"),

          createHeading2("2.3 Offline-First Cloud Synchronization Engine"),
          createBullet("All weighment operations execute against a high-speed local database (`prisma.syncQueue`).", "Offline Resilience:"),
          createBullet("A background service (`sync.service.ts`) periodically syncs queued transactions to the cloud database every 10 seconds.", "Background Worker:"),
          createBullet("Live status badge displays online status, pending queue count, and last sync timestamp.", "UI Health Indicator:"),
          createBullet("Allows operators to force manual batch synchronization with progress bar monitoring.", "Manual Sync Trigger:"),

          // 3. Core Functional Modules
          createHeading1("3. Core Functional Modules"),

          // 3.1 Authentication & Diagnostics
          createHeading2("3.1 Authentication & System Diagnostics Module"),
          createBullet("Split-screen branded login screen with Nature Green logo and operational disclaimer.", "Operator Login:"),
          createBullet("Password visibility toggle (Eye/EyeOff) and input sanitization.", "User Security:"),
          createBullet("Real-time modal inspecting Backend health, Database status, Serial COM hardware ports, Node.js version, NPM, PM2, and system memory.", "System Diagnostics Modal:"),

          // 3.2 Executive Dashboard
          createHeading2("3.2 Executive Dashboard & Real-time Operational Analytics"),
          createBullet("Slips Today, Total Net Weight (KG), Total Gross Weight, Vehicle Visits, Avg Net Wt per slip, and Peak Operational Hour.", "Key Performance Indicators (6 Cards):"),
          createBullet("Date range selector (Custom From/To, Today, 7 Days, 30 Days, All Time), Vehicle Type, Material, and Ward/Work Source.", "Filter Bar:"),
          createBullet("Dual Y-axis Area Chart showing daily net vs gross weight trends over the last 7 days.", "7-Day Daily Trend Chart:"),
          createBullet("Combined Bar and Line chart breaking down slips generated and weight processed per 2-hour block.", "Hourly Activity Chart:"),
          createBullet("Donut charts detailing collection weights per vehicle type and material category.", "Vehicle & Material Breakdown:"),
          createBullet("Tables calculating collection volume and percentage share per Ward/Work and Destination plant.", "Source & Destination Share Tables:"),
          createBullet("Live feed displaying the 5 most recent weighment transactions.", "Recent Activity Feed:"),

          // 3.3 Weighment Entry & Slip Generation
          createHeading2("3.3 Weighment Entry & Slip Generation Module"),
          createBullet("Industrial LED-style digital display with live weight streaming and connection state tags (Conn, Read, Stab, Disc).", "Live Weight Display:"),
          createBullet("Allows testing without physical weighbridge hardware using simulated smooth weight transitions.", "Weighbridge Mock Mode:"),
          createBullet("Optional manual weight override toggle for emergency fallback or offline operations.", "Manual Weight Input:"),
          createBullet("Searchable vehicle selector that automatically fetches registered vehicle type, driver name, and tare weight.", "Smart Vehicle Auto-fill:"),
          createBullet("Automatic real-time calculation: Net Weight = Gross Weight - Tare Weight.", "Weight Calculation:"),
          createBullet("Validates mandatory selections and checks that Tare Weight and Net Weight are positive.", "Field Validation:"),
          createBullet("Generates a standardized 3-copy layout per page (Driver Copy, Operator Copy, Municipal Archive Copy) formatted with Nagar Nigam Mathura Vrindavan header, party name (Nature Green), driver & operator signature blocks.", "3-Copy Ticket Printing Layout:"),

          // 3.4 Master Data Management
          createHeading2("3.4 Master Data Management (MDM) Module"),
          createBullet("Manage fleet list, vehicle registration numbers, vehicle type association, driver info, and tare weight.", "Vehicle Master:"),
          createBullet("Categorize vehicles (e.g., Dumper, Compactor, Tipper, Auto Tipper).", "Vehicle Type Master:"),
          createBullet("Register waste categories (e.g., MSW, Organic Waste, Dry Recyclables, C&D Waste).", "Material Master:"),
          createBullet("Register collection origins, zones, wards, and work locations.", "Source Master (Ward & Work):"),
          createBullet("Manage processing plants, RDF facilities, landfills, with option to set a default destination.", "Destination Master:"),
          createBullet("Integrated Excel and CSV upload/download buttons on every master table for batch processing.", "Bulk Import / Export:"),

          // 3.5 Slip History & Audit Reports
          createHeading2("3.5 Slip History & Audit Reporting Module"),
          createBullet("Complete audit log of generated weighment slips with Sr. No., Slip Number, Date/Time, Vehicle, Material, Operator, Gross Wt, Tare Wt, Net Wt, and Remarks.", "Transaction History Table:"),
          createBullet("Multi-parameter search bar combined with date filters and preset ranges.", "Search & Filter Engine:"),
          createBullet("Instant total calculation of gross weight, net weight, and slip count for filtered data.", "Summary Statistics Bar:"),
          createBullet("Export filtered records directly to a formatted CSV file.", "CSV Data Export:"),
          createBullet("Admin users can permanently delete invalid slips with deletion audit confirmation.", "Admin Slip Deletion:"),

          // 3.6 User Management & Permissions
          createHeading2("3.6 User Management & Role Permission Matrix"),
          createBullet("Create, edit, and deactivate system accounts with full name, designation, username, password, and role.", "User Account Provisioning:"),
          createBullet("Supports Admin, Manager, Supervisor, and Operator roles.", "Role Assignment:"),
          createBullet("Admins can dynamically toggle module visibility per role, restricting unauthorized access to administrative screens.", "Granular Role Permission Matrix:"),

          // 3.7 Pricing & Commercial Subscriptions with Included Maintenance
          createHeading1("3.7 Commercial Pricing & Maintenance Coverage Module"),
          createParagraph("The WSMS platform offers transparent, scalable commercial subscription plans tailored for individual weighbridge sites, municipal corporations, and enterprise waste management concessionaires."),
          createParagraph("Crucially, 100% of Software Maintenance, Version Updates, Bug Fixes, Security Patches, and Database Health Monitoring are fully INCLUDED in all subscription plans without any hidden charges or annual maintenance contract (AMC) add-ons.", "Maintenance Policy:"),

          createHeading2("3.7.1 Subscription Tiers (Monthly vs. Annual Savings)"),
          
          // Pricing Summary Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableHeaderCell("Plan Name"),
                  createTableHeaderCell("Monthly Price"),
                  createTableHeaderCell("Annual Price (20% Off)"),
                  createTableHeaderCell("Maintenance & Support"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Starter Site Plan", true),
                  createTableCell("₹2,499 / weighbridge / mo"),
                  createTableCell("₹1,999 / weighbridge / mo (₹23,988 / yr)", false, true),
                  createTableCell("INCLUDED (Software updates & email support)", true),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Municipal Professional Plan", true),
                  createTableCell("₹5,999 / weighbridge / mo"),
                  createTableCell("₹4,799 / weighbridge / mo (₹57,588 / yr)", false, true),
                  createTableCell("INCLUDED (Priority updates, phone & cloud backup)", true),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Enterprise Corporate Plan", true),
                  createTableCell("₹12,499 / site / mo"),
                  createTableCell("₹9,999 / site / mo (₹1,19,988 / yr)", false, true),
                  createTableCell("INCLUDED (24/7 Managed SLA & hardware support)", true),
                ]
              }),
            ]
          }),

          new Paragraph({ spacing: { before: 150, after: 50 }, children: [] }),

          createHeading2("3.7.2 Feature & Maintenance Capability Matrix"),

          // Feature Comparison Matrix Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableHeaderCell("Feature / Capability"),
                  createTableHeaderCell("Starter Site"),
                  createTableHeaderCell("Municipal Professional"),
                  createTableHeaderCell("Enterprise Corporate"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Software Maintenance & Bug Fixes", true),
                  createTableCell("INCLUDED (Free)", false, true),
                  createTableCell("INCLUDED (Free)", false, true),
                  createTableCell("INCLUDED (Free)", false, true),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("System & Security Updates", true),
                  createTableCell("INCLUDED (Routine)", false, true),
                  createTableCell("INCLUDED (Priority)", false, true),
                  createTableCell("INCLUDED (Managed SLA)", false, true),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Weighbridge Terminals", true),
                  createTableCell("1 Terminal"),
                  createTableCell("Up to 5 Terminals"),
                  createTableCell("Unlimited"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Monthly Weighment Slips", true),
                  createTableCell("5,000 / month"),
                  createTableCell("Unlimited"),
                  createTableCell("Unlimited"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Cloud Database Synchronization", true),
                  createTableCell("Manual Export Only"),
                  createTableCell("Real-time (Every 10 Seconds)"),
                  createTableCell("Instant / Dedicated Database"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Executive Dashboard Analytics", true),
                  createTableCell("Basic KPI Summary"),
                  createTableCell("Full 7-Day & Hourly Charts"),
                  createTableCell("Multi-Plant Aggregated BI"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Role Permission Matrix", true),
                  createTableCell("2 Fixed Roles"),
                  createTableCell("Dynamic 4-Role Matrix"),
                  createTableCell("Custom Role Definitions"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Hardware Stream & Drivers", true),
                  createTableCell("Serial COM Standard"),
                  createTableCell("Serial COM + Socket.io Stream"),
                  createTableCell("Custom Drivers + ANPR API"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Support SLA Level", true),
                  createTableCell("Email (48-hour SLA)"),
                  createTableCell("Priority Phone (4-hour SLA)"),
                  createTableCell("24/7 Dedicated SLA (1-hour)"),
                ]
              }),
            ]
          }),

          // 4. Verification & Testing Standards
          createHeading1("4. Quality Assurance & System Verification"),
          createBullet("Validated against multi-user access and concurrent weighment slip creation.", "Functional Verification:"),
          createBullet("Verified offline queueing by disconnecting network and syncing offline slips back to cloud database without data loss.", "Sync Resilience Testing:"),
          createBullet("Verified pixel-perfect alignment for 3-copy ticket layout across standard thermal and matrix printers.", "Print Layout Verification:"),
          createBullet("Verified interactive monthly/annual pricing toggle, maintenance inclusion badges, and capability matrix.", "Pricing & Maintenance Module Verification:"),

          // Document Footer
          new Paragraph({ spacing: { before: 400, after: 100 }, children: [] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: GRAY_BG, type: ShadingType.CLEAR },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 80, after: 80 },
                        children: [
                          new TextRun({
                            text: "Confidential — Property of Nature Green & Nagar Nigam Mathura Vrindavan | Designed & Developed by Yuvraj Singh Tomar",
                            bold: true,
                            color: "64748B",
                            size: 16,
                            font: "Calibri"
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, '../WSMS_Feature_Functionality_and_Pricing_Document.docx');
  const mainPath = path.join(__dirname, '../WSMS_Feature_and_Functionality_Document.docx');
  
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document successfully generated at: ${outputPath}`);
  
  try {
    fs.writeFileSync(mainPath, buffer);
    console.log(`Document also updated at: ${mainPath}`);
  } catch (err) {
    console.log(`Note: ${mainPath} is currently open in Word. Created copy at ${outputPath}`);
  }
}

buildDoc().catch(err => {
  console.error("Error generating Word document:", err);
  process.exit(1);
});

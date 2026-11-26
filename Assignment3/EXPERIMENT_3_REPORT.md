# RV College of Engineering / Department of Computer Science & Engineering
## Laboratory Record - Experiment 3

**Student Name:** Bishal Shrestha  
**USN / Roll No:** 24BTRCN091  
**Section / Branch:** CSE GEN 'A'  
**Subject:** Backend Programming Laboratory  
**Experiment Title:** Dining Management System using Express.js with Full CRUD, Alter Operation, and Admin Approvals

---

### 1. Aim of the Experiment
To design and develop a full-stack Dining Management System using Node.js and Express.js that supports:
1. Complete CRUD operations (Create, Read, Update, Delete) for banquet hall dining reservations.
2. An **Alter Operation** (`PATCH /api/customers/:id/alter`) that allows clients to append custom specifications and add-on facilities (catering packages, audio systems, stage decoration, VIP sections, AC) logged separately into `alter.json`.
3. A basic **Admin Panel** to review pending requests and approve/confirm bookings via 1-click status transitions (`PATCH /api/customers/:id/status`) and bulk confirmation (`POST /api/admin/confirm-all`).
4. Strict validation rules: sequential customer IDs (`CUST001`, `CUST002`), alphabetic-only customer names, 10-digit mobile numbers, future event date validation, and immutability of primary key attributes (`customerId` and `customerName`).

---

### 2. Software & Hardware Requirements
* **Operating System:** macOS / Linux / Windows
* **Runtime Environment:** Node.js (v18+)
* **Framework:** Express.js (v4.19+)
* **Data Storage:** JSON Flat-file Persistence (`requests.json` and `alter.json`)
* **Frontend:** HTML5, CSS3, JavaScript (Fetch API, DOM manipulation)

---

### 3. System Architecture & Data Flow

```
[ Frontend Client (HTML5 / Vanilla JS) ]
          │
          ├── 1. POST /api/requests (Create Registration) ──────────────────┐
          ├── 2. GET  /api/requests (Fetch All Bookings)                    │
          ├── 3. PUT  /api/customers/:id (Update Dimensions/Contact)        ▼
          ├── 4. PATCH /api/customers/:id/alter (Add Alterations/Add-ons) ──┼──> [ requests.json ]
          ├── 5. DELETE /api/customers/:id (Delete Registration)           │    (Master DB)
          ├── 6. PATCH /api/customers/:id/status (Admin 1-Click Confirm)   │
          └── 7. GET  /api/alterations (View Alter Log) ────────────────────┴──> [ alter.json ]
                                                                                (Alteration Audit Log)
```

#### Dual Storage Architecture:
1. **Master Records (`data/requests.json`)**: Contains full customer details, dimensions, auto-calculated table configurations, seating counts, layout options, and current booking status (`Pending`, `Confirmed`, `Altered`, `Cancelled`).
2. **Alteration Log (`data/alter.json`)**: Contains lean, audit-focused records of only modified facilities, custom added specifications, timestamps, and justification notes.

---

### 4. RESTful API Endpoints Implemented

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/requests` | Fetches all banquet registrations. |
| `POST` | `/api/requests` | Creates a new customer registration with layout generation. |
| `PUT` | `/api/customers/:id` | Modifies hall dimensions, tables, contact info (Name & ID are immutable). |
| `PATCH` | `/api/customers/:id/alter` | Appends custom add-ons, stage decoration, and notes to `alter.json`. |
| `DELETE` | `/api/customers/:id/alter` | Reverts all altered add-ons and restores standard Confirmed status. |
| `DELETE` | `/api/customers/:id` | Deletes a customer registration from both master and alter files. |
| `PATCH` | `/api/customers/:id/status` | Admin 1-click status update (`Confirmed`, `Pending`, `Cancelled`). |
| `POST` | `/api/admin/confirm-all` | Bulk-approves all pending registrations in one transaction. |
| `GET` | `/api/alterations` | Reads all audit records from `alter.json`. |
| `DELETE` | `/api/alterations/:id` | Deletes an individual alteration log entry. |

---

### 5. Core Source Code

#### 5.1 `package.json`
```json
{
  "name": "dining-management-system-experiment-3",
  "version": "1.0.0",
  "description": "Dining Management System Exp 3 using Node.js, Express.js, CRUD & Alter",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
```

#### 5.2 `server.js` (Key Excerpts)
```javascript
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

const ROOT = __dirname;
const EXP2_DATA_FILE = path.join(ROOT, "..", "Assignment2", "data", "requests.json");
const ALTER_DATA_FILE = path.join(ROOT, "data", "alter.json");

app.use(express.json());
app.use(express.static(ROOT));

// 1. Read / Write Helpers
function readRequests() {
    try {
        return JSON.parse(fs.readFileSync(EXP2_DATA_FILE, "utf8"));
    } catch (e) {
        return [];
    }
}

function saveRequests(data) {
    fs.writeFileSync(EXP2_DATA_FILE, JSON.stringify(data, null, 4), "utf8");
}

function readAlterations() {
    try {
        return JSON.parse(fs.readFileSync(ALTER_DATA_FILE, "utf8"));
    } catch (e) {
        return [];
    }
}

// 2. Validation with Strict Rules
function validateRequest(data, isUpdate = false) {
    if (!data.customerName || /\d/.test(data.customerName)) {
        return "Customer name is required and cannot contain numbers.";
    }
    if (!/^[0-9]{10}$/.test(data.phone)) {
        return "Phone number must be exactly 10 digits.";
    }
    if (data.hallLength <= 0 || data.hallWidth <= 0) {
        return "Hall dimensions must be positive numbers.";
    }
    if (data.tableCount < 1 || data.tableCount > 100) {
        return "Table count must be between 1 and 100.";
    }
    return null;
}

// 3. Update with Immutability Checks
app.put("/api/customers/:id", (req, res) => {
    const id = req.params.id;
    const requests = readRequests();
    const target = requests.find(r => r.customerId.toLowerCase() === id.toLowerCase());

    if (!target) return res.status(404).json({ success: false, message: "Not found" });

    // Primary Key Immutability
    if (req.body.customerId && req.body.customerId !== target.customerId) {
        return res.status(400).json({ success: false, message: "Customer ID is immutable." });
    }
    if (req.body.customerName && req.body.customerName !== target.customerName) {
        return res.status(400).json({ success: false, message: "Customer Name is immutable." });
    }

    target.phone = req.body.phone || target.phone;
    target.hallLength = Number(req.body.hallLength) || target.hallLength;
    target.hallWidth = Number(req.body.hallWidth) || target.hallWidth;
    target.tableCount = Number(req.body.tableCount) || target.tableCount;
    target.chairsPerTable = Number(req.body.chairsPerTable) || target.chairsPerTable;
    target.totalChairs = target.tableCount * target.chairsPerTable;
    target.updatedAt = new Date().toISOString();

    saveRequests(requests);
    res.json({ success: true, request: target });
});

// 4. Alter Operation (PATCH /alter)
app.patch("/api/customers/:id/alter", (req, res) => {
    const id = req.params.id;
    const requests = readRequests();
    const target = requests.find(r => r.customerId.toLowerCase() === id.toLowerCase());

    if (!target) return res.status(404).json({ success: false, message: "Not found" });

    target.status = req.body.status || "Altered";
    target.addOns = req.body.addOns || target.addOns;
    target.alterationNotes = req.body.alterationNotes || target.alterationNotes;
    target.alteredAt = new Date().toISOString();

    saveRequests(requests);

    // Save to alter.json
    const alterations = readAlterations();
    alterations.push({
        alterationId: "ALT" + Date.now().toString().slice(-6),
        customerId: target.customerId,
        customerName: target.customerName,
        addOns: target.addOns,
        notes: target.alterationNotes,
        alteredAt: target.alteredAt
    });
    fs.writeFileSync(ALTER_DATA_FILE, JSON.stringify(alterations, null, 4), "utf8");

    res.json({ success: true, request: target });
});

// 5. Admin Fast Status Confirmation
app.patch("/api/customers/:id/status", (req, res) => {
    const { status } = req.body;
    const requests = readRequests();
    const target = requests.find(r => r.customerId.toLowerCase() === req.params.id.toLowerCase());
    if (!target) return res.status(404).json({ success: false, message: "Not found" });

    target.status = status;
    target.admin = "Admin";
    target.updatedAt = new Date().toISOString();
    saveRequests(requests);
    res.json({ success: true, request: target });
});

app.listen(PORT, () => console.log(`Exp 3 running at http://localhost:${PORT}`));
```

---

### 6. Sample JSON Data Records

#### 6.1 Master Record (`requests.json`)
```json
[
    {
        "customerId": "CUST001",
        "customerName": "Alice Walker",
        "phone": "9876543210",
        "hallLength": 15,
        "hallWidth": 10,
        "tableCount": 7,
        "chairsPerTable": 4,
        "totalChairs": 28,
        "eventDay": "Saturday",
        "eventDate": "2026-11-20",
        "status": "Confirmed",
        "admin": "Admin",
        "addOns": {
            "catering": "Premium Dining",
            "soundSystem": true,
            "stageDecoration": true,
            "airConditioning": true,
            "customSpecifications": ["Floral Arch", "Projector & Screen"]
        }
    }
]
```

#### 6.2 Alteration Record (`alter.json`)
```json
[
    {
        "alterationId": "ALT842019",
        "customerId": "CUST001",
        "customerName": "Alice Walker",
        "status": "Altered",
        "addOns": {
            "catering": "Premium Dining",
            "soundSystem": true,
            "stageDecoration": true,
            "customSpecifications": ["Floral Arch", "Projector & Screen"]
        },
        "alterationNotes": "Customer requested premium catering upgrade and stage floral arch.",
        "alteredAt": "2026-11-15T18:30:00.000Z"
    }
]
```

---

### 7. Results & Observations
1. **CRUD Functionality**: Successful registration creation, dynamic layout computation, reading of all records, modification of hall setup, and record deletion were achieved with proper HTTP status codes (`201 Created`, `200 OK`, `400 Bad Request`, `404 Not Found`).
2. **Immutability Enforcement**: The backend reliably prevented accidental alteration of primary identifiers (`customerId` and `customerName`).
3. **Audit Isolation**: Alteration data was correctly written to both the master record and the isolated `alter.json` file for auditing purposes.
4. **Admin Approval Workflow**: Allowed instant 1-click status transitions (`Pending` ➔ `Confirmed` / `Cancelled`) and bulk approvals without complex auth overhead.

---

### 8. Conclusion
The Dining Management System for Experiment 3 was successfully designed, implemented, and verified using Express.js and Node.js. It meets all practical curriculum specifications for RESTful API architecture, JSON persistence, data validation, and transactional auditing.

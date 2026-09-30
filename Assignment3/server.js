const express = require("express");
const fs = require("fs");
const path = require("path");

/* ==========================================================================
   Session 1: Server Configuration & Data Paths (Routed to Experiment 2)
   ========================================================================== */
const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// Direct route to Experiment 2 requests.json (avoiding duplicate JSON files)
const EXP2_DATA_FILE = path.resolve(ROOT, "..", "Assignment2", "data", "requests.json");

// Experiment 3 Alteration records file (stores only essential fields on alter)
const ALTER_DATA_DIR = path.resolve(ROOT, "data");
const ALTER_DATA_FILE = path.join(ALTER_DATA_DIR, "alter.json");

/* ==========================================================================
   Session 2: Express Middleware & Static Asset Serving
   ========================================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(ROOT));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});

/* ==========================================================================
   Session 3: Data Storage Helpers (Experiment 2 Source & Alter JSON)
   ========================================================================== */
function readRequests() {
    try {
        if (!fs.existsSync(EXP2_DATA_FILE)) return [];
        const raw = fs.readFileSync(EXP2_DATA_FILE, "utf8");
        const list = JSON.parse(raw);
        return list.map(item => {
            if (!item.customerId && item.reqId) {
                item.customerId = item.reqId.replace(/^REQ/i, "CUST");
            }
            if (!item.reqId && item.customerId) {
                item.reqId = item.customerId.replace(/^CUST/i, "REQ");
            }
            if (!item.status) {
                item.status = "Confirmed";
            }
            return item;
        });
    } catch (error) {
        console.error("Error reading Experiment 2 data:", error.message);
        return [];
    }
}

function saveRequests(requests) {
    fs.writeFileSync(EXP2_DATA_FILE, JSON.stringify(requests, null, 4), "utf8");
}

function readAlterations() {
    try {
        if (!fs.existsSync(ALTER_DATA_FILE)) return [];
        return JSON.parse(fs.readFileSync(ALTER_DATA_FILE, "utf8"));
    } catch (error) {
        console.error("Error reading alter.json:", error.message);
        return [];
    }
}

function saveAlterationRecord(target, alterationNotes, addOns, status) {
    if (!fs.existsSync(ALTER_DATA_DIR)) {
        fs.mkdirSync(ALTER_DATA_DIR, { recursive: true });
    }

    const alterations = readAlterations();
    const cleanRecord = {
        customerId: target.customerId || target.reqId,
        customerName: target.customerName,
        phone: target.phone,
        eventDate: target.eventDate,
        status: status || target.status || "Altered",
        addOns: addOns || target.addOns || {},
        alterationNotes: String(alterationNotes || target.alterationNotes || "").trim(),
        alteredAt: new Date().toISOString()
    };

    const targetId = cleanRecord.customerId.toLowerCase();
    const existingIndex = alterations.findIndex(a =>
        a.customerId && a.customerId.toLowerCase() === targetId
    );

    if (existingIndex >= 0) {
        alterations[existingIndex] = cleanRecord;
    } else {
        alterations.push(cleanRecord);
    }

    fs.writeFileSync(ALTER_DATA_FILE, JSON.stringify(alterations, null, 4), "utf8");
    return cleanRecord;
}

function removeAlterationRecord(id) {
    if (!fs.existsSync(ALTER_DATA_FILE)) return;
    try {
        const alterations = readAlterations();
        const filtered = alterations.filter(a =>
            a.customerId && a.customerId.toLowerCase() !== id.toLowerCase()
        );
        fs.writeFileSync(ALTER_DATA_FILE, JSON.stringify(filtered, null, 4), "utf8");
    } catch (e) {}
}

/* ==========================================================================
   Session 4: Validation & Layout Calculation Helpers
   ========================================================================== */
function getNextCustomerId(requests) {
    let max = 0;
    requests.forEach(r => {
        const id = r.customerId || r.reqId || "";
        const m = id.match(/^(?:CUST|REQ|C)?(\d+)$/i);
        if (m) {
            max = Math.max(max, Number(m[1]));
        }
    });
    return "CUST" + String(max + 1).padStart(3, "0");
}

function getNextRequestId(requests) {
    let max = 0;
    requests.forEach(r => {
        const id = r.reqId || r.customerId || "";
        const m = id.match(/^(?:REQ|CUST|R)?(\d+)$/i);
        if (m) {
            max = Math.max(max, Number(m[1]));
        }
    });
    return "REQ" + String(max + 1).padStart(3, "0");
}

function validateRequest(data, isUpdate = false) {
    if (!isUpdate || data.customerId !== undefined) {
        if (!data.customerId || !String(data.customerId).trim()) {
            return "Customer ID is required and cannot be empty.";
        }
    }

    if (!data.customerName || !String(data.customerName).trim()) {
        return "Customer name is required.";
    }

    if (!/^[0-9]{10}$/.test(String(data.phone || "").trim())) {
        return "Phone number must contain exactly 10 digits.";
    }

    const hallLength = Number(data.hallLength);
    if (!Number.isFinite(hallLength) || hallLength <= 0) {
        return "Hall length must be greater than 0.";
    }

    const hallWidth = Number(data.hallWidth);
    if (!Number.isFinite(hallWidth) || hallWidth <= 0) {
        return "Hall width must be greater than 0.";
    }

    const tableCount = Number(data.tableCount);
    if (!Number.isInteger(tableCount) || tableCount < 1 || tableCount > 100) {
        return "Table count must be an integer between 1 and 100.";
    }

    const chairsPerTable = Number(data.chairsPerTable);
    if (!Number.isInteger(chairsPerTable) || chairsPerTable < 1 || chairsPerTable > 12) {
        return "Chairs per table must be an integer between 1 and 12.";
    }

    if (!data.eventDay) return "Event day is required.";
    if (!data.eventDate) return "Event date is required.";

    if (!["automatic", "compact", "spacious"].includes(data.layoutPreference)) {
        return "Invalid layout preference.";
    }

    if (!["Yes", "No"].includes(data.remarksRequired)) {
        return "Invalid remarks option.";
    }

    return null;
}

function validateLayoutInput(data) {
    const hallLength = Number(data.hallLength);
    if (!Number.isFinite(hallLength) || hallLength <= 0) return "Hall length must be greater than 0.";
    const hallWidth = Number(data.hallWidth);
    if (!Number.isFinite(hallWidth) || hallWidth <= 0) return "Hall width must be greater than 0.";
    const tableCount = Number(data.tableCount);
    if (!Number.isInteger(tableCount) || tableCount < 1 || tableCount > 100) return "Table count must be between 1 and 100.";
    return null;
}

function getLayoutColumns(tableCount) {
    const count = Number(tableCount) || 1;
    if (count <= 2) return { compact: count, balanced: count, spacious: 1 };
    if (count <= 4) return { compact: count, balanced: 2, spacious: 1 };
    if (count <= 6) return { compact: 3, balanced: 2, spacious: 2 };
    if (count <= 12) return { compact: 4, balanced: 3, spacious: 2 };
    if (count <= 20) return { compact: 5, balanced: 4, spacious: 3 };
    const base = Math.round(Math.sqrt(count));
    return { compact: Math.max(4, base + 2), balanced: Math.max(3, base + 1), spacious: Math.max(2, base - 1) };
}

function generateLayouts(data) {
    const hallLength = Number(data.hallLength);
    const hallWidth = Number(data.hallWidth);
    const tableCount = Number(data.tableCount);
    const layouts = [];
    const colConfig = getLayoutColumns(tableCount);

    const configurations = [
        {
            type: "compact",
            name: "Compact Layout",
            badge: `${colConfig.compact} Columns - High Density`,
            description: "Tables arranged in dense rows to maximize seating capacity.",
            columns: colConfig.compact,
            spacingLength: 2.2,
            spacingWidth: 1.6,
            gap: 8,
            style: { tableWidth: 42, tableHeight: 28, chairWidth: 10, chairHeight: 8, chairGap: 3 }
        },
        {
            type: "balanced",
            name: "Balanced Layout",
            badge: `${colConfig.balanced} Columns - Center Aisle`,
            description: "Evenly distributed tables with comfortable walkways between rows.",
            columns: colConfig.balanced,
            spacingLength: 2.8,
            spacingWidth: 2.2,
            gap: 16,
            style: { tableWidth: 52, tableHeight: 34, chairWidth: 13, chairHeight: 10, chairGap: 4 }
        },
        {
            type: "spacious",
            name: "Spacious Layout",
            badge: `${colConfig.spacious} Columns - Wide Corridors`,
            description: "Fewer tables per row with wide perimeter aisles for premium comfort.",
            columns: colConfig.spacious,
            spacingLength: 3.6,
            spacingWidth: 2.8,
            gap: 28,
            style: { tableWidth: 68, tableHeight: 44, chairWidth: 16, chairHeight: 12, chairGap: 6 }
        }
    ];

    configurations.forEach(c => {
        const columns = Math.max(1, Math.min(tableCount, c.columns));
        const rows = Math.ceil(tableCount / columns);
        const usedLength = columns * c.spacingLength;
        const usedWidth = rows * c.spacingWidth;

        layouts.push({
            type: c.type,
            name: c.name,
            badge: c.badge,
            description: c.description,
            possible: usedLength <= hallLength && usedWidth <= hallWidth,
            tableCount,
            columns,
            rows,
            gap: c.gap,
            usedLength: Number(usedLength.toFixed(1)),
            usedWidth: Number(usedWidth.toFixed(1)),
            style: c.style
        });
    });

    return layouts;
}

/* ==========================================================================
   Session 5: Helper Endpoints (Next ID & Layouts Generator)
   ========================================================================== */
app.get("/api/next-customer-id", (req, res) => {
    const requests = readRequests();
    const nextId = getNextCustomerId(requests);
    res.json({ success: true, nextId });
});

app.post("/api/layouts", (req, res) => {
    const error = validateLayoutInput(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error });
    }
    const layouts = generateLayouts(req.body);
    res.json({ success: true, layouts });
});

/* ==========================================================================
   Session 6: View Endpoints (Read All, Read Single, & Alterations Log)
   ========================================================================== */
const getRegistrationsHandler = (req, res) => {
    const requests = readRequests();
    let results = requests;

    if (req.query.search) {
        const term = String(req.query.search).trim().toLowerCase();
        results = results.filter(r =>
            (r.customerId && r.customerId.toLowerCase().includes(term)) ||
            (r.customerName && r.customerName.toLowerCase().includes(term)) ||
            (r.phone && r.phone.toLowerCase().includes(term)) ||
            (r.reqId && r.reqId.toLowerCase().includes(term))
        );
    }

    if (req.query.status && req.query.status !== "All") {
        const statusFilter = String(req.query.status).toLowerCase();
        results = results.filter(r => (r.status || "Confirmed").toLowerCase() === statusFilter);
    }

    res.json(results);
};

app.get("/api/customers", getRegistrationsHandler);
app.get("/api/requests", getRegistrationsHandler);

const getSingleHandler = (req, res) => {
    const id = req.params.id;
    const requests = readRequests();
    const item = requests.find(r =>
        (r.customerId && r.customerId.toLowerCase() === id.toLowerCase()) ||
        (r.reqId && r.reqId.toLowerCase() === id.toLowerCase())
    );

    if (!item) {
        return res.status(404).json({ success: false, message: `Customer '${id}' not found.` });
    }
    res.json(item);
};

app.get("/api/customers/:id", getSingleHandler);
app.get("/api/requests/:id", getSingleHandler);

// View Alterations log (from alter.json)
app.get("/api/alterations", (req, res) => {
    const alterations = readAlterations();
    res.json({ success: true, count: alterations.length, alterations });
});

/* ==========================================================================
   Session 7: Create Registration Endpoint (POST to Exp2 Data)
   ========================================================================== */
const createRegistrationHandler = (req, res) => {
    const data = req.body;
    const requests = readRequests();

    const customerId = String(data.customerId || "").trim();
    if (!customerId) {
        return res.status(400).json({ success: false, message: "Customer ID is required." });
    }

    const existing = requests.find(r =>
        r.customerId && r.customerId.toLowerCase() === customerId.toLowerCase()
    );

    if (existing) {
        return res.status(409).json({
            success: false,
            message: `Customer ID '${customerId}' already exists! Customer ID must be unique.`
        });
    }

    const error = validateRequest(data);
    if (error) {
        return res.status(400).json({ success: false, message: error });
    }

    const reqId = data.reqId || customerId.replace(/^CUST/i, "REQ");
    const layouts = generateLayouts(data);

    const newRegistration = {
        customerId,
        reqId,
        customerName: String(data.customerName).trim(),
        phone: String(data.phone).trim(),
        hallLength: Number(data.hallLength),
        hallWidth: Number(data.hallWidth),
        tableCount: Number(data.tableCount),
        chairsPerTable: Number(data.chairsPerTable),
        totalChairs: Number(data.tableCount) * Number(data.chairsPerTable),
        eventDay: data.eventDay,
        eventDate: data.eventDate,
        layoutPreference: data.layoutPreference,
        remarksRequired: data.remarksRequired,
        remarks: data.remarks ? String(data.remarks).trim() : "",
        status: data.status || "Confirmed",
        addOns: {
            catering: data.addOns?.catering || "None",
            soundSystem: Boolean(data.addOns?.soundSystem),
            stageDecoration: Boolean(data.addOns?.stageDecoration),
            vipSection: Boolean(data.addOns?.vipSection),
            airConditioning: data.addOns?.airConditioning !== undefined ? Boolean(data.addOns.airConditioning) : true,
            customSpecifications: Array.isArray(data.addOns?.customSpecifications) ? data.addOns.customSpecifications : []
        },
        admin: "Admin",
        submittedAt: new Date().toISOString(),
        updatedAt: null,
        alteredAt: null,
        alterationNotes: "",
        layouts: Array.isArray(data.layouts) && data.layouts.length ? data.layouts : layouts,
        selectedLayout: data.selectedLayout || layouts[0]?.name || "Compact Layout"
    };

    requests.push(newRegistration);
    saveRequests(requests);

    res.status(201).json({
        success: true,
        message: `Customer registration ${customerId} created successfully in Experiment 2 storage.`,
        request: newRegistration,
        layouts: newRegistration.layouts
    });
};

app.post("/api/customers", createRegistrationHandler);
app.post("/api/requests", createRegistrationHandler);

/* ==========================================================================
   Session 8: Update Registration Endpoint (PUT/Modify in Exp2 Data)
   ========================================================================== */
const updateRegistrationHandler = (req, res) => {
    const id = req.params.id;
    const data = req.body;
    const requests = readRequests();
    const index = requests.findIndex(r =>
        (r.customerId && r.customerId.toLowerCase() === id.toLowerCase()) ||
        (r.reqId && r.reqId.toLowerCase() === id.toLowerCase())
    );

    if (index === -1) {
        return res.status(404).json({ success: false, message: `Customer '${id}' not found.` });
    }

    const target = requests[index];

    if (data.customerId && data.customerId.trim().toLowerCase() !== target.customerId.toLowerCase()) {
        const newId = data.customerId.trim();
        const duplicate = requests.some((r, i) =>
            i !== index && r.customerId && r.customerId.toLowerCase() === newId.toLowerCase()
        );
        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: `Customer ID '${newId}' is already in use by another registration.`
            });
        }
        target.customerId = newId;
    }

    const validationError = validateRequest({ ...target, ...data }, true);
    if (validationError) {
        return res.status(400).json({ success: false, message: validationError });
    }

    if (data.customerName !== undefined) target.customerName = String(data.customerName).trim();
    if (data.phone !== undefined) target.phone = String(data.phone).trim();
    if (data.eventDay !== undefined) target.eventDay = data.eventDay;
    if (data.eventDate !== undefined) target.eventDate = data.eventDate;
    if (data.remarksRequired !== undefined) target.remarksRequired = data.remarksRequired;
    if (data.remarks !== undefined) target.remarks = String(data.remarks).trim();
    if (data.layoutPreference !== undefined) target.layoutPreference = data.layoutPreference;
    if (data.selectedLayout !== undefined) target.selectedLayout = data.selectedLayout;

    let dimsChanged = false;
    if (data.hallLength !== undefined && Number(data.hallLength) !== target.hallLength) {
        target.hallLength = Number(data.hallLength);
        dimsChanged = true;
    }
    if (data.hallWidth !== undefined && Number(data.hallWidth) !== target.hallWidth) {
        target.hallWidth = Number(data.hallWidth);
        dimsChanged = true;
    }
    if (data.tableCount !== undefined && Number(data.tableCount) !== target.tableCount) {
        target.tableCount = Number(data.tableCount);
        dimsChanged = true;
    }
    if (data.chairsPerTable !== undefined && Number(data.chairsPerTable) !== target.chairsPerTable) {
        target.chairsPerTable = Number(data.chairsPerTable);
        dimsChanged = true;
    }

    target.totalChairs = target.tableCount * target.chairsPerTable;
    if (dimsChanged || !target.layouts || !target.layouts.length) {
        target.layouts = generateLayouts(target);
    }

    target.updatedAt = new Date().toISOString();
    saveRequests(requests);

    res.json({
        success: true,
        message: `Customer ${target.customerId} registration modified successfully.`,
        request: target
    });
};

app.put("/api/customers/:id", updateRegistrationHandler);
app.put("/api/requests/:id", updateRegistrationHandler);
app.patch("/api/customers/:id", updateRegistrationHandler);

/* ==========================================================================
   Session 9: Alter Registration Endpoint (PATCH/Alter in Exp2 & alter.json)
   ========================================================================== */
const alterRegistrationHandler = (req, res) => {
    const id = req.params.id;
    const data = req.body;
    const requests = readRequests();
    const index = requests.findIndex(r =>
        (r.customerId && r.customerId.toLowerCase() === id.toLowerCase()) ||
        (r.reqId && r.reqId.toLowerCase() === id.toLowerCase())
    );

    if (index === -1) {
        return res.status(404).json({ success: false, message: `Customer '${id}' not found.` });
    }

    const target = requests[index];

    // Alter Status
    target.status = data.status || "Altered";

    // Alter Add-on Facilities & Inclusions
    if (data.addOns) {
        target.addOns = {
            catering: data.addOns.catering !== undefined ? data.addOns.catering : (target.addOns?.catering || "None"),
            soundSystem: data.addOns.soundSystem !== undefined ? Boolean(data.addOns.soundSystem) : Boolean(target.addOns?.soundSystem),
            stageDecoration: data.addOns.stageDecoration !== undefined ? Boolean(data.addOns.stageDecoration) : Boolean(target.addOns?.stageDecoration),
            vipSection: data.addOns.vipSection !== undefined ? Boolean(data.addOns.vipSection) : Boolean(target.addOns?.vipSection),
            airConditioning: data.addOns.airConditioning !== undefined ? Boolean(data.addOns.airConditioning) : Boolean(target.addOns?.airConditioning),
            customSpecifications: Array.isArray(data.addOns.customSpecifications)
                ? data.addOns.customSpecifications
                : (target.addOns?.customSpecifications || [])
        };
    }

    // Alteration Notes / Justification
    if (data.alterationNotes !== undefined) {
        target.alterationNotes = String(data.alterationNotes).trim();
    }

    target.alteredAt = new Date().toISOString();

    // 1. Update master records in Experiment 2 JSON
    saveRequests(requests);

    // 2. Save only essential fields in alter.json
    const alterRecord = saveAlterationRecord(target, target.alterationNotes, target.addOns, target.status);

    res.json({
        success: true,
        message: `Customer ${target.customerId} registration altered successfully and logged to alter.json.`,
        request: target,
        alteration: alterRecord
    });
};

app.patch("/api/customers/:id/alter", alterRegistrationHandler);
app.post("/api/customers/:id/alter", alterRegistrationHandler);
app.patch("/api/requests/:id/alter", alterRegistrationHandler);

/* ==========================================================================
   Session 10: Delete Registration Endpoint (DELETE from Exp2 & alter.json)
   ========================================================================== */
const deleteRegistrationHandler = (req, res) => {
    const id = req.params.id;
    const requests = readRequests();
    const index = requests.findIndex(r =>
        (r.customerId && r.customerId.toLowerCase() === id.toLowerCase()) ||
        (r.reqId && r.reqId.toLowerCase() === id.toLowerCase())
    );

    if (index === -1) {
        return res.status(404).json({ success: false, message: `Customer '${id}' not found.` });
    }

    const deleted = requests.splice(index, 1)[0];
    saveRequests(requests);

    // Also remove from alter.json if present
    removeAlterationRecord(deleted.customerId || deleted.reqId);

    res.json({
        success: true,
        message: `Customer registration ${deleted.customerId} (${deleted.customerName}) deleted successfully from storage.`
    });
};

app.delete("/api/customers/:id", deleteRegistrationHandler);
app.delete("/api/requests/:id", deleteRegistrationHandler);

/* ==========================================================================
   Session 11: Server Initialization
   ========================================================================== */
app.listen(PORT, () => {
    console.log(`Dining Management System (Express.js) running at http://localhost:${PORT}`);
    console.log(`[Data Source] Experiment 2: ${EXP2_DATA_FILE}`);
    console.log(`[Alter Log] Experiment 3: ${ALTER_DATA_FILE}`);
});

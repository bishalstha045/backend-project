const express = require("express");
const fs = require("fs");
const path = require("path");

/* ==========================================================================
   EXPERIMENT 4: SERVER CONFIGURATION & STRICT LOCAL DATA PATHS
   Port: 3000 only. Self-contained in Experiment4/.
   ========================================================================== */
const app = express();
const PORT = 3000;
const ROOT = __dirname;

const DATA_DIR = path.resolve(ROOT, "data");
const CUSTOMERS_FILE = path.join(DATA_DIR, "customers.json");
const ALTER_FILE = path.join(DATA_DIR, "alter.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(CUSTOMERS_FILE)) {
    fs.writeFileSync(CUSTOMERS_FILE, "[]\n", "utf8");
}
if (!fs.existsSync(ALTER_FILE)) {
    fs.writeFileSync(ALTER_FILE, "[]\n", "utf8");
}

/* ==========================================================================
   SECURITY & ACCESS RESTRICTIONS
   Do NOT serve server.js, package.json, or data/ to the browser.
   Serve ONLY index.html, style.css, vendor, and JS files.
   ========================================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const rawPath = req.path.toLowerCase();
    if (
        rawPath.startsWith("/data") ||
        rawPath.includes("server.js") ||
        rawPath.includes("package.json") ||
        rawPath.includes("package-lock.json") ||
        rawPath.includes("test_exp4.js")
    ) {
        return res.status(403).type("text/plain").send("Access Forbidden");
    }
    next();
});

// Serve frontend assets
app.use(express.static(ROOT));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

/* ==========================================================================
   SAFE JSON STORAGE READ/WRITE HELPERS
   If customers.json is corrupt, do NOT overwrite with empty list.
   ========================================================================== */
function readCustomers() {
    if (!fs.existsSync(CUSTOMERS_FILE)) return [];
    const raw = fs.readFileSync(CUSTOMERS_FILE, "utf8");
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            throw new Error("Corrupt data: customers.json root is not an array");
        }
        return parsed;
    } catch (e) {
        throw new Error(`Corrupt JSON in customers.json: ${e.message}`);
    }
}

function saveCustomers(list) {
    if (!Array.isArray(list)) {
        throw new Error("Cannot save invalid non-array customer list");
    }
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(list, null, 4), "utf8");
}

function readAlterations() {
    if (!fs.existsSync(ALTER_FILE)) return [];
    const raw = fs.readFileSync(ALTER_FILE, "utf8");
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed;
    } catch (e) {
        throw new Error(`Corrupt JSON in alter.json: ${e.message}`);
    }
}

function saveAlterations(list) {
    fs.writeFileSync(ALTER_FILE, JSON.stringify(list, null, 4), "utf8");
}

function saveAlterationRecord(target, alterationNotes, addOns, status) {
    const alterations = readAlterations();
    const cleanRecord = {
        alterationId: "ALT" + String(Date.now()).slice(-6) + Math.floor(Math.random() * 100).toString().padStart(2, "0"),
        customerId: target.customerId,
        customerName: target.customerName,
        phone: target.phone,
        eventDate: target.eventDate,
        status: status || target.status || "Altered",
        addOns: addOns || target.addOns || {},
        alterationNotes: String(alterationNotes || target.alterationNotes || "").trim(),
        alteredAt: new Date().toISOString()
    };

    const isDuplicate = alterations.some(a =>
        a.customerId && a.customerId.toLowerCase() === cleanRecord.customerId.toLowerCase() &&
        a.alterationNotes === cleanRecord.alterationNotes &&
        JSON.stringify(a.addOns) === JSON.stringify(cleanRecord.addOns) &&
        (Date.now() - new Date(a.alteredAt).getTime() < 2000)
    );

    if (!isDuplicate) {
        alterations.push(cleanRecord);
        saveAlterations(alterations);
    }
    return cleanRecord;
}

function syncAlterationCustomerInfo(customerId, phone, eventDate) {
    try {
        const alterations = readAlterations();
        let changed = false;
        alterations.forEach(a => {
            if (a.customerId && a.customerId.toLowerCase() === customerId.toLowerCase()) {
                if (phone !== undefined) a.phone = phone;
                if (eventDate !== undefined) a.eventDate = eventDate;
                changed = true;
            }
        });
        if (changed) saveAlterations(alterations);
    } catch (e) {
        console.error("Error syncing alterations:", e.message);
    }
}

function removeAlterationRecord(id) {
    try {
        const alterations = readAlterations();
        const filtered = alterations.filter(a =>
            a.customerId && a.customerId.toLowerCase() !== id.toLowerCase()
        );
        saveAlterations(filtered);
    } catch (e) {}
}

/* ==========================================================================
   STRICT VALIDATION HELPERS
   ========================================================================== */
function getNextCustomerId(customers) {
    let max = 0;
    customers.forEach(c => {
        const id = c.customerId || "";
        const m = id.match(/^CUST(\d+)$/i);
        if (m) {
            max = Math.max(max, Number(m[1]));
        }
    });
    return "CUST" + String(max + 1).padStart(3, "0");
}

function validateCustomer(data, isUpdate = false, originalDate = null) {
    if (!isUpdate || data.customerId !== undefined) {
        if (!data.customerId || !String(data.customerId).trim()) {
            return "Customer ID is required.";
        }
        if (!/^CUST\d{3,}$/i.test(String(data.customerId).trim())) {
            return "Invalid Customer ID format. Customer IDs must be sequential numbers like CUST001, CUST002.";
        }
    }

    if (!data.customerName || !String(data.customerName).trim()) {
        return "Customer name is required.";
    }

    // Username must NOT contain numbers
    if (/\d/.test(String(data.customerName))) {
        return "Customer name cannot contain numbers. Only alphabetic characters and spaces are allowed.";
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

    // Past date check
    const todayStr = new Date().toISOString().split("T")[0];
    if (!isUpdate && data.eventDate < todayStr) {
        return "Event date cannot be in the past. Select today or a future date.";
    }
    if (isUpdate && originalDate && data.eventDate !== originalDate && data.eventDate < todayStr) {
        return "Event date cannot be in the past. Select today or a future date.";
    }

    if (!["automatic", "compact", "spacious"].includes(data.layoutPreference)) {
        return "Invalid layout preference.";
    }

    if (!["Yes", "No"].includes(data.remarksRequired)) {
        return "Invalid remarks option.";
    }

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
            spacingLength: 3.5,
            spacingWidth: 2.8,
            gap: 24,
            style: { tableWidth: 60, tableHeight: 40, chairWidth: 15, chairHeight: 12, chairGap: 5 }
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
   REST API ENDPOINTS
   ========================================================================== */

// Helper: Next customer ID
app.get("/api/next-customer-id", (req, res) => {
    try {
        const customers = readCustomers();
        const nextId = getNextCustomerId(customers);
        res.json({ success: true, nextId });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get("/api/next-id", (req, res) => {
    try {
        const customers = readCustomers();
        const nextId = getNextCustomerId(customers);
        res.json({ success: true, nextId });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Helper: Layout generator (works with only dimensions and tableCount, no name/phone needed)
app.post("/api/layouts", (req, res) => {
    const hallLength = Number(req.body.hallLength);
    const hallWidth = Number(req.body.hallWidth);
    const tableCount = Number(req.body.tableCount);

    if (!Number.isFinite(hallLength) || hallLength <= 0) {
        return res.status(400).json({ success: false, message: "Hall length must be greater than 0." });
    }
    if (!Number.isFinite(hallWidth) || hallWidth <= 0) {
        return res.status(400).json({ success: false, message: "Hall width must be greater than 0." });
    }
    if (!Number.isInteger(tableCount) || tableCount < 1 || tableCount > 100) {
        return res.status(400).json({ success: false, message: "Table count must be between 1 and 100." });
    }

    const layouts = generateLayouts({ hallLength, hallWidth, tableCount });
    res.json({ success: true, layouts });
});

// Read All Customers
app.get("/api/customers", (req, res) => {
    try {
        let customers = readCustomers();
        if (req.query.search) {
            const q = String(req.query.search).toLowerCase();
            customers = customers.filter(c =>
                (c.customerId && c.customerId.toLowerCase().includes(q)) ||
                (c.customerName && c.customerName.toLowerCase().includes(q)) ||
                (c.phone && c.phone.includes(q))
            );
        }
        if (req.query.status) {
            const st = String(req.query.status).toLowerCase();
            customers = customers.filter(c => (c.status || "Confirmed").toLowerCase() === st);
        }
        res.json(customers);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.get("/api/requests", (req, res) => {
    try {
        const customers = readCustomers();
        res.json(customers);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Read Single Customer
app.get("/api/customers/:id", (req, res) => {
    try {
        const id = req.params.id;
        const customers = readCustomers();
        const item = customers.find(c => c.customerId && c.customerId.toLowerCase() === id.toLowerCase());
        if (!item) {
            return res.status(404).json({ success: false, message: `Customer '${id}' not found.` });
        }
        res.json(item);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Create Customer (POST)
app.post("/api/customers", (req, res) => {
    try {
        const data = req.body;
        const customers = readCustomers();

        const customerId = String(data.customerId || getNextCustomerId(customers)).trim();
        const existing = customers.find(c => c.customerId && c.customerId.toLowerCase() === customerId.toLowerCase());
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `Customer ID '${customerId}' already exists! Customer ID must be unique.`
            });
        }

        const error = validateCustomer({ ...data, customerId });
        if (error) {
            return res.status(400).json({ success: false, message: error });
        }

        const layouts = generateLayouts(data);
        const newRecord = {
            customerId,
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
            submittedAt: new Date().toISOString(),
            updatedAt: null,
            alteredAt: null,
            alterationNotes: "",
            layouts: Array.isArray(data.layouts) && data.layouts.length ? data.layouts : layouts,
            selectedLayout: data.selectedLayout || layouts[0]?.name || "Compact Layout"
        };

        customers.push(newRecord);
        saveCustomers(customers);

        res.status(201).json({
            success: true,
            message: `Customer ${customerId} created successfully.`,
            request: newRecord
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Update Customer (PUT)
app.put("/api/customers/:id", (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const customers = readCustomers();
        const index = customers.findIndex(c => c.customerId && c.customerId.toLowerCase() === id.toLowerCase());

        if (index === -1) {
            return res.status(404).json({ success: false, message: `Customer '${id}' not found.` });
        }

        const target = customers[index];

        // Primary Key Immutability: Customer ID
        if (data.customerId && data.customerId.trim().toLowerCase() !== target.customerId.toLowerCase()) {
            return res.status(400).json({
                success: false,
                message: "Customer ID is an immutable primary key and cannot be modified."
            });
        }

        // Identity Immutability: Customer Name
        if (data.customerName && data.customerName.trim().toLowerCase() !== target.customerName.toLowerCase()) {
            return res.status(400).json({
                success: false,
                message: "Customer Name is an immutable field and cannot be modified after registration."
            });
        }

        const error = validateCustomer(
            { ...target, ...data, customerId: target.customerId, customerName: target.customerName },
            true,
            target.eventDate
        );
        if (error) {
            return res.status(400).json({ success: false, message: error });
        }

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
        saveCustomers(customers);

        // Keep alteration records in sync with contact changes
        syncAlterationCustomerInfo(target.customerId, target.phone, target.eventDate);

        res.json({
            success: true,
            message: `Customer ${target.customerId} details updated successfully.`,
            request: target
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Alter Customer Specifications (PATCH)
app.patch("/api/customers/:id/alter", (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const customers = readCustomers();
        const index = customers.findIndex(c => c.customerId && c.customerId.toLowerCase() === id.toLowerCase());

        if (index === -1) {
            return res.status(404).json({ success: false, message: `Customer '${id}' not found.` });
        }

        const target = customers[index];

        // Never allow altering username or customer ID in Alter
        if (data.customerId && data.customerId.trim().toLowerCase() !== target.customerId.toLowerCase()) {
            return res.status(400).json({ success: false, message: "Cannot alter Customer ID." });
        }
        if (data.customerName && data.customerName.trim().toLowerCase() !== target.customerName.toLowerCase()) {
            return res.status(400).json({ success: false, message: "Cannot alter Customer Name." });
        }

        target.status = data.status || "Altered";
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

        if (data.alterationNotes !== undefined) {
            target.alterationNotes = String(data.alterationNotes).trim();
        }

        target.alteredAt = new Date().toISOString();
        saveCustomers(customers);

        const alterRecord = saveAlterationRecord(target, target.alterationNotes, target.addOns, target.status);

        res.json({
            success: true,
            message: `Customer ${target.customerId} registration altered successfully and logged.`,
            request: target,
            alteration: alterRecord
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// View Alterations Log
app.get("/api/alterations", (req, res) => {
    try {
        const alterations = readAlterations();
        res.json({ success: true, count: alterations.length, alterations });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Delete Customer (DELETE)
app.delete("/api/customers/:id", (req, res) => {
    try {
        const id = req.params.id;
        const customers = readCustomers();
        const index = customers.findIndex(c => c.customerId && c.customerId.toLowerCase() === id.toLowerCase());

        if (index === -1) {
            return res.status(404).json({ success: false, message: `Customer '${id}' not found.` });
        }

        const deleted = customers.splice(index, 1)[0];
        saveCustomers(customers);

        removeAlterationRecord(deleted.customerId);

        res.json({
            success: true,
            message: `Customer ${deleted.customerId} (${deleted.customerName}) deleted successfully.`
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

/* ==========================================================================
   SERVER INITIALIZATION
   ========================================================================== */
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Experiment 4 (Dining Management with React.js) running at http://localhost:${PORT}`);
        console.log(`[Storage] customers.json: ${CUSTOMERS_FILE}`);
        console.log(`[Storage] alter.json: ${ALTER_FILE}`);
    });
}

module.exports = app;

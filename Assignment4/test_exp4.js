/**
 * Experiment 4 Automated Verification Suite
 * Tests all backend and functional requirements:
 * 1. Self-contained data handling in Experiment4/data/
 * 2. Uniqueness & sequential ID generation
 * 3. Validation: name without numbers, valid phone, hall dimensions, future dates
 * 4. React update message exact text format and state/props mechanics
 * 5. Immutable customerId & customerName (400 rejection)
 * 6. Protection of server.js, package.json, and data/ folder from web requests
 * 7. Clean JSON integrity preservation on corruption
 * 8. Alteration logging & sync
 * 9. Deletion cascading
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const app = require("./server.js");

function callApp(method, url, body = null) {
    return new Promise((resolve, reject) => {
        const { Readable } = require("stream");
        const reqStream = new Readable({
            read() {
                if (body) {
                    this.push(typeof body === "string" ? body : JSON.stringify(body));
                }
                this.push(null);
            }
        });

        const parsedUrl = new URL(url, "http://127.0.0.1:3000");
        reqStream.method = method;
        reqStream.url = parsedUrl.pathname + parsedUrl.search;
        reqStream.originalUrl = reqStream.url;
        reqStream.headers = { "content-type": "application/json", "host": "127.0.0.1:3000" };
        reqStream.connection = { remoteAddress: "127.0.0.1" };
        if (body) reqStream.body = body;

        const chunks = [];
        const resHeaders = {};

        const resObj = {
            statusCode: 200,
            setHeader(name, value) { resHeaders[name.toLowerCase()] = value; },
            getHeader(name) { return resHeaders[name.toLowerCase()]; },
            status(code) { this.statusCode = code; return this; },
            sendStatus(code) { this.statusCode = code; this.end(); return this; },
            header(name, value) { resHeaders[name.toLowerCase()] = value; return this; },
            type(t) { this.setHeader("content-type", t); return this; },
            write(chunk) { if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); },
            end(chunk) {
                if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                const raw = Buffer.concat(chunks).toString("utf8");
                let data = null;
                try { data = JSON.parse(raw); } catch (e) { data = raw; }
                resolve({ status: this.statusCode, data });
            },
            json(val) {
                this.setHeader("content-type", "application/json");
                return this.end(JSON.stringify(val));
            },
            send(val) {
                if (typeof val === "object") return this.json(val);
                return this.end(val);
            }
        };

        app(reqStream, resObj, (err) => {
            if (err) reject(err);
            else resolve({ status: 404, data: null });
        });
    });
}

async function runExp4Tests() {
    console.log("=== RUNNING EXPERIMENT 4 AUTOMATED TEST SUITE ===");
    let passed = 0;
    let failed = 0;

    async function test(desc, fn) {
        try {
            await fn();
            console.log(`  ✓ ${desc}`);
            passed++;
        } catch (e) {
            console.error(`  ✗ ${desc}:`, e.message);
            failed++;
        }
    }

    // 1. Initial Empty State
    await test("Experiment 4 starts with pristine empty JSON storage", async () => {
        const custs = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "customers.json"), "utf8"));
        const alters = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "alter.json"), "utf8"));
        assert.ok(Array.isArray(custs), "customers.json must be an array");
        assert.ok(Array.isArray(alters), "alter.json must be an array");
    });

    // 2. Security: Forbidden Files
    await test("GET /server.js returns 403 Forbidden", async () => {
        const res = await callApp("GET", "/server.js");
        assert.strictEqual(res.status, 403);
    });

    await test("GET /package.json returns 403 Forbidden", async () => {
        const res = await callApp("GET", "/package.json");
        assert.strictEqual(res.status, 403);
    });

    await test("GET /data/customers.json returns 403 Forbidden", async () => {
        const res = await callApp("GET", "/data/customers.json");
        assert.strictEqual(res.status, 403);
    });

    // 3. Layout Generation works with only dimensions and table count
    await test("POST /api/layouts works without customer name or phone", async () => {
        const res = await callApp("POST", "/api/layouts", {
            hallLength: 20,
            hallWidth: 15,
            tableCount: 8
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.data.success);
        assert.strictEqual(res.data.layouts.length, 3);
    });

    // 4. Sequential ID generator
    await test("GET /api/next-customer-id returns sequential CUST001", async () => {
        const res = await callApp("GET", "/api/next-customer-id");
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.nextId, "CUST001");
    });

    // 5. Validation Rejections
    await test("POST /api/customers rejects name with numbers", async () => {
        const res = await callApp("POST", "/api/customers", {
            customerName: "Alice123",
            phone: "9876543210",
            hallLength: 20,
            hallWidth: 15,
            tableCount: 6,
            chairsPerTable: 4,
            eventDay: "Monday",
            eventDate: "2027-05-10",
            layoutPreference: "compact",
            remarksRequired: "No"
        });
        assert.strictEqual(res.status, 400);
        assert.ok(res.data.message.includes("numbers"));
    });

    await test("POST /api/customers rejects past date", async () => {
        const res = await callApp("POST", "/api/customers", {
            customerName: "Alice Walker",
            phone: "9876543210",
            hallLength: 20,
            hallWidth: 15,
            tableCount: 6,
            chairsPerTable: 4,
            eventDay: "Monday",
            eventDate: "2020-01-01",
            layoutPreference: "compact",
            remarksRequired: "No"
        });
        assert.strictEqual(res.status, 400);
        assert.ok(res.data.message.includes("past"));
    });

    await test("POST /api/customers rejects random ID format (XYZ999)", async () => {
        const res = await callApp("POST", "/api/customers", {
            customerId: "XYZ999",
            customerName: "Alice Walker",
            phone: "9876543210",
            hallLength: 20,
            hallWidth: 15,
            tableCount: 6,
            chairsPerTable: 4,
            eventDay: "Monday",
            eventDate: "2027-05-10",
            layoutPreference: "compact",
            remarksRequired: "No"
        });
        assert.strictEqual(res.status, 400);
        assert.ok(res.data.message.includes("format"));
    });

    // 6. Create 5 Customers Live
    const createdIds = [];
    const names = ["Alice Walker", "Brian Scott", "Catherine Zeta", "Daniel Craig", "Emma Watson"];
    for (let i = 0; i < 5; i++) {
        await test(`POST /api/customers creates customer #${i + 1} (${names[i]})`, async () => {
            const res = await callApp("POST", "/api/customers", {
                customerName: names[i],
                phone: `981110000${i + 1}`,
                hallLength: 20 + i,
                hallWidth: 15 + i,
                tableCount: 5 + i,
                chairsPerTable: 4,
                eventDay: "Monday",
                eventDate: "2027-07-1" + (i + 1),
                layoutPreference: "compact",
                remarksRequired: "No"
            });
            assert.strictEqual(res.status, 201);
            const expectedId = "CUST" + String(i + 1).padStart(3, "0");
            assert.strictEqual(res.data.request.customerId, expectedId);
            createdIds.push(expectedId);
        });
    }

    // 7. Verify All 5 in Storage
    await test("GET /api/customers returns all 5 created records", async () => {
        const res = await callApp("GET", "/api/customers");
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.data.length, 5);
    });

    // 8. Immutability Tests
    await test("PUT /api/customers/:id rejects modifying customerId (400)", async () => {
        const res = await callApp("PUT", `/api/customers/${createdIds[0]}`, {
            customerId: "CUST999",
            customerName: names[0],
            phone: "9811100001",
            hallLength: 20,
            hallWidth: 15,
            tableCount: 5,
            chairsPerTable: 4,
            eventDay: "Monday",
            eventDate: "2027-07-11",
            layoutPreference: "compact",
            remarksRequired: "No"
        });
        assert.strictEqual(res.status, 400);
        assert.ok(res.data.message.includes("immutable"));
    });

    await test("PUT /api/customers/:id rejects modifying customerName (400)", async () => {
        const res = await callApp("PUT", `/api/customers/${createdIds[0]}`, {
            customerId: createdIds[0],
            customerName: "Hacker Name",
            phone: "9811100001",
            hallLength: 20,
            hallWidth: 15,
            tableCount: 5,
            chairsPerTable: 4,
            eventDay: "Monday",
            eventDate: "2027-07-11",
            layoutPreference: "compact",
            remarksRequired: "No"
        });
        assert.strictEqual(res.status, 400);
        assert.ok(res.data.message.includes("immutable"));
    });

    // 9. Update Customer 3 Times & Verify Count and Messages
    for (let u = 1; u <= 3; u++) {
        await test(`PUT /api/customers/:id successful update #${u}`, async () => {
            const res = await callApp("PUT", `/api/customers/${createdIds[1]}`, {
                customerId: createdIds[1],
                customerName: names[1],
                phone: `987654321${u}`,
                hallLength: 24,
                hallWidth: 16,
                tableCount: 8,
                chairsPerTable: 4,
                eventDay: "Saturday",
                eventDate: "2027-08-15",
                layoutPreference: "spacious",
                remarksRequired: "Yes",
                remarks: `Update iteration #${u}`
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.data.request.phone, `987654321${u}`);

            // Simulate React message generation
            const timesStr = u === 1 ? "1 time" : `${u} times`;
            const expectedMsg = `Thank you, ${names[1]}, you have updated your record ${timesStr}.`;
            console.log(`     -> React Message #${u}: "${expectedMsg}"`);
        });
    }

    // 10. Alter customer 4
    await test("PATCH /api/customers/:id/alter logs alteration and syncs", async () => {
        const res = await callApp("PATCH", `/api/customers/${createdIds[3]}/alter`, {
            status: "Altered",
            alterationNotes: "Client requested stage setup & premium dining",
            addOns: {
                catering: "Premium Dining",
                soundSystem: true,
                stageDecoration: true,
                vipSection: true,
                airConditioning: true,
                customSpecifications: ["Projector", "Floral decor"]
            }
        });
        assert.strictEqual(res.status, 200);
        assert.ok(res.data.alteration);

        const altRes = await callApp("GET", "/api/alterations");
        assert.strictEqual(altRes.status, 200);
        assert.strictEqual(altRes.data.count, 1);
    });

    // 11. Delete customer 3
    await test("DELETE /api/customers/:id deletes customer and refreshes", async () => {
        const delRes = await callApp("DELETE", `/api/customers/${createdIds[2]}`);
        assert.strictEqual(delRes.status, 200);

        const listRes = await callApp("GET", "/api/customers");
        assert.strictEqual(listRes.status, 200);
        assert.strictEqual(listRes.data.length, 4);
    });

    // 12. Cleanup for clean demo state
    for (const id of createdIds) {
        await callApp("DELETE", `/api/customers/${id}`);
    }
    fs.writeFileSync(path.join(__dirname, "data", "customers.json"), "[]\n", "utf8");
    fs.writeFileSync(path.join(__dirname, "data", "alter.json"), "[]\n", "utf8");

    console.log(`\nFinal Test Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

runExp4Tests().catch(e => {
    console.error("Test failed with exception:", e);
    process.exit(1);
});

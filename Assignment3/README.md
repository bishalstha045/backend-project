# Dining Management System - Experiment 3
**Course**: Backend Programming Lab  
**Assignment**: Assignment 3  
**USN**: 24BTRCN091  

---

## Experiment 3 Objectives & Deliverables

1. **Unique Customer ID**:
   - Each customer registration has a strictly enforced unique `customerId` (e.g. `CUST001`, `CUST002`).
   - The backend validates that duplicate customer IDs are rejected with HTTP 409 Conflict.
   - An auto-generation endpoint (`GET /api/next-customer-id`) is provided for ease of use.

2. **Frontend using HTML and JavaScript**:
   - Built with pure HTML5, CSS3, and vanilla modern JavaScript (no external framework required).
   - Real-time management table showing all registered customers.
   - Live search by Customer ID, Customer Name, or Phone Number, plus status filtering.
   - Dedicated modals for **Update / Modify**, **Alter**, and **Delete**.
   - Interactive Floor Plan / Layout Visualizer from Experiment 1 & 2 with table and chair geometric positioning.

3. **Modify Existing Registrations (Update)**:
   - Users can modify customer details such as phone number, customer name, event date, day, hall dimensions, table count, chairs, and remarks.
   - Communicates with `PUT /api/customers/:id`.
   - Automatically recalculates seating capacity and layouts if hall dimensions or table counts change.

4. **Alter Registration (Alter Operation)**:
   - Dedicated operation implementing the database/backend "ALTER" requirement.
   - Allows altering booking status (Confirmed, Altered, Pending, Cancelled), add-on facilities (Buffet Catering, Audio System, Stage Decoration, VIP section, AC), and alteration justification notes.
   - Communicates with `PATCH /api/customers/:id/alter`.

5. **Delete Registration**:
   - Enables deleting an existing registration with confirmation.
   - Communicates with `DELETE /api/customers/:id`.

---

## How to Run

1. Open a terminal in the `Assignment3` folder:
   ```bash
   cd /Users/bishalshrestha/Documents/BackendProgramming/Assignment3
   ```
2. Start the Node.js server:
   ```bash
   npm start
   ```
   *(Or run `node server.js` directly)*

3. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/customers` | Get all registrations (supports `?search=` and `?status=`) |
| `GET` | `/api/customers/:id` | Get a single registration by Customer ID |
| `GET` | `/api/next-customer-id` | Returns the next available unique Customer ID |
| `POST` | `/api/customers` | Create a new registration (validates unique Customer ID) |
| `PUT` | `/api/customers/:id` | Modify/Update existing registration details (e.g. phone) |
| `PATCH` | `/api/customers/:id/alter` | Alter registration attributes, status, and add-ons |
| `DELETE` | `/api/customers/:id` | Delete registration by unique Customer ID |
| `POST` | `/api/layouts` | Calculate floor plan layouts for hall dimensions |

# Backend Programming Laboratory Projects

**Student Name:** Bishal Shrestha  
**USN / Roll No:** 24BTRCN091  
**Branch & Section:** CSE GEN 'A'  
**Subject:** Backend Programming Laboratory  

---

## Repository Structure

This repository contains the complete laboratory assignments and experiments for the Dining Management System:

```text
├── Assignment1/               # Experiment 1: Interactive Dining Hall Floor Plan (HTML5/CSS3/Vanilla JS)
├── Assignment2/               # Experiment 2: Dining Reservation System with Node.js HTTP Server & JSON Storage
├── Assignment3/               # Experiment 3: Express.js REST API with CRUD, Alter Operations & Admin Approvals
├── Assignment4/               # Experiment 4: Integrated Dining Management System with React 18 State & Props
├── Experiment4/               # Experiment 4 alias
├── Writen/                    # Handwritten Lab Reports & References
└── README.md                  # Project Documentation
```

---

## Project Summaries

### 1. Assignment 1: Dining Hall Floor Plan Visualizer
* **Tech Stack:** HTML5, CSS3, JavaScript
* **Features:**
  * Interactive hall dimension configuration (Length, Width, Height in metres).
  * Table count selection and dynamic layout rendering.
  * Visual 2D representations with Compact and Balanced layout arrangements.

### 2. Assignment 2: Dining Reservation Backend
* **Tech Stack:** Native Node.js `http`, `fs`, `path`, JSON persistence
* **Features:**
  * RESTful endpoints (`/api/layouts`, `/api/requests`).
  * Server-side data validation (table counts, dimensions, 10-digit phone number, future dates).
  * Flat-file persistence in `requests.json`.

### 3. Assignment 3: Express.js REST API with Alter & Admin Approvals
* **Tech Stack:** Express.js, RESTful CRUD, Transactional Auditing
* **Features:**
  * Full CRUD operations: Create, Read, Update, Delete.
  * **Alter Operation (`PATCH /api/customers/:id/alter`)**: Appends custom add-ons (catering, sound system, stage decoration, VIP enclosure, custom features) logged to `data/alter.json`.
  * **Admin Panel**: 1-click status confirmations (`Confirmed`, `Pending`, `Cancelled`) and bulk approvals (`POST /api/admin/confirm-all`).
  * Immutable primary key enforcement (`customerId` and `customerName`).
  * Comprehensive lab report: [`EXPERIMENT_3_REPORT.md`](Assignment3/EXPERIMENT_3_REPORT.md).

### 4. Assignment 4 / Experiment 4: React.js State & Props Integration
* **Tech Stack:** Express.js + Pure React 18 (Offline UMD bundles)
* **Features:**
  * Combines Experiments 1, 2, and 3 into a single unified dashboard.
  * Separate React module (`react-update-message.js`) implementing React State (`useState(0)`) and Props (`props.customerName`).
  * Displays dynamic update counter on successful updates:
    * `Thank you, [name], you have updated your record 1 time.`
    * `Thank you, [name], you have updated your record 2 times.`
    * `Thank you, [name], you have updated your record 3 times.`
  * Create action shows no update message (count starts at 0).
  * Strict validation: Sequential IDs (`CUST001`, `CUST002`), alphabetic customer names (no numbers), and locked identifiers on update.

---

## How to Run the Projects

### Running Assignment 1
```bash
cd Assignment1
node server.js
# Open http://localhost:3001
```

### Running Assignment 2
```bash
cd Assignment2
node server.js
# Open http://localhost:3002
```

### Running Assignment 3
```bash
cd Assignment3
npm install
node server.js
# Open http://localhost:3003
```

### Running Assignment 4 / Experiment 4
```bash
cd Assignment4
npm install
node server.js
# Open http://localhost:3000
```

# eTOM Lifecycle Classification Reference

Source documents: GB991 v25.5, GB921 Service Process Decompositions v24.0, GB921 Resource Process Decompositions v24.0.

This document distils the readiness/runtime (S2R vs Operations) classification taxonomy for use in specifying eTOM Explorer filtering and annotation features.

---

## 1. The Two Lifecycle Context Areas

The eTOM framework organises all processes along two axes:

- **Horizontal (Domain)** — *what* area of the business the process serves (Market, Product, Customer, Service, Resource, Business Partner, Enterprise)
- **Vertical (Lifecycle Stage)** — *when* in the enterprise lifecycle the process executes

The vertical axis is the readiness/runtime differentiator. It divides into two **Lifecycle Context Areas**:

| Area | Common label | Purpose |
|------|-------------|---------|
| **Strategy-to-Readiness (S2R)** | Readiness | Prepare the enterprise for market engagement — define strategies, build capabilities, develop products/services |
| **Operations** | Runtime | Execute day-to-day operations in service of customers — fulfil orders, fix problems, collect payment |

BPF Principle BPF-02 states: *"At Level 0 the elements are classified into S2R (Strategy to Operations) and Operations. Lower Levels are formed by decomposition."*

---

## 2. Lifecycle Stages (Vertical Groups)

Each Lifecycle Context Area contains named **Lifecycle Stages** (called *Vertical Groups* in the Excel data). These are the values stored in the `vertical_groups` field of every `ProcessNode`.

### 2.1 Strategy-to-Readiness (S2R) Stages

| Stage | Abbreviation | Role |
|-------|-------------|------|
| **Strategy Management** | SMT | Generate and manage business strategies; analyse market positions; ensure strategic alignment across the enterprise. |
| **Capability Management** | CAP | Develop and deploy capabilities and infrastructure needed to fulfil strategies; design, build and monitor new/enhanced capabilities. |
| **Business Value Development** | BVD | Define, plan, design and implement value propositions — products, services, resource catalog entries, sales campaigns, marketing content. |

*S2R processes produce the building blocks that Operations will use at runtime. They are inherently design-time / planning-time processes.*

### 2.2 Operations (Runtime) Stages

| Stage | Abbreviation | Role |
|-------|-------------|------|
| **Operations Readiness & Support** | ORS | Bridge stage — ensures Fulfillment, Assurance and Billing processes are operationally ready before runtime begins. Configures OSS tooling, trains support staff, manages the operational handover from S2R. |
| **Fulfillment** | FUL | Initiate, instantiate and fulfil customer requests. Convert requests (customer or business) into orders and deliver the committed value. |
| **Assurance** | ASR | Run operations and monitor, measure, analyse and correct to maintain performance. Receive trouble reports; meet SLAs and KPI targets. |
| **Billing** | BIL | Translate business activities into revenue. Collect usage records, produce bills, process payments, perform collections. |

*Operations processes execute in real-time or near-real-time to serve active customers.*

---

## 3. Operations Readiness & Support — Detailed Role

ORS is the most nuanced stage. It sits inside the Operations Lifecycle Context Area but acts as an **enabler** rather than a direct customer-serving process. Key characteristics:

- Ensures Fulfillment, Assurance and Billing capabilities are *ready to operate* before go-live
- Manages ongoing support of FAB processes (tooling, procedures, personnel)
- Contains processes like:
  - **Enable Service/Resource Support & Operations** (1.4.2.5 / 1.5.2.5) — designs improvements to operational support processes; identifies support groups, skills and training
  - **Manage Handover to Service/Resource Operations** (1.4.2.7 / 1.5.2.7) — hands deployed infrastructure to operational control; validates design requirements; ensures tools and procedures are ready
  - **Service/Resource Catalog Operational Readiness Management** (1.4.14 / 1.5.16) — establishes and administers the support needed to operationalise Service/Resource catalogues; implements catalogues through Release and Deploy activities

ORS processes are the operational equivalent of CI/CD pipelines and deployment runbooks — they get the system *production-ready*, but are not the production system itself.

---

## 4. OSS Relevance

Telco OSS/BSS systems map tightly to the Operations stages:

| eTOM Stage | Typical OSS/BSS system class |
|-----------|------------------------------|
| ORS | OSS catalog management, inventory initialisation, workforce scheduling bootstrap |
| Fulfillment | Order management (OM), provisioning, service activation |
| Assurance | Fault management (FM/TT), performance management (PM), SLA management |
| Billing | Mediation, rating engine, billing system, collections |

S2R stages map to design-time tooling:

| eTOM Stage | Typical system class |
|-----------|---------------------|
| Strategy Management | Business intelligence, planning tools |
| Capability Management | Network design, capacity planning, project portfolio management |
| Business Value Development | Product catalog management (PCM), CPQ, campaign management |

---

## 5. Process Classification Rules

### Level 0 — Implicit area
All processes inherit their Lifecycle Area from the vertical group(s) assigned in the spreadsheet:

- VG in {SMT, CAP, BVD} → S2R / Readiness
- VG in {ORS, FUL, ASR, BIL} → Operations / Runtime

### Multi-VG processes
A process can carry more than one vertical group (the spreadsheet has duplicate rows, one per VG). This is intentional — some processes are relevant across multiple lifecycle stages (e.g., a catalog process that spans ORS and BVD).

### Processes with no VG
Domain root nodes (synthesised L1 nodes like `D-Customer`) and some L2 nodes carry no vertical group. These are classification containers, not executable processes, and should be treated as neutral.

---

## 6. Taxonomy Summary (for filter/display use)

```
Lifecycle Area
├── Strategy-to-Readiness (S2R) [label: "Readiness"]
│   ├── Strategy Management       (SMT)
│   ├── Capability Management     (CAP)
│   └── Business Value Development(BVD)
└── Operations [label: "Runtime"]
    ├── Operations Readiness & Support (ORS)  ← bridge: enables runtime
    ├── Fulfillment                    (FUL)
    ├── Assurance                      (ASR)
    └── Billing                        (BIL)
```

### Suggested filter grouping for eTOM Explorer

**Lifecycle Area toggle** (coarse): `S2R` / `Operations` — derived from VG membership above.

**Vertical Group toggle** (fine): one button per VG abbreviation with full name on hover.

### Abbreviation → full name mapping (canonical)

| Abbr | Full name | Area |
|------|-----------|------|
| SMT | Strategy Management | S2R |
| CAP | Capability Management | S2R |
| BVD | Business Value Development | S2R |
| ORS | Operations Readiness & Support | Operations |
| FUL | Fulfillment | Operations |
| ASR | Assurance | Operations |
| BIL | Billing | Operations |

---

## 7. Source Citations

| Claim | Source |
|-------|--------|
| S2R / Operations two-area split | GB991 §1.1.2 Vertical Context (Lifecycle Stage) |
| Stage definitions (SMT, CAP, BVD, ORS, FUL, ASR, BIL) | GB991 §1.1.2.1–§1.1.2.2 |
| BPF-02 L0 classification principle | GB991 §3.2 Business Process Framework Principles |
| ORS "Enable Service Support & Operations" (1.4.2.5) | GB921 Service Decompositions §Enable Service Support & Operations |
| ORS "Manage Handover to Service Operations" (1.4.2.7) | GB921 Service Decompositions §Manage Handover to Service Operations |
| ORS "Service Catalog Operational Readiness Management" (1.4.14) | GB921 Service Decompositions |
| ORS "Enable Resource Support & Operations" (1.5.2.5) | GB921 Resource Decompositions |
| ORS "Manage Handover to Resource Operations" (1.5.2.7) | GB921 Resource Decompositions |
| ORS "Resource Catalog Operational Readiness Management" (1.5.16) | GB921 Resource Decompositions |

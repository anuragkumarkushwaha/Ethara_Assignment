<div align="center">
  <img width="1200" height="475" alt="Synergy Manager Banner" />
  <h1>🚀 Synergy Workspace: Team Task Manager</h1>
  <p>A full-stack collaborative project and task management ecosystem built with React 19, TypeScript, Vite, Express, and Tailwind CSS v4.</p>
</div>

---

## 🛠️ Features & Architecture

Synergy Workspace is engineered with a strict client-server separation, packing premium visual interfaces and robust server-side security enforcement:

* **🔐 Cryptographic Authentication:** Implements a state-hashing authorization flow utilizing SHA-256 for passwords and 24-hour token-based sessions.
* **📁 Multi-Tenant Workspaces:** Creates independent project workspaces mapping granular relationships (`ownerId` and `members` collections).
* **📋 Collaborative Kanban Board:** Supports interactive task progression tracks (`Todo ➔ In Progress ➔ In Review ➔ Done`) with multi-user filters.
* **🛡️ Strict Role-Based Access Control (RBAC):** Restricts data mutation workflows. While *Admins* and *Project Owners* maintain master structural privileges over titles, desc, deadlines, and assignees, regular *Members* can only progress task statuses along the workflow pipeline.
* **📊 Overdue Intelligence Engine:** Automatically isolates active backlogs using explicit ISO timestamp string evaluation formats (`YYYY-MM-DD`) against live dates.
* **✨ Premium UI/UX Design:** Embedded with smooth tab transitions managed via Framer Motion (`motion/react`), sticky blur frames, high-end progress breakdown indices, and custom responsive layouts.

---

## 💻 Tech Stack

* **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide React, Motion.
* **Backend:** Node.js, Express, tsx, esbuild.
* **Storage Tier:** File-based lightweight relational JSON Data Service (`manager_db.json`) abstracted via clean server native CRUD filters.

---

## 🚀 Local Development Setup

### Prerequisites
* **Node.js** (v18+ recommended)
* **npm** or **yarn**

### 1. Clone & Install Dependencies
```bash
npm install

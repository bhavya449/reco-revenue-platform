# RECO — AI Revenue Recovery Platform

> **AI-powered B2B receivables management, payment risk scoring, and autonomous revenue recovery orchestration.**

---

## 💎 Overview

**RECO** is an enterprise-grade AI revenue recovery platform designed for modern finance teams, CFOs, and collections directors. It transforms manual debt collection into an automated, predictable, and data-driven workflow.

### Key Capabilities
- **Multi-Tenant Data Isolation**: Complete workspace isolation per organization account.
- **Deterministic AI Risk Scoring Engine**: Calculates invoice default risk based on overdue velocity, debtor payment history, and exposure brackets.
- **AI Revenue Copilot**: Natural language conversational assistant for portfolio risk queries and automated multi-tone payment reminder drafting (*Formal, Friendly, Urgent, Firm*).
- **Revenue Recovery Simulator**: Interactive predictive forecasting slider for scenario modeling and recovery rate optimization.
- **Customer Behavioral Intelligence**: 360° debtor profiles with historical delay patterns, risk trajectory curves, and automated AI assessments.
- **Transactional Email Service**: Integrated with **Resend SDK** and universal **Nodemailer SMTP** for real welcome emails and payment reminders.
- **Real-Time Financial Telemetry**: Aging distribution graphs (0–15d, 16–30d, 31–60d, 60+d), recovery channel benchmarking, and audit CSV exports.

---

## 🎨 Visual Identity & Design System

RECO follows a luxury fintech aesthetic built upon a 5-color palette:

| Token | Hex | Role |
| :--- | :--- | :--- |
| **Space Cadet** | `#25344F` | Primary dark navy (navbars, sidebar, major typography, primary actions) |
| **Tan** | `#D5B893` | Warm gold/tan accent (logo marks, highlights, AI badges, KPIs) |
| **Slate Gray** | `#617891` | Secondary UI, borders, chart grids, muted descriptions |
| **Coffee** | `#6F4D38` | Warm secondary accents, tags, behavioral indicators |
| **Caput Mortuum** | `#632024` | High-risk alerts, overdue indicators, critical risk meters |
| **Warm Cream** | `#FAF8F5` | Canvas background and soft card surfaces |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** v18+ (tested on v24)
- **npm** v9+

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/bhavya449/reco-revenue-platform.git
cd reco-revenue-platform

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy the example environment file and configure your credentials:
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=8080
APP_URL=http://localhost:8080

# 📧 Option 1: Resend (Recommended)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=RECO Onboarding <onboarding@resend.dev>

# 📧 Option 2: Universal SMTP
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-google-app-password
```

### 4. Running Locally
```bash
# Start the full-stack server
node server.js
```
Open **https://reco-revenue-platform-h7mmxgkum-bhavyas-projects-60020639.vercel.app/** in your browser.

---

## 🧪 Demo Account

To explore RECO with a pre-configured enterprise portfolio:
- **Email**: `vikram@apexenterprise.com`
- **Password**: `demopass123`
- *(Or click the **1-Click Demo Login** button on the sign-in screen)*

---

## 🏗️ Architecture

```
├── server.js              # Express API & static server with persistence & auth routes
├── services/
│   └── emailService.js    # Resend SDK & SMTP welcome email template engine
├── js/
│   ├── store.js           # Multi-tenant partitioned reactive store & financial math
│   └── app.js             # UI controller, Chart.js integrations & event handling
├── css/
│   └── style.css          # Design system, glassmorphism & responsive layouts
├── index.html             # Master SPA containing all 10 core views & modals
├── .env.example           # Environment template
└── package.json           # Node dependencies
```

---

## 📄 License
MIT License © 2026 RECO AI Platforms Inc.

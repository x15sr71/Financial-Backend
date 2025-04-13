# 🧠 Personal Finance Simulator – Backend

This is the **backend service** powering the Personal Finance Simulator — a platform that lets users simulate their financial future, reverse past decisions, and receive smart, privacy-respecting AI suggestions.

---

## 📌 Features

### 1. **User Data Management**
Secure storage for:
- Financial snapshots (income, expenses, debts, investments)
- Scenario simulations
- AI recommendations

Supports user accounts, encrypted data, and syncing across devices.

### 2. **Scenario Engine API**
Endpoints for calculating:
- Net worth over time
- What-if simulations
- Backward analysis

Handles complex compound calculations for cash flow, debt repayment, investment growth, and more.

### 3. **AI Recommendation API**
Optional endpoint for:
- Generating personalized financial advice
- Applying budgeting rules (e.g., 50/30/20)
- Surface insights from spending patterns

Can use local inference or connect to an external LLM with rate limiting and privacy protection.

### 4. **Authentication & Authorization**
- Auth via Supabase/Firebase/JWT
- Secure access to user-specific data

### 5. **Privacy by Design**
- All sensitive data encrypted
- Users control their data
- Compliant with local storage or account-bound sync

---

## ⚙️ Tech Stack

- **Language:** TypeScript / Node.js
- **Framework:** Express.js / Fastify
- **Database:** PostgreSQL (via Prisma ORM)
- **Auth:** Supabase Auth / Firebase Auth
- **AI Integration:** OpenAI (optional), or local models
- **Storage:** Supabase / GCP Bucket / Local (depending on config)
- **Deployment:** Render / Railway / Fly.io / AWS Lambda

---

## 🚀 Getting Started

```bash
git clone https://github.com/x15sr71/Financial-Backend.git
cd Financial-Backend
npm install
npm run dev

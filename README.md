# PayD: Stellar-Based Cross-Border Payroll Platform!

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Stellar](https://img.shields.io/badge/Powered%20by-Stellar-7B68EE)](https://www.stellar.org/)

## 🧩 Project Summary

PayD is a revolutionary payroll system that enables organizations to pay employees, contractors, and partners across different countries using blockchain-based digital assets. By leveraging Stellar's fast, low-cost network, PayD replaces traditional banking rails with near-instant, transparent, and cost-effective payments.

**Key Benefits:**

- ⚡ Near-instant salary payments (seconds vs. days)
- 🔍 Transparent transaction tracking on-chain
- 💰 Lower cross-border fees (fraction of traditional banking)
- 📊 Stable-value payouts with predictable conversion rates

## 🚨 Problem This Solves

Traditional international payroll faces significant challenges:

| Problem                        | Impact                                  |
| ------------------------------ | --------------------------------------- |
| International bank delays      | Payments take 2–5 business days         |
| High transfer fees             | SWIFT + intermediary fees (often 5-15%) |
| Currency conversion issues     | Unpredictable FX rates and hidden fees  |
| Lack of proof                  | Difficult to verify payment delivery    |
| Contractor/freelancer payments | Many unbanked or prefer digital methods |

## 💡 Core Concept

Instead of routing through expensive banking infrastructure:

All transactions occur on-chain with full transparency and auditability.

## 🏗 System Architecture

┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐ │ Organization │ │ Backend │ │ Stellar │ │ Dashboard │────│ (API) │────│ Network │ │ (Web App) │ │ │ │ │ └─────────────────┘ └──────────────┘ └─────────────────┘ │ │ │ ▼ ▼ ▼ ┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐ │ Employee │ │ Payroll │ │ Employee │ │ Onboarding │ │ Engine │ │ Wallets │ └─────────────────┘ └──────────────┘ └─────────────────┘ │ ▼ ┌─────────────────┐ │ Local Anchors │ │ (Cash-out) │ └─────────────────┘

## 🔑 Main Actors

| Actor                   | Role                                                          |
| ----------------------- | ------------------------------------------------------------- |
| **Employer**            | Funds payroll, schedules payments, manages employees          |
| **Employee/Contractor** | Receives salary in digital assets, converts to local currency |
| **Backend System**      | Handles payroll logic, transaction processing                 |
| **Stellar Network**     | Processes fast, low-cost transactions                         |
| **Anchor Services**     | Converts digital assets to local bank/mobile money            |

## 💰 Asset Design on Stellar

PayD utilizes Stellar's asset issuance capabilities to create organization-specific stable assets:

### Example Asset: ORGUSD

- **Issuer Account**: Controlled by the organization
- **Backing**: 1:1 with USD (or other stable currencies)
- **Distribution**: Through organization's distribution account
- **Trustlines**: Employees must accept the asset to receive payments

### Stellar Concepts Employed

- **Asset Issuance**: Creating custom tokens for payroll
- **Distribution Accounts**: Managing bulk payments
- **Trustlines**: Employee wallet acceptance
- **Anchors**: Local currency conversion
- **Fast Settlement**: Sub-5 second transaction finality

## ⚙️ Core Features

### 1️⃣ Employer Dashboard

- **Employee Management**: Add/remove employees with wallet addresses
- **Salary Configuration**: Set amounts, frequencies (weekly/monthly)
- **Bulk Upload**: CSV import for payroll lists
- **Payment Scheduling**: Automated recurring payments
- **Analytics**: Payroll history, total costs, FX tracking

### 2️⃣ Employee Portal

- **Salary Tracking**: View incoming payments
- **Transaction History**: Complete on-chain records
- **Balance Management**: Asset balances and values
- **Withdrawal Options**: Multiple anchor services
- **Wallet Integration**: QR codes for easy setup

### 3️⃣ Payroll Engine (Backend)

**Automated Payment Flow:**

1. Checks scheduled payments at designated times
2. Verifies employer account balance and authorization
3. Signs and submits Stellar transactions
4. Processes bulk payments efficiently
5. Logs all transactions in database
6. Sends notifications to employees

### 4️⃣ FX & Conversion System

- **Real-time Rates**: Live asset-to-fiat conversion (see our [FX Rate Fetching Logic](docs/FX_RATE_FETCHING_LOGIC.md) for details on fallback and caching architecture).
- **Anchor Fees**: Transparent withdrawal costs
- **Network Fees**: Minimal Stellar transaction fees
- **Multi-currency Support**: Support for various local currencies

### 5️⃣ Transparency & Auditability

Every payment includes:

- **Transaction Hash**: Unique Stellar transaction ID
- **Timestamp**: Exact payment time
- **On-chain Verification**: Public ledger proof
- **Audit Trail**: Complete payment history

## 🛠 Tech Stack

### Frontend

- **React 19** - Modern UI framework
- **TypeScript** - Type-safe development
### Backend

- **Node.js** - Runtime environment
- **Express.js** - API framework
- **Stellar SDK** - Blockchain integration
- **PostgreSQL** - Data persistence
- **Redis** - Caching and session management

### Blockchain

- **Stellar Network** - Primary blockchain
- **Soroban** - Smart contracts including:
  - **Bulk Payment**: Efficiently distribute funds to multiple recipients.
  - **Revenue Split**: Automate the division of incoming payments.
  - **Vesting Escrow**: Lock and gradually release tokens over time.
  - **Cross-Asset Payment**: Seamlessly convert assets during payments.
  - **Asset Path Payment**: Advanced routing for payments across different assets.
- **Stellar Wallets Kit** - Wallet integration

### DevOps

- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipelines
- **ESLint + Prettier** - Code quality
- **Husky** - Git hooks

## 🚀 Quick Start

Start PayD locally in three steps:

1. **Clone and enter the repo**
   ```bash
   git clone https://github.com/Gildado/PayD.git
   cd PayD
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Create your local environment and start the app**
   ```bash
   cp .env.example .env
   npm run dev
   ```

Need the full setup? Keep reading for prerequisites, environment variables, and database setup.

For cloud hosting instructions, see the deployment guide:

- [Vercel + Render Deployment Guide](docs/DEPLOYMENT_GUIDE_VERCEL_RENDER.md)
- [Staging Environment Known Issues](docs/STAGING_ISSUES.md)
- [Local Contract Bootstrap](docs/LOCAL_CONTRACT_BOOTSTRAP.md)
- [Filenaming Conventions](docs/FILENAMING_CONVENTIONS.md)

## Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** v22+
- **npm** or **yarn**
- **Rust** (for Soroban contracts)
- **Stellar CLI**
- **Docker** (optional, for local development)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Gildado/PayD.git
   cd PayD
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Setup:**

   ```bash
   cp .env.example .env
   ```

   _Edit `.env` with your configuration._

4. **Database Setup:**
   ```bash
   # Using Docker
   docker run --name payd-postgres -e POSTGRES_PASSWORD=mypassword -p 5432:5432 -d postgres:15
   ```
   _Or set up PostgreSQL manually._

### Configuration

Edit `.env` with the following key variables:

```env
# Stellar Network
STELLAR_NETWORK=testnet # or mainnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/payd

# API Keys
STELLAR_SECRET_KEY=your_issuer_secret_key
ANCHOR_API_KEY=your_anchor_service_key

# JWT
JWT_SECRET=your_jwt_secret
```

### Development

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run tests:

```bash
npm run test
```

### Local Soroban Contracts

If you want to build, deploy, and seed the local Soroban contracts in one pass,
use the bootstrap helper:

```bash
python3 scripts/local_contract_bootstrap.py --dry-run
```

The script lives in [docs/LOCAL_CONTRACT_BOOTSTRAP.md](docs/LOCAL_CONTRACT_BOOTSTRAP.md)
and can be run with `--contract` flags to limit the scope.

## 🙌 Contributors

We'd like to extend a huge thank you to everyone who has contributed to making PayD what it is today! For a full list of our amazing contributors, please see our [Contributors List](CONTRIBUTORS.md).

[![All Contributors](https://img.shields.io/badge/all_contributors-2-orange.svg?style=flat-square)](#contributors)

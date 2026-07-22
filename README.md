# WiWaste — Smart Inventory & POS System

A full-stack inventory management and point-of-sale system for small retail pharmacies.
Built with **Laravel 12 (Backend API)** + **React + Vite (Frontend)**.

---

## 📋 Prerequisites

Make sure these are installed on your machine before starting:

| Tool | Version | Download |
|------|---------|----------|
| PHP | 8.2 or higher | https://www.php.net/downloads |
| Composer | Latest | https://getcomposer.org |
| MySQL / MariaDB | 8.0+ | https://dev.mysql.com/downloads/ |
| Node.js | 18 or higher | https://nodejs.org |
| npm | 9 or higher | Included with Node.js |
| Git | Latest | https://git-scm.com |

> **Tip:** If you're on Windows, using [XAMPP](https://www.apachefriends.org/) or [Laragon](https://laragon.org/) gives you PHP + MySQL in one installer.

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd WiWaste
```

---

## 🗄️ Backend Setup (Laravel API)

The backend is a Laravel REST API located in the `Backend/` folder.

### Step 1 — Navigate to the Backend folder

```bash
cd Backend
```

### Step 2 — Install PHP dependencies

```bash
composer install
```

### Step 3 — Set up environment file

```bash
cp .env.example .env
```

Then open `.env` and configure your **database connection**:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=CAP22
DB_USERNAME=root
DB_PASSWORD=
```

> **Note:** Create the database `CAP22` in MySQL/phpMyAdmin first if it doesn't exist:
> ```sql
> CREATE DATABASE CAP22;
> ```

### Step 4 — Generate application key

```bash
php artisan key:generate
```

### Step 5 — Run migrations and seed the database

```bash
php artisan migrate:fresh --seed
```

This will:
- Create all tables (users, products, inventory, sales, wastage, etc.)
- Seed default users (Owner, Inventory Staff, Cashier)
- Seed sample products and categories

### Step 6 — Start the Laravel development server

```bash
php artisan serve
```

The backend API will be running at: **`http://localhost:8000`**

> Keep this terminal open while developing.

---

## 💻 Frontend Setup (React + Vite)

The frontend is a React/TypeScript app located in the `Frontend/` folder.

### Step 1 — Open a new terminal and navigate to the Frontend folder

```bash
cd Frontend
```

### Step 2 — Install Node.js dependencies

```bash
npm install
```

### Step 3 — Start the Vite development server

```bash
npm run dev
```

The frontend will be running at: **`http://localhost:5173`**

> Keep this terminal open while developing.

---

## 🔑 Default Login Credentials

Use these accounts to log in after seeding:

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@wiwaste.com | password |
| Inventory Staff | inventory@wiwaste.com | password |
| Cashier | cashier@wiwaste.com | password |

> On the login page, you can use the **"Select User"** role picker to auto-fill credentials for quick demo access.

---

## 🖥️ Running Both Servers

You need **two terminals open at the same time**:

**Terminal 1 — Backend:**
```bash
cd WiWaste/Backend
php artisan serve
```

**Terminal 2 — Frontend:**
```bash
cd WiWaste/Frontend
npm run dev
```

Then open your browser and go to: **`http://localhost:5173`**

---

## 🏗️ Building for Production

To build the frontend for production deployment:

```bash
cd Frontend
npm run build
```

Built files will be in `Frontend/dist/`.

---

## 🔧 Common Issues & Fixes

### ❌ `php artisan serve` fails — class not found or autoload error
```bash
composer dump-autoload
```

### ❌ Migration errors / table already exists
```bash
php artisan migrate:fresh --seed
```
> ⚠️ This drops all tables and re-creates them. All data will be lost.

### ❌ Frontend can't connect to backend (CORS / 404 on API calls)
- Make sure the Laravel server is running on port `8000`
- Check `Frontend/src/services/api.ts` — the base URL should be `http://localhost:8000`

### ❌ `npm install` fails
```bash
npm install --legacy-peer-deps
```

### ❌ MySQL access denied
- Open `.env` in `Backend/` and verify `DB_USERNAME` and `DB_PASSWORD` match your MySQL credentials
- Default XAMPP/Laragon: username `root`, password is empty

---

## 📁 Project Structure

```
WiWaste/
├── Backend/          # Laravel 12 REST API
│   ├── app/
│   │   ├── Http/Controllers/Api/   # API Controllers
│   │   └── Models/                 # Eloquent Models
│   ├── database/
│   │   ├── migrations/             # Database schema
│   │   └── seeders/                # Sample data
│   └── routes/api.php              # API routes
│
└── Frontend/         # React + TypeScript + Vite
    ├── src/
    │   ├── pages/
    │   │   ├── admin/              # Owner pages (Products, Users)
    │   │   ├── inventory/          # Inventory Staff pages
    │   │   ├── cashier/            # Cashier POS Terminal
    │   │   └── dashboard/          # Analytics & Reports
    │   ├── services/api.ts         # API service layer
    │   └── styles/theme.css        # Global styles
    └── package.json
```

---

## 👥 System Roles

| Role | Access |
|------|--------|
| **Owner** | Full access — products, categories, users, reports, dashboard analytics |
| **Inventory Staff** | Stock-in/out, wastage recording, FEFO tracking, inventory adjustments |
| **Cashier** | POS terminal, sales transactions, receipt printing |

---

*WiWaste — Reducing inventory waste through smart management.*

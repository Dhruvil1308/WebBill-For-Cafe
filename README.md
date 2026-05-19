# ☕ WebBill Cafe: Full-Stack SaaS Billing & POS Platform

<div align="center">

[![Next.js Version](https://img.shields.io/badge/Next.js-16.2.6-violet?logo=nextdotjs&logoColor=white&style=flat-square)](https://nextjs.org)
[![Prisma Version](https://img.shields.io/badge/Prisma-7.8.0-indigo?logo=prisma&logoColor=white&style=flat-square)](https://prisma.io)
[![Supabase Postgres](https://img.shields.io/badge/Supabase-Database-emerald?logo=supabase&logoColor=white&style=flat-square)](https://supabase.com)
[![Base UI](https://img.shields.io/badge/Base_UI-1.4.1-blue?logo=mui&logoColor=white&style=flat-square)](https://base-ui.com)
[![Zustand State](https://img.shields.io/badge/Zustand-State_Management-amber?style=flat-square)](https://github.com/pmndrs/zustand)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS_v4.0-38bdf8?logo=tailwindcss&logoColor=white&style=flat-square)](https://tailwindcss.com)

**A high-performance, premium, and fully mobile-optimized Point-of-Sale (POS) and invoicing platform designed specifically for cafes and restaurants.**

[✨ Key Features](#-key-features) • [📈 Architecture & System Flow](#-architecture--system-flow) • [📊 Database ERD](#-database-erd) • [📱 Mobile-First Design](#-mobile-first-design) • [🛠 Installation & Sandbox Setup](#-installation--sandbox-setup)

</div>

---

## 🎨 Premium Visual Interface & Aesthetics
WebBill Cafe is designed with a state-of-the-art **Glassmorphic** and **Modern Dark Accent** interface, leveraging rich micro-interactions and transitions to create an exceptional POS checkout experience. 

*   **⚡ Fluid Micro-Animations:** Leveraging `tw-animate-css` for buttery-smooth visual feedback during menu navigation, cart edits, and category switching.
*   **🎭 Consistent Design System:** Integrated color palettes using rich violet, deep slate, and soft emerald accents.
*   **🧾 High-fidelity Thermal Receipt Rendering:** Real-time canvas rendering of professional invoices with customizable branding, logos, GST breakdowns, and restaurant credentials.

---

## ✨ Key Features

### 🛒 High-Speed POS Checkout
- Dynamic **Menu Grid** supporting quick search, instant filtering (Veg, Non-Veg, Category splits).
- Lightweight local state management using **Zustand** for sub-millisecond cart item additions, quantity modification, and automatic calculations.
- Quick order summary panel displaying subtotals, custom discounts, precise GST/taxes calculations, and net total.

### 📋 Full Billing & Order Types
- **Multiple Order Support:** Configure invoices for **Dine-In**, **Takeaway**, **Swiggy**, or **Zomato** orders.
- **Dynamic Payment Options:** Support for **Cash**, **UPI**, **Card**, or **Wallet** payments.
- **Robust Bill Ledger:** View past transactions, filter by date ranges, search by customer, edit transaction status, or print receipts instantly.

### 📈 Intelligent Analytics Dashboard
- Implements responsive, hydration-safe graphs using **Recharts** to analyze cafe performance.
- Tracks real-time **Daily Sales**, **Active Bills**, and **Category-wise volume split** using custom donut and area charts.

### 🍱 Category & Menu Administration
- Cafe Owners can manage the full inventory, configure customized categories, and toggle menu availability with instant database sync.

---

## 📈 Architecture & System Flow

```mermaid
graph TD
    %% Styling Classes
    classDef client fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff;
    classDef server fill:#4f46e5,stroke:#4338ca,stroke-width:2px,color:#fff;
    classDef database fill:#059669,stroke:#047857,stroke-width:2px,color:#fff;
    classDef state fill:#d97706,stroke:#b45309,stroke-width:2px,color:#fff;

    %% Client Layer
    subgraph Client ["Client Side (UI/UX)"]
        UI["WebBill App (Desktop & Mobile)"]:::client
        ZStore["Zustand Cart Store"]:::state
        UI -->|Reads Cart State| ZStore
    end

    %% NextJS Server Layer
    subgraph Server ["Next.js 16 Framework (Server)"]
        API["REST API Routes (/api/bills, /api/menu-items)"]:::server
        PrismaClient["Prisma Client ORM"]:::server
        API -->|Database Operations| PrismaClient
    end

    %% Database Layer
    subgraph Storage ["Backend & DB Service"]
        Supabase["Supabase Postgres DB"]:::database
        SStorage["Supabase Storage (Logos & Images)"]:::database
    end

    %% Interconnections
    UI -->|API Requests / POST / GET| API
    PrismaClient -->|Direct Query & Transactions| Supabase
    UI -->|Direct Upload| SStorage
    
    style Client fill:#faf5ff,stroke:#d8b4fe,stroke-dasharray: 5 5
    style Server fill:#eef2ff,stroke:#c7d2fe,stroke-dasharray: 5 5
    style Storage fill:#ecfdf5,stroke:#a7f3d0,stroke-dasharray: 5 5
```

---

## 📊 Database ERD

```mermaid
erDiagram
    SuperAdmin {
        string id PK
        string email UK
        datetime createdAt
    }

    Client {
        string id PK
        string email UK
        string name
        string phone
        boolean isActive
        Plan plan
        datetime subscriptionEnds
        datetime createdAt
    }

    Cafe {
        string id PK
        string clientId FK
        string name
        string address
        string phone
        string gstNumber
        string logoUrl
        string currency
        datetime createdAt
    }

    Category {
        string id PK
        string cafeId FK
        string name
        int sortOrder
        boolean isActive
        datetime createdAt
    }

    MenuItem {
        string id PK
        string cafeId FK
        string categoryId FK
        string name
        decimal price
        string imageUrl
        boolean isVeg
        boolean isAvailable
        datetime createdAt
    }

    Variant {
        string id PK
        string menuItemId FK
        string name
        decimal priceAdd
    }

    Customer {
        string id PK
        string cafeId FK
        string name
        string phone
        datetime createdAt
    }

    Bill {
        string id PK
        string cafeId FK
        string customerId FK
        string billNumber
        OrderType orderType
        PaymentMethod paymentMethod
        decimal subtotal
        decimal gstAmount
        decimal discount
        decimal total
        BillStatus status
        string note
        datetime createdAt
    }

    BillItem {
        string id PK
        string billId FK
        string menuItemId FK
        int quantity
        decimal price
        string variantName
        decimal subtotal
    }

    Client ||--o| Cafe : "owns"
    Cafe ||--o{ Category : "has"
    Cafe ||--o{ MenuItem : "sells"
    Cafe ||--o{ Bill : "generates"
    Cafe ||--o{ Customer : "records"
    Category ||--o{ MenuItem : "contains"
    MenuItem ||--o{ Variant : "possesses"
    MenuItem ||--o{ BillItem : "included_in"
    Bill ||--o{ BillItem : "comprises"
    Customer ||--o{ Bill : "places"
```

---

## 📱 Mobile-First Design & Responsiveness
WebBill Cafe is heavily optimized for multi-device testing (e.g. phones, tablets, physical POS devices).

### 1. Persistent Mobile Bottom POS Cart Drawer
On small viewports (mobile devices), the static sidebar is collapsed. Instead:
- A prominent floating **View Cart & Checkout** action bar appears at the bottom once items are in the cart.
- Tapping this bar opens a sleek, bottom-anchored slide-up sheet (`SheetContent` from Base UI) taking up `85vh` of the screen, rendering the fully functional POS cart ledger for checking out and printing tickets smoothly.

```
+------------------------------------+
|             Menu Grid              |
|  [ Pizza ]    [ Burger ]   [ Tea ] |
|  +--------+   +--------+  +------+ |
|  | Veg    |   | NonVeg |  | Veg  | |
|  | ₹199   |   | ₹149   |  | ₹20  | |
|  +--------+   +--------+  +------+ |
|                                    |
|                                    |
| +--------------------------------+ |
| |  [ShoppingBag] 3 items   View  | | <-- Dynamic FAB Bottom Drawer
| |  Cart • ₹447.00                | |
| +--------------------------------+ |
+------------------------------------+
```

### 2. Base UI Accessibility & Hydration Safety
- **No-Nesting Buttons:** Handled custom DOM element injection safely by dropping Radix-style `asChild` wrapping on trigger buttons. This guarantees accessibility standards are met and removes `In HTML, <button> cannot be a descendant of <button>` errors.
- **Custom Links:** Merged navigation handlers securely with Next.js Link tags utilizing the native `@base-ui` **`render`** API with `nativeButton={false}` configs, establishing consistent keyboard control.
- **Flexbox Recharts Fix:** Prevented rendering layout crashes (`width(-1) / height(-1)`) by using custom boundary classes (`min-h-0`) alongside dynamic `99%` width settings to secure layout boundaries during server-side hydration.

---

## 🛠 Installation & Sandbox Setup

### Prerequisites
- **Node.js** v18 or later
- **npm** or **yarn / pnpm**
- **Supabase Account / Local PostgreSQL Database**

### 1. Clone the Codebase
```bash
git clone https://github.com/Dhruvil1308/WebBill-For-Cafe.git
cd WebBill-For-Cafe/webbill
```

### 2. Install Project Dependencies
```bash
npm install
```

### 3. Setup Local Configuration
Create a `.env.local` file inside the `webbill` folder:
```env
# Database Credentials
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_ID].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_ID].supabase.co:5432/postgres"

# Supabase Auth Config
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_PROJECT_ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR_SERVICE_ROLE_KEY]"
```

### 4. Database Setup & Migrations
Sync the PostgreSQL schema with your Prisma models:
```bash
npx prisma db push
```

### 5. Seed the Sandbox Database
WebBill Cafe includes an automated seed script to populate a beautiful starter sandbox with dummy categories, sample menu items (burgers, garlic breads, drinks, waffles), active client records, and transaction histories:
```bash
npx prisma db seed
```

### 6. Run the Dev Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🚀 Mobile Testing on Local Networks
To access the local Next.js dev server on your physical smartphone via your Wi-Fi router (e.g. `http://192.168.1.4:3000`):

1. The Next.js dev server is pre-configured to allow local network connections inside `next.config.ts`:
   ```typescript
   const nextConfig = {
     reactCompiler: true,
     allowedDevOrigins: ['192.168.1.4'], // Registers your local machine's local IP address
   };
   ```
2. Make sure your smartphone and development machine are connected to the same Wi-Fi router network.
3. Open your mobile browser and navigate to `http://192.168.1.4:3000` to start testing the fluid POS cart and hamburger menu transitions instantly!

---

<div align="center">
Made with ❤️ for WebBill Cafe Owners.
</div>

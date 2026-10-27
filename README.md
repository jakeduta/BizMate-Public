## License: This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.




# BizMate

## MySQL Setup

### Prerequisites

- **MySQL 8.0 or later** installed and running locally (or on a reachable host)

### 1. Configure `.env`

Create a `.env` file at the project root (next to `package.json`) with your database credentials:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bizmate

JWT_SECRET=generate_a_long_random_string_here
PORT=5050
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Optional — enables AI summaries in the Analytics module
OPENAI_API_KEY=
```

To generate a strong `JWT_SECRET`:
```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Run the database setup (fresh install)

This single command creates the `bizmate` database and all required tables:

```
mysql -u root -p < backend/database/setup.sql
```

Then apply the tax integration schema (required for the Tax module):

```
mysql -u root -p < backend/database/tax_schema.sql
mysql -u root -p < backend/database/tax_schema_v2.sql
```

### 3. Upgrading an existing database

If you already have the database from an earlier version, run the migrations file instead of `setup.sql`:

```
mysql -u root -p bizmate < backend/database/migrations.sql
```

For geolocation support on clock-in/out (added later):

```
mysql -u root -p bizmate < backend/database/add_geolocation_to_clockins.sql
```

---

## Running in Development

Open two terminals from the project root:

**Terminal 1 — Backend:**
```
cd backend
node server.js
```

**Terminal 2 — Frontend:**
```
npm run dev
```

Or run both at once with:
```
npm run dev
```
(uses `concurrently` to start both)

---

## Building a Windows .exe

BizMate is packaged as a desktop app using **Electron** and **electron-builder**. The build process:
1. Compiles the React frontend with Vite (`dist/`)
2. Bundles the frontend + Express backend + Electron shell into a Windows NSIS installer

### Prerequisites

- **Node.js** v18 or later installed
- All dependencies installed (`npm install` from the project root)
- A `.env` file at the project root with all required environment variables (DB credentials, JWT secret, etc.)

### Steps

**1. Install dependencies (if you haven't already)**
```
npm install
```

**2. Run the build command**
```
npm run electron:build
```

This command does two things in sequence:
- `vite build` — compiles the React app into `dist/`
- `electron-builder` — packages everything into a Windows installer

**3. Find the output**

Once complete, the installer will be in the `release/` folder:
```
release/
  BizMate Setup 0.1.0.exe   <-- the installer
```

Run the `.exe` to install BizMate on any Windows machine.

### What gets bundled

The installer includes:
- `dist/` — compiled React frontend
- `backend/` — Express API server
- `electron/` — Electron main process (`main.cjs`)
- `node_modules/` — all dependencies
- `.env` — environment config (make sure this is present and correct before building)

### How the packaged app works

When launched, the Electron process:
1. Finds an available port (starting at 5050)
2. Starts the Express backend in-process on that port
3. Opens a browser window pointed at `http://localhost:<port>`

The app is self-contained — no separate server setup is needed on the end user's machine, but a MySQL database must still be accessible at the credentials configured in `.env`.

### NSIS Installer options

The installer is configured with:
- `oneClick: false` — shows a step-by-step install wizard
- `allowToChangeInstallationDirectory: true` — user can choose install location

---

# Collaborators 

### [Jake Duta](https://github.com/jakeduta), [Nathan Constancio](https://github.com/NathanConstancio092), and [Chris Hawthorne](https://github.com/ChrisHaw24).

# Supervisor

### This private project is supervised by [Dr. Ahmad Al-Shami](https://github.com/alshami10), who has repository access solely for academic guidance, review, and assessment purposes.

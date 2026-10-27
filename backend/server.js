import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

// Auth
import authRoutes    from "./routes/auth.js";
import portalRoutes  from "./routes/portal.js";
import { authenticate } from "./middleware/auth.js";

// Business routes
import appointmentRoutes  from "./routes/appointments.js";
import customerRoutes     from "./routes/customers.js";
import dashboardRoutes    from "./routes/dashboard.js";
import employeeRoutes     from "./routes/employees.js";
import invoiceRoutes      from "./routes/invoices.js";
import paymentRoutes      from "./routes/payments.js";
import clockinRoutes      from "./routes/clockins.js";
import aiImportRoute      from "./routes/aiImport.js";
import settingsRoutes     from "./routes/settings.js";
import workspaceRoutes    from "./routes/workspace.js";
import membersRoutes      from "./routes/members.js";
import permissionsRoutes  from "./routes/permissions.js";
import servicesRoutes     from "./routes/services.js";
import analyticsRoutes    from "./routes/analytics.js";
import taxRoutes          from "./routes/tax.js";

const app = express();
app.set('etag', false);

// CORS
app.use(
    cors({
        origin:         process.env.FRONTEND_URL || true,
        methods:        ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials:    true,
    })
);

// Body parsing + cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Public auth routes
app.use("/auth", authRoutes);

// Customer portal routes (user-auth only, no businessId required)
app.use("/portal", portalRoutes);

// Protected business API routes — all require a valid business-scoped JWT
app.use("/api", authenticate);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/customers",    customerRoutes);
app.use("/api/dashboard",    dashboardRoutes);
app.use("/api/employees",    employeeRoutes);
app.use("/api/invoices",     invoiceRoutes);
app.use("/api/payments",     paymentRoutes);
app.use("/api/clockins",     clockinRoutes);
app.use("/api/ai-import",    aiImportRoute);
app.use("/api/settings",     settingsRoutes);
app.use("/api/workspace",    workspaceRoutes);
app.use("/api/members",      membersRoutes);
app.use("/api/permissions",  permissionsRoutes);
app.use("/api/services",     servicesRoutes);
app.use("/api/analytics",    analyticsRoutes);
app.use("/api/tax",          taxRoutes);

// Serve React frontend (Electron / production build)
// express.static silently passes through if dist/ doesn't exist (dev mode)
const distPath = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
app.use(express.static(distPath));
app.use((req, res, next) => {
    const indexFile = resolve(distPath, "index.html");
    res.sendFile(indexFile, (err) => {
        if (err) next(); // dist not built yet — fall through to health check
    });
});

// Health check (only reachable when dist/ isn't built)
app.get("/", (req, res) => {
    res.send("BizMate backend is running");
});

// Error handler
app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

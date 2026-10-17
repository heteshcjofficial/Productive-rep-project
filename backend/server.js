"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const node_path_1 = __importDefault(require("node:path"));
const supabase_js_1 = require("@supabase/supabase-js");
dotenv_1.default.config();
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const PHASES = ["dawn", "peak", "twilight", "nocturne"];
const STRAINS = ["low", "med", "high"];
const PRESETS = ["gamma", "alpha", "theta"];
const ACCESS_MODES = ["lifetime", "custom"];
const PROVIDERS = ["google", "outlook", "apple", "manual"];
class HttpError extends Error {
    status;
    code;
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
function validSupabaseUrl(value) {
    if (!value)
        return false;
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    }
    catch {
        return false;
    }
}
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_ANON_KEY?.trim();
let supabase = null;
if (validSupabaseUrl(supabaseUrl) && supabaseKey) {
    try {
        supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                detectSessionInUrl: false,
                persistSession: false,
            },
        });
        console.info("[ChronoSync] Supabase client initialized.");
    }
    catch (error) {
        console.error("[ChronoSync] Supabase client could not be initialized.", {
            message: error instanceof Error ? error.message : "Unknown initialization error",
        });
    }
}
else {
    console.warn("[ChronoSync] Supabase is not configured; database routes will return 503.");
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function bodyRecord(value) {
    if (!isRecord(value)) {
        throw new HttpError(400, "invalid_body", "Request body must be a JSON object.");
    }
    return value;
}
function rejectUnknownKeys(body, allowed) {
    const unknown = Object.keys(body).filter((key) => !allowed.includes(key));
    if (unknown.length) {
        throw new HttpError(400, "unknown_fields", `Unsupported field(s): ${unknown.join(", ")}.`);
    }
}
function requiredString(value, field, maxLength) {
    if (typeof value !== "string" || !value.trim()) {
        throw new HttpError(400, "invalid_field", `${field} must be a non-empty string.`);
    }
    const result = value.trim();
    if (result.length > maxLength) {
        throw new HttpError(400, "invalid_field", `${field} must be at most ${maxLength} characters.`);
    }
    return result;
}
function optionalString(value, field, maxLength) {
    if (value === undefined || value === null || value === "")
        return null;
    return requiredString(value, field, maxLength);
}
function enumValue(value, options, field, fallback) {
    const candidate = value === undefined ? fallback : value;
    if (typeof candidate !== "string" || !options.includes(candidate)) {
        throw new HttpError(400, "invalid_field", `${field} must be one of: ${options.join(", ")}.`);
    }
    return candidate;
}
function boundedInteger(value, field, minimum, maximum) {
    const parsed = typeof value === "string" && value.trim() ? Number(value) : value;
    if (typeof parsed !== "number" || !Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
        throw new HttpError(400, "invalid_field", `${field} must be an integer from ${minimum} to ${maximum}.`);
    }
    return parsed;
}
function optionalScore(value, field) {
    if (value === undefined || value === null || value === "")
        return null;
    return boundedInteger(value, field, 1, 100);
}
function booleanValue(value, field, fallback) {
    const candidate = value === undefined ? fallback : value;
    if (typeof candidate !== "boolean") {
        throw new HttpError(400, "invalid_field", `${field} must be a boolean.`);
    }
    return candidate;
}
function validDate(value, field) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new HttpError(400, "invalid_field", `${field} must use YYYY-MM-DD format.`);
    }
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day) {
        throw new HttpError(400, "invalid_field", `${field} must be a valid calendar date.`);
    }
    return value;
}
function validDateTime(value, field) {
    if (typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ||
        Number.isNaN(Date.parse(value))) {
        throw new HttpError(400, "invalid_field", `${field} must be a valid ISO 8601 date-time.`);
    }
    validDate(value.slice(0, 10), field);
    return new Date(value).toISOString();
}
function idParam(req) {
    const parameter = req.params.id;
    const id = Array.isArray(parameter) ? parameter[0] : parameter;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        throw new HttpError(400, "invalid_id", "id must be a UUID.");
    }
    return id;
}
function parseTaskCreate(value) {
    const body = bodyRecord(value);
    rejectUnknownKeys(body, ["title", "phase", "strain", "duration", "completed", "source"]);
    const duration = body.duration === undefined ? "15m" : requiredString(body.duration, "duration", 8);
    if (!/^\d{1,3}m$/.test(duration) || Number.parseInt(duration, 10) < 1 || Number.parseInt(duration, 10) > 480) {
        throw new HttpError(400, "invalid_field", "duration must be a minute value from 1m to 480m (for example, 15m or 90m).");
    }
    return {
        title: requiredString(body.title, "title", 200),
        phase: enumValue(body.phase, PHASES, "phase"),
        strain: enumValue(body.strain, STRAINS, "strain", "med"),
        duration,
        completed: booleanValue(body.completed, "completed", false),
        source: optionalString(body.source, "source", 100),
    };
}
function parseTaskUpdate(value) {
    const body = bodyRecord(value);
    rejectUnknownKeys(body, ["title", "phase", "strain", "duration", "completed", "source"]);
    const patch = {};
    if (!Object.keys(body).length)
        throw new HttpError(400, "empty_update", "Provide at least one task field to update.");
    if ("title" in body)
        patch.title = requiredString(body.title, "title", 200);
    if ("phase" in body)
        patch.phase = enumValue(body.phase, PHASES, "phase");
    if ("strain" in body)
        patch.strain = enumValue(body.strain, STRAINS, "strain");
    if ("duration" in body) {
        const duration = requiredString(body.duration, "duration", 8);
        if (!/^\d{1,3}m$/.test(duration) || Number.parseInt(duration, 10) < 1 || Number.parseInt(duration, 10) > 480) {
            throw new HttpError(400, "invalid_field", "duration must be a minute value from 1m to 480m.");
        }
        patch.duration = duration;
    }
    if ("completed" in body)
        patch.completed = booleanValue(body.completed, "completed");
    if ("source" in body)
        patch.source = optionalString(body.source, "source", 100);
    return patch;
}
function parseHabitCreate(value) {
    const body = bodyRecord(value);
    rejectUnknownKeys(body, ["title", "category", "icon", "streak", "days"]);
    const days = body.days ?? [false, false, false, false, false, false, false];
    if (!Array.isArray(days) || days.length !== 7 || days.some((day) => typeof day !== "boolean")) {
        throw new HttpError(400, "invalid_field", "days must be an array of exactly seven booleans ordered Monday through Sunday.");
    }
    return {
        title: requiredString(body.title, "title", 200),
        category: body.category === undefined ? "General" : requiredString(body.category, "category", 80),
        icon: body.icon === undefined ? "🎯" : requiredString(body.icon, "icon", 32),
        streak: body.streak === undefined ? 0 : boundedInteger(body.streak, "streak", 0, 36500),
        days: days,
    };
}
function parseHabitUpdate(value) {
    const body = bodyRecord(value);
    rejectUnknownKeys(body, ["title", "category", "icon", "streak", "days"]);
    if (!Object.keys(body).length)
        throw new HttpError(400, "empty_update", "Provide at least one habit field to update.");
    const patch = {};
    if ("title" in body)
        patch.title = requiredString(body.title, "title", 200);
    if ("category" in body)
        patch.category = requiredString(body.category, "category", 80);
    if ("icon" in body)
        patch.icon = requiredString(body.icon, "icon", 32);
    if ("streak" in body)
        patch.streak = boundedInteger(body.streak, "streak", 0, 36500);
    if ("days" in body) {
        if (!Array.isArray(body.days) || body.days.length !== 7 || body.days.some((day) => typeof day !== "boolean")) {
            throw new HttpError(400, "invalid_field", "days must be an array of exactly seven booleans ordered Monday through Sunday.");
        }
        patch.days = body.days;
    }
    return patch;
}
function parseRetrospective(value) {
    const body = bodyRecord(value);
    rejectUnknownKeys(body, ["text", "reflection", "mood", "energy", "date"]);
    const reflection = body.text ?? body.reflection;
    return {
        date: body.date === undefined ? new Date().toISOString().slice(0, 10) : validDate(body.date, "date"),
        text: reflection === undefined ? "" : requiredString(reflection, "text", 10000),
        mood: optionalScore(body.mood, "mood"),
        energy: optionalScore(body.energy, "energy"),
    };
}
function parseFocusSession(value) {
    const body = bodyRecord(value);
    rejectUnknownKeys(body, ["preset", "duration_minutes", "duration", "completed", "started_at", "notes"]);
    let minutes;
    if (body.duration_minutes !== undefined) {
        minutes = boundedInteger(body.duration_minutes, "duration_minutes", 1, 480);
    }
    else if (typeof body.duration === "string" && /^\d{1,3}m$/.test(body.duration)) {
        minutes = boundedInteger(Number.parseInt(body.duration, 10), "duration_minutes", 1, 480);
    }
    else {
        throw new HttpError(400, "invalid_field", "duration_minutes (or duration such as 90m) is required.");
    }
    return {
        preset: enumValue(body.preset, PRESETS, "preset"),
        duration_minutes: minutes,
        completed: booleanValue(body.completed, "completed", true),
        started_at: body.started_at === undefined ? new Date().toISOString() : validDateTime(body.started_at, "started_at"),
        notes: optionalString(body.notes, "notes", 2000),
    };
}
function parseCalendarEvent(value) {
    const body = bodyRecord(value);
    rejectUnknownKeys(body, [
        "provider", "provider_name", "providerName", "title", "starts_at", "start_at", "start",
        "ends_at", "end_at", "end", "time", "is_protected", "isProtected", "cost", "attendees",
    ]);
    const startsAtValue = body.starts_at ?? body.start_at ?? body.start;
    const endsAtValue = body.ends_at ?? body.end_at ?? body.end;
    const startsAt = validDateTime(startsAtValue, "starts_at");
    const endsAt = validDateTime(endsAtValue, "ends_at");
    if (Date.parse(startsAt) >= Date.parse(endsAt)) {
        throw new HttpError(400, "invalid_range", "ends_at must be later than starts_at.");
    }
    const isProtected = body.is_protected ?? body.isProtected;
    const providerName = body.provider_name ?? body.providerName;
    const cost = body.cost === undefined ? "med" : enumValue(body.cost, STRAINS, "cost");
    return {
        provider: enumValue(body.provider, PROVIDERS, "provider", "manual"),
        provider_name: optionalString(providerName, "provider_name", 100),
        title: requiredString(body.title, "title", 200),
        starts_at: startsAt,
        ends_at: endsAt,
        time: optionalString(body.time, "time", 100),
        is_protected: booleanValue(isProtected, "is_protected", false),
        cost,
        attendees: body.attendees === undefined ? 1 : boundedInteger(body.attendees, "attendees", 0, 10000),
    };
}
function parseAccessLimit(value) {
    const body = bodyRecord(value);
    rejectUnknownKeys(body, ["mode", "days_limit", "daysLimit", "start_date", "startDate", "unlocked_features", "unlockedFeatures"]);
    const mode = enumValue(body.mode, ACCESS_MODES, "mode");
    const rawLimit = body.days_limit ?? body.daysLimit;
    const daysLimit = mode === "lifetime"
        ? 99999
        : boundedInteger(rawLimit, "days_limit", 1, 36500);
    const rawStartDate = body.start_date ?? body.startDate;
    const rawFeatures = body.unlocked_features ?? body.unlockedFeatures;
    if (rawFeatures !== undefined && (!Array.isArray(rawFeatures) || rawFeatures.some((item) => typeof item !== "string" || item.length > 80))) {
        throw new HttpError(400, "invalid_field", "unlocked_features must be an array of strings no longer than 80 characters.");
    }
    return {
        singleton: true,
        mode,
        days_limit: daysLimit,
        start_date: rawStartDate === undefined ? new Date().toISOString() : validDateTime(rawStartDate, "start_date"),
        unlocked_features: rawFeatures ?? ["all", "multi-calendar", "focus-studio", "analytics"],
    };
}
function databaseRequired(_req, res, next) {
    if (!supabase) {
        res.status(503).json({
            error: "database_not_configured",
            message: "Set SUPABASE_URL and SUPABASE_ANON_KEY to enable this endpoint.",
        });
        return;
    }
    next();
}
function sendDatabaseError(res, operation, error) {
    const status = error.code === "42501" ? 403 : 500;
    console.error(`[ChronoSync] ${operation} failed.`, { code: error.code ?? "unknown" });
    return res.status(status).json({
        error: status === 403 ? "database_permission_denied" : "database_error",
        message: status === 403 ? "The database role is not allowed to perform this operation." : "The database request failed.",
    });
}
function notFound(res, resource) {
    return res.status(404).json({ error: "not_found", message: `${resource} was not found.` });
}
function makeCorsOptions() {
    const origins = (process.env.CORS_ORIGIN ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
    return {
        credentials: false,
        origin(origin, callback) {
            if (!origin || origins.includes("*") || origins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new HttpError(403, "cors_origin_denied", "This origin is not allowed by CORS_ORIGIN."));
        },
    };
}
function createApp(client) {
    const app = (0, express_1.default)();
    app.disable("x-powered-by");
    app.use((req, res, next) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("X-Frame-Options", "DENY");
        res.setHeader("Referrer-Policy", "no-referrer");
        next();
    });
    app.use((0, cors_1.default)(makeCorsOptions()));
    app.use(express_1.default.json({ limit: "64kb" }));
    app.get("/api/health", async (_req, res) => {
        if (!client) {
            res.status(200).json({
                status: "degraded",
                timestamp: new Date().toISOString(),
                uptime_seconds: Math.floor(process.uptime()),
                database: { configured: false, connected: false },
            });
            return;
        }
        const { error } = await client.from("tasks").select("id").limit(1);
        const connected = !error;
        res.status(connected ? 200 : 503).json({
            status: connected ? "ok" : "degraded",
            timestamp: new Date().toISOString(),
            uptime_seconds: Math.floor(process.uptime()),
            database: { configured: true, connected },
        });
    });
    app.get("/api/tasks", databaseRequired, async (req, res) => {
        const phaseQuery = req.query.phase;
        if (phaseQuery !== undefined && (typeof phaseQuery !== "string" || !PHASES.includes(phaseQuery))) {
            throw new HttpError(400, "invalid_query", `phase must be one of: ${PHASES.join(", ")}.`);
        }
        let query = client.from("tasks").select("*").order("created_at", { ascending: true });
        if (typeof phaseQuery === "string")
            query = query.eq("phase", phaseQuery);
        const { data, error } = await query;
        if (error)
            return sendDatabaseError(res, "list tasks", error);
        res.json(data);
    });
    app.post("/api/tasks", databaseRequired, async (req, res) => {
        const task = parseTaskCreate(req.body);
        const { data, error } = await client.from("tasks").insert(task).select("*").single();
        if (error)
            return sendDatabaseError(res, "create task", error);
        res.status(201).json(data);
    });
    app.put("/api/tasks/:id", databaseRequired, async (req, res) => {
        const id = idParam(req);
        const patch = parseTaskUpdate(req.body);
        const { data, error } = await client.from("tasks").update(patch).eq("id", id).select("*").maybeSingle();
        if (error)
            return sendDatabaseError(res, "update task", error);
        if (!data)
            return notFound(res, "Task");
        res.json(data);
    });
    app.delete("/api/tasks/:id", databaseRequired, async (req, res) => {
        const id = idParam(req);
        const { data, error } = await client.from("tasks").delete().eq("id", id).select("id").maybeSingle();
        if (error)
            return sendDatabaseError(res, "delete task", error);
        if (!data)
            return notFound(res, "Task");
        res.status(204).send();
    });
    app.get("/api/habits", databaseRequired, async (_req, res) => {
        const { data, error } = await client.from("habits").select("*").order("created_at", { ascending: true });
        if (error)
            return sendDatabaseError(res, "list habits", error);
        res.json(data);
    });
    app.post("/api/habits", databaseRequired, async (req, res) => {
        const habit = parseHabitCreate(req.body);
        const { data, error } = await client.from("habits").insert(habit).select("*").single();
        if (error)
            return sendDatabaseError(res, "create habit", error);
        res.status(201).json(data);
    });
    app.put("/api/habits/:id", databaseRequired, async (req, res) => {
        const id = idParam(req);
        const patch = parseHabitUpdate(req.body);
        const { data, error } = await client.from("habits").update(patch).eq("id", id).select("*").maybeSingle();
        if (error)
            return sendDatabaseError(res, "update habit", error);
        if (!data)
            return notFound(res, "Habit");
        res.json(data);
    });
    app.delete("/api/habits/:id", databaseRequired, async (req, res) => {
        const id = idParam(req);
        const { data, error } = await client.from("habits").delete().eq("id", id).select("id").maybeSingle();
        if (error)
            return sendDatabaseError(res, "delete habit", error);
        if (!data)
            return notFound(res, "Habit");
        res.status(204).send();
    });
    app.get("/api/retrospective", databaseRequired, async (req, res) => {
        const dateQuery = req.query.date;
        if (dateQuery !== undefined && typeof dateQuery !== "string") {
            throw new HttpError(400, "invalid_query", "date must use YYYY-MM-DD format.");
        }
        let query = client.from("retrospectives").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
        if (typeof dateQuery === "string")
            query = query.eq("date", validDate(dateQuery, "date"));
        const { data, error } = await query;
        if (error)
            return sendDatabaseError(res, "list retrospectives", error);
        res.json(data);
    });
    app.post("/api/retrospective", databaseRequired, async (req, res) => {
        const reflection = parseRetrospective(req.body);
        const { data, error } = await client.from("retrospectives")
            .upsert(reflection, { onConflict: "date" })
            .select("*")
            .single();
        if (error)
            return sendDatabaseError(res, "save retrospective", error);
        res.status(201).json(data);
    });
    app.get("/api/focus-sessions", databaseRequired, async (_req, res) => {
        const { data, error } = await client.from("focus_sessions").select("*").order("started_at", { ascending: false });
        if (error)
            return sendDatabaseError(res, "list focus sessions", error);
        res.json(data);
    });
    app.post("/api/focus-sessions", databaseRequired, async (req, res) => {
        const session = parseFocusSession(req.body);
        const { data, error } = await client.from("focus_sessions").insert(session).select("*").single();
        if (error)
            return sendDatabaseError(res, "create focus session", error);
        res.status(201).json(data);
    });
    app.get("/api/events", databaseRequired, async (req, res) => {
        const fromQuery = req.query.from;
        const toQuery = req.query.to;
        if (fromQuery !== undefined && typeof fromQuery !== "string")
            throw new HttpError(400, "invalid_query", "from must be an ISO 8601 date-time.");
        if (toQuery !== undefined && typeof toQuery !== "string")
            throw new HttpError(400, "invalid_query", "to must be an ISO 8601 date-time.");
        let query = client.from("calendar_events").select("*").order("starts_at", { ascending: true });
        if (typeof fromQuery === "string")
            query = query.gte("starts_at", validDateTime(fromQuery, "from"));
        if (typeof toQuery === "string")
            query = query.lte("starts_at", validDateTime(toQuery, "to"));
        const { data, error } = await query;
        if (error)
            return sendDatabaseError(res, "list calendar events", error);
        res.json(data);
    });
    app.post("/api/events", databaseRequired, async (req, res) => {
        const event = parseCalendarEvent(req.body);
        let conflictQuery = client.from("calendar_events")
            .select("id, title, starts_at, ends_at")
            .lt("starts_at", event.ends_at)
            .gt("ends_at", event.starts_at);
        if (!event.is_protected)
            conflictQuery = conflictQuery.eq("is_protected", true);
        const { data: conflicts, error: conflictError } = await conflictQuery;
        if (conflictError)
            return sendDatabaseError(res, "check calendar conflicts", conflictError);
        if (conflicts?.length) {
            res.status(409).json({
                error: "calendar_conflict",
                message: "This time overlaps an existing event or a protected deep-work block.",
                conflicts,
            });
            return;
        }
        const { data, error } = await client.from("calendar_events").insert(event).select("*").single();
        if (error)
            return sendDatabaseError(res, "create calendar event", error);
        res.status(201).json(data);
    });
    app.delete("/api/events/:id", databaseRequired, async (req, res) => {
        const id = idParam(req);
        const { data, error } = await client.from("calendar_events").delete().eq("id", id).select("id").maybeSingle();
        if (error)
            return sendDatabaseError(res, "delete calendar event", error);
        if (!data)
            return notFound(res, "Calendar event");
        res.status(204).send();
    });
    app.get("/api/access-limit", databaseRequired, async (_req, res) => {
        const { data, error } = await client.from("access_limits").select("*").eq("singleton", true).maybeSingle();
        if (error)
            return sendDatabaseError(res, "read access limit", error);
        res.json(data ?? {
            singleton: true,
            mode: "lifetime",
            days_limit: 99999,
            start_date: new Date().toISOString(),
            unlocked_features: ["all", "multi-calendar", "focus-studio", "analytics"],
        });
    });
    app.post("/api/access-limit", databaseRequired, async (req, res) => {
        const policy = parseAccessLimit(req.body);
        const { data, error } = await client.from("access_limits")
            .upsert(policy, { onConflict: "singleton" })
            .select("*")
            .single();
        if (error)
            return sendDatabaseError(res, "save access limit", error);
        res.json(data);
    });
    app.use("/api", (_req, res) => {
        res.status(404).json({ error: "not_found", message: "API endpoint not found." });
    });
    const publicDirectory = node_path_1.default.resolve(__dirname, "../public");
    app.use(express_1.default.static(publicDirectory, { index: false }));
    app.get("*splat", (req, res, next) => {
        if (req.method !== "GET" || req.path.startsWith("/api/")) {
            next();
            return;
        }
        res.sendFile(node_path_1.default.join(publicDirectory, "index.html"), (error) => {
            if (error)
                next(error);
        });
    });
    const errorHandler = (error, _req, res, _next) => {
        if (error instanceof HttpError) {
            res.status(error.status).json({ error: error.code, message: error.message });
            return;
        }
        if (error instanceof SyntaxError && "body" in error) {
            res.status(400).json({ error: "invalid_json", message: "Request body must contain valid JSON." });
            return;
        }
        console.error("[ChronoSync] Unhandled request error.", {
            message: error instanceof Error ? error.message : "Unknown error",
        });
        res.status(500).json({ error: "internal_error", message: "An unexpected server error occurred." });
    };
    app.use(errorHandler);
    return app;
}
const app = createApp(supabase);
if (require.main === module) {
    const server = app.listen(PORT, "0.0.0.0", () => {
        console.info(`[ChronoSync] API listening on 0.0.0.0:${PORT}.`);
    });
    const shutdown = (signal) => {
        console.info(`[ChronoSync] ${signal} received; shutting down.`);
        server.close((error) => {
            if (error) {
                console.error("[ChronoSync] Server shutdown failed.", { message: error.message });
                process.exitCode = 1;
            }
        });
    };
    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("SIGINT", () => shutdown("SIGINT"));
}
module.exports = app;
//# sourceMappingURL=server.js.map
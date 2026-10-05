const { createHmac, randomInt, randomUUID, timingSafeEqual } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

const PRIZES = [
    { name: "1K $POT", type: "normal", value: 1_000 },
    { name: "2K $POT", type: "normal", value: 2_000 },
    { name: "MINI JACKPOT", type: "mini", value: 20_000 },
    { name: "3K $POT", type: "normal", value: 3_000 },
    { name: "5K $POT", type: "normal", value: 5_000 },
    { name: "8K $POT", type: "normal", value: 8_000 },
    { name: "10K $POT", type: "normal", value: 10_000 },
    { name: "MAJOR JACKPOT", type: "major", value: 50_000 },
    { name: "1K $POT", type: "normal", value: 1_000 },
    { name: "2K $POT", type: "normal", value: 2_000 },
    { name: "3K $POT", type: "normal", value: 3_000 },
    { name: "5K $POT", type: "normal", value: 5_000 },
    { name: "GRAND JACKPOT", type: "grand", value: 500_000 },
    { name: "8K $POT", type: "normal", value: 8_000 },
    { name: "10K $POT", type: "normal", value: 10_000 },
    { name: "1K $POT", type: "normal", value: 1_000 }
];

let supabase;

function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
    }

    supabase ||= createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    });

    return supabase;
}

function sendJson(response, status, payload) {
    response.status(status)
        .setHeader("Content-Type", "application/json; charset=utf-8")
        .setHeader("Cache-Control", "no-store")
        .setHeader("X-Content-Type-Options", "nosniff");
    response.end(JSON.stringify(payload));
}

function requirePost(request, response) {
    if (request.method !== "POST") {
        response.setHeader("Allow", "POST");
        sendJson(response, 405, { error: "Method not allowed." });
        return false;
    }

    const origin = request.headers.origin;
    const requestHost = request.headers["x-forwarded-host"] || request.headers.host;
    if (origin && requestHost) {
        try {
            if (new URL(origin).host !== requestHost) {
                sendJson(response, 403, { error: "Request origin is not allowed." });
                return false;
            }
        } catch (error) {
            sendJson(response, 403, { error: "Request origin is not allowed." });
            return false;
        }
    }

    return true;
}

function readBody(request) {
    if (request.body && typeof request.body === "object") {
        return request.body;
    }

    if (typeof request.body === "string") {
        try {
            return JSON.parse(request.body);
        } catch (error) {
            throw Object.assign(new Error("Invalid JSON request body."), {
                code: "INVALID_JSON"
            });
        }
    }

    return {};
}

function signature(sessionId) {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error("SESSION_SECRET must contain at least 32 characters.");
    }

    return createHmac("sha256", secret).update(sessionId).digest("base64url");
}

function getSessionId(request, response) {
    const cookieHeader = request.headers.cookie || "";
    const token = cookieHeader
        .split(";")
        .map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith("spin_session="))
        ?.slice("spin_session=".length);

    if (token) {
        const [sessionId, suppliedSignature] = token.split(".");
        if (sessionId && suppliedSignature && /^[0-9a-f-]{36}$/i.test(sessionId)) {
            const expected = Buffer.from(signature(sessionId));
            const supplied = Buffer.from(suppliedSignature);
            if (supplied.length === expected.length && timingSafeEqual(supplied, expected)) {
                return sessionId;
            }
        }
    }

    const sessionId = randomUUID();
    response.setHeader(
        "Set-Cookie",
        `spin_session=${sessionId}.${signature(sessionId)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000`
    );
    return sessionId;
}

function isSolanaAddress(value) {
    return typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
}

function isEmail(value) {
    return typeof value === "string" &&
        value.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function choosePrize() {
    const roll = randomInt(10_000);

    if (roll < 1) {
        return PRIZES.findIndex(prize => prize.type === "grand");
    }
    if (roll < 10) {
        return PRIZES.findIndex(prize => prize.type === "major");
    }
    if (roll < 30) {
        return PRIZES.findIndex(prize => prize.type === "mini");
    }

    const normalSlots = PRIZES
        .map((prize, index) => prize.type === "normal" ? index : -1)
        .filter(index => index >= 0);
    return normalSlots[randomInt(normalSlots.length)];
}

async function reserveSessionSpin(client, sessionId, now) {
    const { data, error } = await client.rpc("reserve_spin_session", {
        p_session_id: sessionId,
        p_now: now.toISOString(),
        p_cooldown_seconds: 30
    });

    if (error) {
        throw error;
    }

    return data;
}

async function getSessionLastSpin(client, sessionId) {
    const { data, error } = await client
        .from("spin_sessions")
        .select("last_spin_at")
        .eq("session_id", sessionId)
        .maybeSingle();

    if (error) {
        throw error;
    }
    if (!data) {
        throw new Error("Could not read spin session cooldown.");
    }

    return data.last_spin_at;
}

async function getBalance(client, { wallet, sessionId }) {
    let query = client.from("spins").select("prize_value");
    query = wallet
        ? query.eq("wallet", wallet).eq("status", "claimed")
        : query.eq("session_id", sessionId);

    const { data, error } = await query;
    if (error) {
        throw error;
    }

    return data.reduce((sum, spin) => sum + spin.prize_value, 0);
}

async function sendSpinEmail(client, spin, wallet, playerName, playerEmail) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    const to = process.env.ADMIN_NOTIFICATION_EMAIL;

    if (!apiKey || !from || !to) {
        const message = "Email settings are incomplete; set RESEND_API_KEY, RESEND_FROM_EMAIL, and ADMIN_NOTIFICATION_EMAIL.";
        const { error } = await client
            .from("spins")
            .update({ email_status: "failed", email_error: message })
            .eq("spin_id", spin.spin_id);
        if (error) throw error;
        return { sent: false, error: message };
    }

    const timestamp = new Date(spin.spun_at).toISOString();
    const text = [
        "A $POT Lucky Wheels spin was recorded.",
        `Name: ${playerName || "Not provided"}`,
        `Email: ${playerEmail || "Not provided"}`,
        `Solana wallet: ${wallet}`,
        `Prize: ${spin.prize_name}`,
        `Date/time (UTC): ${timestamp}`,
        `Spin ID: ${spin.spin_id}`
    ].join("\n");

    try {
        const result = await fetch("https://api.resend.com/emails", {
            method: "POST",
            signal: AbortSignal.timeout(8_000),
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "Idempotency-Key": `spin-${spin.spin_id}`
            },
            body: JSON.stringify({
                from,
                to: [to],
                subject: `$POT spin: ${spin.prize_name}`,
                text
            })
        });

        if (!result.ok) {
            const details = await result.text();
            throw new Error(`Resend returned ${result.status}: ${details.slice(0, 300)}`);
        }

        const { error } = await client
            .from("spins")
            .update({ email_status: "sent", email_error: null })
            .eq("spin_id", spin.spin_id);
        if (error) throw error;
        return { sent: true };
    } catch (error) {
        console.error("Spin notification email failed:", error);
        const message = "Spin saved, but the notification email could not be sent.";
        const { error: updateError } = await client
            .from("spins")
            .update({ email_status: "failed", email_error: String(error.message).slice(0, 500) })
            .eq("spin_id", spin.spin_id);
        if (updateError) throw updateError;
        return { sent: false, error: message };
    }
}

module.exports = {
    PRIZES,
    choosePrize,
    getBalance,
    getSessionId,
    getSessionLastSpin,
    getSupabase,
    isEmail,
    isSolanaAddress,
    readBody,
    requirePost,
    reserveSessionSpin,
    sendJson,
    sendSpinEmail
};

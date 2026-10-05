const {
    getBalance,
    getSessionId,
    getSupabase,
    isEmail,
    isSolanaAddress,
    readBody,
    requirePost,
    sendJson,
    sendSpinEmail
} = require("../lib/server");

module.exports = async (request, response) => {
    if (!requirePost(request, response)) return;

    try {
        const client = getSupabase();
        const sessionId = getSessionId(request, response);
        const body = readBody(request);
        const spinId = typeof body.spinId === "string" ? body.spinId : "";
        const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
        const email = typeof body.email === "string" ? body.email.trim() : "";
        const wallet = typeof body.wallet === "string" ? body.wallet.trim() : "";

        if (!/^[0-9a-f-]{36}$/i.test(spinId)) {
            sendJson(response, 400, { error: "A valid spin ID is required." });
            return;
        }
        if (!name) {
            sendJson(response, 400, { error: "Enter your name or Telegram username." });
            return;
        }
        if (!isEmail(email)) {
            sendJson(response, 400, { error: "Enter a valid email address." });
            return;
        }
        if (!isSolanaAddress(wallet)) {
            sendJson(response, 400, { error: "Enter a valid Solana address." });
            return;
        }

        const { data: requestedSpin, error: selectError } = await client
            .from("spins")
            .select("spin_id, session_id, spin_day, status, wallet, player_name, player_email, prize_name, prize_value, spun_at, email_status")
            .eq("spin_id", spinId)
            .eq("session_id", sessionId)
            .maybeSingle();

        if (selectError) throw selectError;
        if (!requestedSpin) {
            sendJson(response, 404, {
                error: "That spin was not found for this browser session."
            });
            return;
        }

        let spin = requestedSpin;
        if (requestedSpin.status === "pending") {
            const { data: claimedSpin, error: updateError } = await client
                .from("spins")
                .update({
                    wallet,
                    player_name: name,
                    player_email: email,
                    status: "claimed"
                })
                .eq("spin_id", spinId)
                .eq("session_id", sessionId)
                .eq("status", "pending")
                .select("spin_id, session_id, spin_day, status, wallet, player_name, player_email, prize_name, prize_value, spun_at, email_status")
                .maybeSingle();

            if (updateError) {
                if (updateError.code === "23505") {
                    sendJson(response, 409, {
                        error: "This wallet already has a successful spin recorded for this UTC day. This spin cannot be claimed to that wallet."
                    });
                    return;
                }
                throw updateError;
            }

            if (!claimedSpin) {
                sendJson(response, 409, {
                    error: "This spin is no longer pending. Reload and check your player details."
                });
                return;
            }

            spin = claimedSpin;
        } else if (
            requestedSpin.wallet !== wallet ||
            requestedSpin.player_name !== name ||
            requestedSpin.player_email !== email
        ) {
            sendJson(response, 409, {
                error: "These spin details have already been submitted and cannot be changed."
            });
            return;
        }

        let emailResult = { sent: spin.email_status === "sent" };
        if (!emailResult.sent) {
            emailResult = await sendSpinEmail(client, spin, wallet, name, email);
        }

        const balance = await getBalance(client, { wallet, sessionId });
        sendJson(response, 200, {
            saved: true,
            spinId,
            balance,
            emailSent: emailResult.sent,
            emailError: emailResult.error || null
        });
    } catch (error) {
        if (error.code === "INVALID_JSON") {
            sendJson(response, 400, { error: error.message });
            return;
        }
        console.error("Submit details API failed:", error);
        sendJson(response, 500, { error: "Details could not be saved. Please try again." });
    }
};

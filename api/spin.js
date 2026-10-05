const { randomUUID } = require("node:crypto");
const {
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
} = require("../lib/server");

const COOLDOWN_MS = 30_000;

module.exports = async (request, response) => {
    if (!requirePost(request, response)) return;

    try {
        const client = getSupabase();
        const sessionId = getSessionId(request, response);
        const body = readBody(request);
        const requestId = typeof body.requestId === "string" ? body.requestId : "";
        const wallet = typeof body.wallet === "string" ? body.wallet.trim() : "";
        const playerName = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
        const playerEmail = typeof body.email === "string" ? body.email.trim() : "";
        const hasCompleteDetails =
            isSolanaAddress(wallet) && playerName.length > 0 && isEmail(playerEmail);
        const attachedWallet = hasCompleteDetails ? wallet : null;

        if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
            sendJson(response, 400, { error: "A valid request ID is required." });
            return;
        }

        const { data: previousRequest, error: previousError } = await client
            .from("spins")
            .select("spin_id, prize_slot, prize_name, prize_type, prize_value, spun_at, wallet, email_status")
            .eq("session_id", sessionId)
            .eq("request_id", requestId)
            .maybeSingle();

        if (previousError) throw previousError;

        if (previousRequest) {
            const balance = await getBalance(client, {
                wallet: previousRequest.wallet,
                sessionId
            });
            sendJson(response, 200, {
                spinId: previousRequest.spin_id,
                slot: previousRequest.prize_slot,
                prize: previousRequest.prize_name,
                prizeType: previousRequest.prize_type,
                prizeValue: previousRequest.prize_value,
                spunAt: previousRequest.spun_at,
                nextSpinAt: new Date(
                    new Date(previousRequest.spun_at).getTime() + COOLDOWN_MS
                ).toISOString(),
                balance,
                emailSent: previousRequest.email_status === "sent",
                emailError: null,
                needsDetails: !previousRequest.wallet
            });
            return;
        }

        const now = new Date();
        const spinDay = now.toISOString().slice(0, 10);

        if (attachedWallet) {
            const { data: existingDailySpin, error: dailySpinError } = await client
                .from("spins")
                .select("spin_id")
                .eq("wallet", attachedWallet)
                .eq("spin_day", spinDay)
                .eq("status", "claimed")
                .maybeSingle();

            if (dailySpinError) throw dailySpinError;
            if (existingDailySpin) {
                sendJson(response, 409, {
                    error: "This wallet already has a successful spin recorded for this UTC day."
                });
                return;
            }
        }

        const reserved = await reserveSessionSpin(client, sessionId, now);
        if (!reserved) {
            const lastSpinAt = await getSessionLastSpin(client, sessionId);
            const retryAfter = Math.max(
                1,
                Math.ceil(
                    (new Date(lastSpinAt).getTime() + COOLDOWN_MS - Date.now()) / 1000
                )
            );
            sendJson(response, 429, {
                error: "Please wait before spinning again.",
                retryAfter
            });
            return;
        }

        const prizeSlot = choosePrize();
        const prize = PRIZES[prizeSlot];
        const spinId = randomUUID();

        const { data: inserted, error: insertError } = await client
            .from("spins")
            .insert({
                spin_id: spinId,
                request_id: requestId,
                session_id: sessionId,
                wallet: attachedWallet,
                spin_day: spinDay,
                prize_name: prize.name,
                prize_type: prize.type,
                prize_value: prize.value,
                prize_slot: prizeSlot,
                spun_at: now.toISOString(),
                player_name: hasCompleteDetails ? playerName : null,
                player_email: hasCompleteDetails ? playerEmail : null,
                status: hasCompleteDetails ? "claimed" : "pending"
            })
            .select("spin_id, spun_at")
            .single();

        if (insertError) {
            if (insertError.code === "23505" && attachedWallet) {
                sendJson(response, 409, {
                    error: "This wallet already has a successful spin recorded for this UTC day."
                });
                return;
            }
            throw insertError;
        }

        let emailResult = { sent: false };
        if (attachedWallet) {
            emailResult = await sendSpinEmail(
                client,
                { ...inserted, prize_name: prize.name },
                attachedWallet,
                playerName,
                playerEmail
            );
        }

        const balance = await getBalance(client, {
            wallet: attachedWallet,
            sessionId
        });

        sendJson(response, 200, {
            spinId,
            slot: prizeSlot,
            prize: prize.name,
            prizeType: prize.type,
            prizeValue: prize.value,
            spunAt: inserted.spun_at,
            nextSpinAt: new Date(now.getTime() + COOLDOWN_MS).toISOString(),
            balance,
            emailSent: emailResult.sent,
            emailError: emailResult.error || null,
            needsDetails: !attachedWallet
        });
    } catch (error) {
        if (error.code === "INVALID_JSON") {
            sendJson(response, 400, { error: error.message });
            return;
        }
        console.error("Spin API failed:", error);
        sendJson(response, 500, { error: "The spin could not be completed. Please try again." });
    }
};

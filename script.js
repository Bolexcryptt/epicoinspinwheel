const taskScreen = document.getElementById("taskScreen");
const gameScreen = document.getElementById("gameScreen");

const walletInput =
    document.getElementById("walletInput");

const telegramUsernameInput =
    document.getElementById("telegramUsernameInput");

const saveWalletBtn =
    document.getElementById("saveWalletBtn");

const walletError =
    document.getElementById("walletError");

const continueTaskBtn =
    document.getElementById("continueTaskBtn");

const taskMessage =
    document.getElementById("taskMessage");

const spinBtn =
    document.getElementById("spinBtn");

const balanceAmount =
    document.getElementById("balanceAmount");

const wheel =
    document.getElementById("wheel");

const wheelLabels =
    document.getElementById("wheelLabels");

const gameMessage =
    document.getElementById("gameMessage");

const resultModal =
    document.getElementById("resultModal");

const prizeText =
    document.getElementById("prizeText");

const closeResultBtn =
    document.getElementById("closeResultBtn");

const addWalletAfterSpinBtn =
    document.getElementById("addWalletAfterSpinBtn");

const resultWalletNote =
    document.getElementById("resultWalletNote");

const walletViewBtn =
    document.getElementById("walletViewBtn");

const walletModal =
    document.getElementById("walletModal");

const walletTitle =
    document.getElementById("walletTitle");

const walletEntry =
    document.getElementById("walletEntry");

const walletAddressEntry =
    document.getElementById("walletAddressEntry");

const savedWalletSection =
    document.getElementById("savedWalletSection");

const savedWalletText =
    document.getElementById("savedWalletText");

const savedTelegramText =
    document.getElementById("savedTelegramText");

const closeWalletBtn =
    document.getElementById("closeWalletBtn");

const closeWalletBtn2 =
    document.getElementById("closeWalletBtn2");


/* =========================
   LINKS
========================= */

const DEX_LINK =
    "https://dexscreener.com/solana/GUtUrPGwfJDj3WTb2dEe2B9UnLtG1GGdBMreFtDXJxEw";

const TELEGRAM_LINK =
    "https://t.me/epicoins";

const X_LINK =
    "https://x.com/epicoinai";


/* =========================
   STATE
========================= */

let wallet = "";

let rotation = 0;

let spinning = false;

const SPIN_COOLDOWN_MS = 30_000;


/* =========================
   16 PRIZES
========================= */

const prizes = [

    { name: "1K $POT", type: "normal" },
    { name: "2K $POT", type: "normal" },
    { name: "MINI JACKPOT", type: "mini" },

    { name: "3K $POT", type: "normal" },
    { name: "5K $POT", type: "normal" },
    { name: "8K $POT", type: "normal" },
    { name: "10K $POT", type: "normal" },
    { name: "MAJOR JACKPOT", type: "major" },

    { name: "1K $POT", type: "normal" },
    { name: "2K $POT", type: "normal" },
    { name: "3K $POT", type: "normal" },
    { name: "5K $POT", type: "normal" },

    { name: "GRAND JACKPOT", type: "grand" },
    { name: "8K $POT", type: "normal" },
    { name: "10K $POT", type: "normal" },
    { name: "1K $POT", type: "normal" }

];


/*
    All 16 slots are equal in size.
    Prize selection is weighted separately.
*/


/* =========================
   COLORS
========================= */

const colors = [
    "#c83c36",
    "#3e86b9",
    "#4d9638",
    "#c87520"
];

const segmentAngle = 360 / prizes.length;


/* =========================
   CREATE WHEEL
========================= */

function createWheel() {

    wheelLabels.innerHTML = "";

    let currentAngle = 0;


    prizes.forEach((prize, index) => {

        let color;


        if (prize.type === "mini") {

            color = "#9b43aa";

        } else if (prize.type === "major") {

            color = "#e0a62f";

        } else if (prize.type === "grand") {

            color = "#e5ca3e";

        } else {

            color =
                colors[index % colors.length];

        }


        /*
            Colored wedge.
        */

        const wedge =
            document.createElement("div");

        wedge.style.position = "absolute";

        wedge.style.inset = "0";

        wedge.style.borderRadius = "50%";

        wedge.style.background =
            `conic-gradient(
                transparent 0deg ${currentAngle}deg,
                ${color} ${currentAngle}deg ${currentAngle + segmentAngle}deg,
                transparent ${currentAngle + segmentAngle}deg 360deg
            )`;


        wheelLabels.appendChild(wedge);


        /*
            TEXT POSITION

            Text is deliberately NOT rotated.

            It stays straight so people can
            read it immediately.
        */

        const label =
            document.createElement("div");


        const middle =
            currentAngle +
            segmentAngle / 2;

        const labelRadius =
            prize.type === "major"
                ? 45
                : 39;


        const x =
            50 +
            Math.sin(
                middle *
                Math.PI / 180
            ) *
            labelRadius;


        const y =
            50 -
            Math.cos(
                middle *
                Math.PI / 180
            ) *
            labelRadius;


        label.style.left =
            `${x}%`;

        label.style.top =
            `${y}%`;


        label.className =
            prize.type === "normal"
                ? "prize-label"
                : "prize-label jackpot-prize-label";


        label.textContent =
            prize.type === "normal"
                ? prize.name
                : prize.name.replace(" JACKPOT", "\nJACKPOT");


        wheelLabels.appendChild(label);


        currentAngle += segmentAngle;

    });


    createDots();

}


/* =========================
   OUTER DOTS
========================= */

function createDots() {

    const wrapper =
        document.querySelector(
            ".wheel-wrapper"
        );


    wrapper
        .querySelectorAll(".wheel-dot")
        .forEach(dot => dot.remove());


    const count = 32;


    for (let i = 0; i < count; i++) {

        const dot =
            document.createElement("div");

        dot.className =
            "wheel-dot";


        const angle =
            i *
            (360 / count);


        const radius = 49;


        const x =
            50 +
            Math.sin(
                angle *
                Math.PI / 180
            ) *
            radius;


        const y =
            50 -
            Math.cos(
                angle *
                Math.PI / 180
            ) *
            radius;


        dot.style.left =
            `${x}%`;

        dot.style.top =
            `${y}%`;


        wrapper.appendChild(dot);

    }

}


/* =========================
   SCREEN
========================= */

function showScreen(screen) {

    taskScreen.classList.add("hidden");

    gameScreen.classList.add("hidden");

    screen.classList.remove("hidden");

}


/* =========================
   WALLET VALIDATION
========================= */

function isSolanaAddress(address) {

    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
        .test(address);

}

function normalizeTelegramUsername(username) {

    return username.trim().replace(/^@/, "");

}


function isTelegramUsername(username) {

    return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username);

}


/* =========================
   FIRST VISIT CHECK
========================= */

function checkFirstVisit() {

    const savedWallet =
        localStorage.getItem(
            "epicoin_wallet"
        );


    const tasksDone =
        localStorage.getItem(
            "epicoin_tasks_done"
        );

    wallet = savedWallet || "";

    walletViewBtn.hidden =
        !wallet &&
        !localStorage.getItem("epicoin_last_spin") &&
        !localStorage.getItem("epicoin_next_spin_at");

    walletViewBtn.textContent =
        wallet ? "MY WALLET" : "ADD WALLET";

    if (tasksDone === "true") {

        showScreen(gameScreen);

        updateBalance();
        checkSpinCooldown();

        return;

    }

    showScreen(taskScreen);

}


/* =========================
   TASKS
========================= */

const tasks = {
    dex: false,
    telegram: false,
    x: false,
    "x-likes": false
};


document
    .querySelectorAll(".taskBtn")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const task =
                    button.dataset.task;


                if (task === "dex") {

                    window.open(
                        DEX_LINK,
                        "_blank"
                    );

                }


                if (task === "telegram") {

                    window.open(
                        TELEGRAM_LINK,
                        "_blank"
                    );

                }


                if (task === "x") {

                    window.open(
                        X_LINK,
                        "_blank"
                    );

                }

                if (task === "x-likes") {

                    if (!button.dataset.opened) {

                        window.open(
                            X_LINK,
                            "_blank"
                        );

                        button.dataset.opened = "true";
                        button.textContent = "CONFIRM";
                        return;

                    }

                }


                /*
                    Temporary testing.

                    Real verification will be
                    added to backend later.
                */

                tasks[task] = true;


                button.textContent =
                    "DONE ✓";


                button.classList.add(
                    "completed"
                );


                checkTasks();

            }
        );

    });


/* =========================
   TASK CHECK
========================= */

function checkTasks() {

    const complete =
        Object.values(tasks).every(Boolean);


    continueTaskBtn.disabled =
        !complete;


    if (complete) {

        taskMessage.textContent =
            "All tasks completed.";

    }

}


/* =========================
   CONTINUE
========================= */

continueTaskBtn.addEventListener(
    "click",
    () => {

        localStorage.setItem(
            "epicoin_tasks_done",
            "true"
        );


        showScreen(gameScreen);

        checkSpinCooldown();

    }
);


/* =========================
   WALLET VIEW
========================= */

function openWalletModal() {

    const savedWallet =
        localStorage.getItem(
            "epicoin_wallet"
        );

    const savedTelegram =
        localStorage.getItem(
            "epicoin_telegram_username"
        );

    walletEntry.classList.toggle(
        "hidden",
        Boolean(savedWallet && savedTelegram)
    );

    savedWalletSection.classList.toggle(
        "hidden",
        !savedWallet
    );

    walletAddressEntry.classList.toggle(
        "hidden",
        Boolean(savedWallet)
    );

    walletTitle.textContent =
        savedWallet
            ? savedTelegram ? "YOUR ACCOUNT" : "ADD TELEGRAM USERNAME"
            : "CREATE YOUR ACCOUNT";

    saveWalletBtn.textContent =
        savedWallet ? "SAVE TELEGRAM" : "SAVE ACCOUNT";

    walletEntry.querySelector(".wallet-note").textContent =
        savedWallet
            ? "Add a Telegram username to finish linking your existing wallet."
            : "Add your Telegram username and Solana wallet to link them to your rewards. These details cannot be changed later.";

    walletError.textContent = "";

    if (savedWallet) {

        savedWalletText.textContent =
            savedWallet;

        savedTelegramText.textContent =
            savedTelegram ? `@${savedTelegram}` : "Not added";

    } else {

        walletInput.value = "";

    }

    telegramUsernameInput.value =
        savedTelegram ? `@${savedTelegram}` : "";

    walletModal.classList.remove("hidden");

}


walletViewBtn.addEventListener(
    "click",
    openWalletModal
);


addWalletAfterSpinBtn.addEventListener(
    "click",
    openWalletModal
);


saveWalletBtn.addEventListener(
    "click",
    () => {

        walletError.textContent = "";

        const existingWallet =
            localStorage.getItem("epicoin_wallet");

        const value =
            existingWallet || walletInput.value.trim();

        const telegramUsername =
            normalizeTelegramUsername(telegramUsernameInput.value);

        if (!isTelegramUsername(telegramUsername)) {

            walletError.textContent =
                "Enter a valid Telegram username (5-32 letters, numbers, or underscores).";

            return;

        }

        if (!existingWallet && !isSolanaAddress(value)) {

            walletError.textContent =
                "Please enter a valid Solana wallet address.";

            return;

        }

        wallet = value;

        localStorage.setItem(
            "epicoin_wallet",
            wallet
        );

        localStorage.setItem(
            "epicoin_telegram_username",
            telegramUsername
        );

        localStorage.setItem(
            "epicoin_last_wallet",
            wallet
        );

        savedWalletText.textContent = wallet;
        savedTelegramText.textContent =
            `@${telegramUsername}`;
        walletTitle.textContent = "YOUR ACCOUNT";
        walletEntry.classList.add("hidden");
        savedWalletSection.classList.remove("hidden");
        walletAddressEntry.classList.add("hidden");
        walletViewBtn.textContent = "MY WALLET";

    }
);


function closeWallet() {

    walletModal.classList.add(
        "hidden"
    );

}


closeWalletBtn.addEventListener(
    "click",
    closeWallet
);


closeWalletBtn2.addEventListener(
    "click",
    closeWallet
);


/* =========================
   BALANCE AND SPIN COOLDOWN
========================= */

function getPrizeValue(prize) {

    const jackpotValues = {
        mini: 20_000,
        major: 50_000,
        grand: 100_000
    };

    if (prize.type !== "normal") {
        return jackpotValues[prize.type];
    }

    const match = prize.name.match(/^(\d+)K \$POT$/);

    if (!match) {
        throw new Error(`Unknown prize value: ${prize.name}`);
    }

    return Number(match[1]) * 1_000;

}


function updateBalance(prizeValue = 0) {

    const storedBalance =
        Number(localStorage.getItem("epicoin_balance_pot") || 0);

    const balance =
        storedBalance + prizeValue;

    localStorage.setItem(
        "epicoin_balance_pot",
        String(balance)
    );

    balanceAmount.textContent =
        `${balance.toLocaleString()} $POT`;

}


function checkSpinCooldown() {

    const nextSpinAt =
        Number(localStorage.getItem("epicoin_next_spin_at") || 0);

    const secondsRemaining =
        Math.max(0, Math.ceil((nextSpinAt - Date.now()) / 1000));

    if (spinning) {

        spinBtn.disabled = true;
        spinBtn.textContent = "SPINNING...";
        document.getElementById("spinStatus").textContent = "SPINNING";
        return;

    }

    if (secondsRemaining > 0) {

        spinBtn.disabled = true;
        spinBtn.textContent = `SPIN AGAIN IN ${secondsRemaining}s`;
        document.getElementById("spinStatus").textContent =
            `WAIT ${secondsRemaining}s`;
        return;

    }

    spinBtn.disabled = false;
    spinBtn.textContent = "SPIN THE WHEEL";
    document.getElementById("spinStatus").textContent = "AVAILABLE";

}


setInterval(checkSpinCooldown, 1000);


/* =========================
   TEST PRIZE
========================= */

function choosePrize() {

    /*
        TEST ONLY.

        Jackpots are extremely rare.

        Production will move this
        calculation to the backend.
    */

    const roll =
        Math.random();


    if (roll < 0.0001) {

        return prizes.findIndex(
            prize => prize.type === "grand"
        );
        // GRAND

    }


    if (roll < 0.001) {

        return prizes.findIndex(
            prize => prize.type === "major"
        );
        // MAJOR

    }


    if (roll < 0.003) {

        return prizes.findIndex(
            prize => prize.type === "mini"
        );
        // MINI

    }


    const normalSlots = prizes
        .map((prize, index) => prize.type === "normal" ? index : -1)
        .filter(index => index !== -1);


    return normalSlots[
        Math.floor(
            Math.random() *
            normalSlots.length
        )
    ];

}


/* =========================
   SPIN
========================= */

spinBtn.addEventListener(
    "click",
    () => {

        if (spinning) return;


        const nextSpinAt =
            Number(localStorage.getItem("epicoin_next_spin_at") || 0);

        if (nextSpinAt > Date.now()) {

            checkSpinCooldown();
            return;

        }


        spinning = true;

        spinBtn.disabled = true;

        gameMessage.textContent =
            "SPINNING...";


        const slot =
            choosePrize();


        const prize =
            prizes[slot];

        const prizeValue =
            getPrizeValue(prize);


        const target =
            360 -
            (
                slot * segmentAngle +
                segmentAngle / 2
            );


        rotation +=
            360 * 8 +
            target;


        wheel.style.transform =
            `rotate(${rotation}deg)`;


        setTimeout(() => {

            localStorage.setItem(
                "epicoin_next_spin_at",
                String(Date.now() + SPIN_COOLDOWN_MS)
            );

            updateBalance(prizeValue);

            if (wallet) {

                localStorage.setItem(
                    "epicoin_last_wallet",
                    wallet
                );

            }


            localStorage.setItem(
                "epicoin_last_prize",
                prize.name
            );


            localStorage.setItem(
                "epicoin_last_slot",
                slot
            );


            prizeText.textContent =
                prize.name;

            resultWalletNote.textContent =
                wallet
                    ? "Your saved wallet is linked to this reward."
                    : "You can add a wallet later to link it to your reward.";

            addWalletAfterSpinBtn.hidden =
                Boolean(wallet);

            walletViewBtn.hidden = false;

            walletViewBtn.textContent =
                wallet ? "MY WALLET" : "ADD WALLET";


            resultModal.classList.remove(
                "hidden"
            );


            gameMessage.textContent = "";

            spinning = false;
            checkSpinCooldown();

        }, 4900);

    }
);


/* =========================
   RESULT
========================= */

closeResultBtn.addEventListener(
    "click",
    () => {

        resultModal.classList.add(
            "hidden"
        );

    }
);


/* =========================
   START
========================= */

createWheel();

updateBalance();

checkFirstVisit();

checkSpinCooldown();
const walletScreen = document.getElementById("walletScreen");
const taskScreen = document.getElementById("taskScreen");
const gameScreen = document.getElementById("gameScreen");

const walletInput =
    document.getElementById("walletInput");

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

const walletViewBtn =
    document.getElementById("walletViewBtn");

const walletModal =
    document.getElementById("walletModal");

const savedWalletText =
    document.getElementById("savedWalletText");

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

    walletScreen.classList.add("hidden");

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


    /*
        Wallet already exists.

        User does NOT need to enter it again.
    */

    if (savedWallet) {

        wallet = savedWallet;

        showScreen(gameScreen);

        checkDailySpin();

        return;

    }


    /*
        First-time user.
    */

    showScreen(walletScreen);

}


/* =========================
   SAVE WALLET
========================= */

saveWalletBtn.addEventListener(
    "click",
    () => {

        walletError.textContent = "";

        const value =
            walletInput.value.trim();


        if (!isSolanaAddress(value)) {

            walletError.textContent =
                "Please enter a valid Solana wallet address.";

            return;

        }


        wallet = value;


        /*
            Save permanently for this browser.

            Later this will be saved in
            the real database.
        */

        localStorage.setItem(
            "epicoin_wallet",
            wallet
        );


        saveWalletBtn.disabled = true;

        saveWalletBtn.textContent =
            "SAVED ✓";


        setTimeout(() => {

            showScreen(taskScreen);

            saveWalletBtn.disabled = false;

            saveWalletBtn.textContent =
                "CONTINUE";

        }, 400);

    }
);


/* =========================
   TASKS
========================= */

const tasks = {
    dex: false,
    telegram: false,
    x: false
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
        tasks.dex &&
        tasks.telegram &&
        tasks.x;


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

        checkDailySpin();

    }
);


/* =========================
   WALLET VIEW
========================= */

walletViewBtn.addEventListener(
    "click",
    () => {

        const savedWallet =
            localStorage.getItem(
                "epicoin_wallet"
            );


        if (!savedWallet) return;


        savedWalletText.textContent =
            savedWallet;


        walletModal.classList.remove(
            "hidden"
        );

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
   DAILY SPIN
========================= */

function checkDailySpin() {

    const today =
        new Date()
            .toISOString()
            .split("T")[0];


    const lastSpin =
        localStorage.getItem(
            "epicoin_last_spin"
        );


    if (lastSpin === today) {

        spinBtn.disabled = true;

        spinBtn.textContent =
            "COME BACK TOMORROW";


        document.getElementById(
            "spinStatus"
        ).textContent =
            "ALREADY USED";

    }

}


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


        const today =
            new Date()
                .toISOString()
                .split("T")[0];


        const lastSpin =
            localStorage.getItem(
                "epicoin_last_spin"
            );


        if (lastSpin === today) {

            gameMessage.textContent =
                "You have already spun today.";

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
                "epicoin_last_spin",
                today
            );


            localStorage.setItem(
                "epicoin_last_wallet",
                wallet
            );


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


            resultModal.classList.remove(
                "hidden"
            );


            document.getElementById(
                "spinStatus"
            ).textContent =
                "ALREADY USED";


            spinBtn.textContent =
                "COME BACK TOMORROW";


            gameMessage.textContent = "";

            spinning = false;

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

checkFirstVisit();
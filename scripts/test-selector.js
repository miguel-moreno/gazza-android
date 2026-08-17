const { selectClubIndex, DEFAULT_CLUBS, formatRange } = require("../app/src/main/assets/js/app.js");

function clubAt(distance) {
    const index = selectClubIndex(distance, DEFAULT_CLUBS);
    const selected = DEFAULT_CLUBS[index];
    const prev = index > 0 ? DEFAULT_CLUBS[index - 1] : null;
    const next = index < DEFAULT_CLUBS.length - 1 ? DEFAULT_CLUBS[index + 1] : null;
    return {
        name: selected.name,
        range: formatRange(selected),
        prev: prev ? prev.name : null,
        next: next ? next.name : null
    };
}

const cases = [
    { d: 96, name: "PW", prev: "9 IRON", next: "52°" },
    { d: 91, name: "52°", prev: "PW", next: "56°" },
    { d: 117, name: "7 IRON", prev: "6 IRON", next: "8 IRON" },
    { d: 143, name: "5 IRON", prev: "4H 22°", next: "6 IRON" },
    { d: 40, name: "60°", prev: "56°", next: null },
    { d: 220, name: "DRIVER", prev: null, next: "3W" },
    { d: 197, name: "DRIVER", prev: null, next: "3W" },
    { d: 180, name: "3W", prev: "DRIVER", next: "3H 19°" },
    { d: 90, name: "52°", prev: "PW", next: "56°" }
];

let failed = 0;
for (const test of cases) {
    const got = clubAt(test.d);
    const ok = got.name === test.name && got.prev === test.prev && got.next === test.next;
    if (!ok) {
        failed += 1;
        console.error("FAIL", test.d, "expected", test, "got", got);
    } else {
        console.log("OK", test.d, got.name, got.range, "prev=", got.prev, "next=", got.next);
    }
}

if (failed) {
    process.exit(1);
}
console.log("All selector tests passed.");

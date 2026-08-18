const {
    selectClubIndex,
    adjacentClubs,
    DEFAULT_CLUBS,
    formatRange,
    rangeFromDistance,
    mergeSavedClubs,
    sanitizeClub,
    RANGE_PAD
} = require("../app/src/main/assets/js/app.js");

function clubAt(distance) {
    const index = selectClubIndex(distance, DEFAULT_CLUBS);
    const selected = DEFAULT_CLUBS[index];
    const neighbors = adjacentClubs(index, DEFAULT_CLUBS);
    return {
        name: selected.name,
        range: formatRange(selected),
        prev: neighbors.prev ? neighbors.prev.name : null,
        next: neighbors.next ? neighbors.next.name : null,
        prevDist: neighbors.prev ? neighbors.prev.distance : null,
        nextDist: neighbors.next ? neighbors.next.distance : null,
        selectedDist: selected.distance
    };
}

let failed = 0;

function assert(condition, message, extra) {
    if (!condition) {
        failed += 1;
        console.error("FAIL", message, extra || "");
    }
}

const rangeCases = [
    { d: 200, min: 195, max: 205 },
    { d: 105, min: 100, max: 110 },
    { d: 70, min: 65, max: 75 },
    { d: 1, min: 1, max: 6 },
    { d: 400, min: 395, max: 400 }
];

for (const test of rangeCases) {
    const got = rangeFromDistance(test.d);
    const ok = got.distance === test.d && got.min === test.min && got.max === test.max;
    assert(ok, "rangeFromDistance", { test, got });
    if (ok) {
        console.log("OK range", test.d, got.min + "–" + got.max);
    }
}

assert(RANGE_PAD === 5, "RANGE_PAD should be 5");

const migrated = mergeSavedClubs([
    { id: "driver", name: "DRIVER", min: 195, max: 200 },
    { id: "9i", distance: 108 }
]);
const driver = migrated.find((club) => club.id === "driver");
const nine = migrated.find((club) => club.id === "9i");
assert(driver.distance === 200 && driver.min === 195 && driver.max === 205, "migrate driver max", driver);
assert(nine.distance === 108 && nine.min === 103 && nine.max === 113, "keep saved distance", nine);
console.log("OK migrate v1 min/max → single distance ±5");

const sanitized = sanitizeClub({ distance: "105" }, DEFAULT_CLUBS.find((c) => c.id === "9i"));
assert(sanitized.min === 100 && sanitized.max === 110, "sanitize 105 → 100-110", sanitized);

const cases = [
    { d: 96, name: "52°", prev: "56°", next: "PW" },
    { d: 91, name: "52°", prev: "56°", next: "PW" },
    { d: 105, name: "9 IRON", prev: "PW", next: "8 IRON" },
    { d: 117, name: "7 IRON", prev: "8 IRON", next: "6 IRON" },
    { d: 143, name: "6 IRON", prev: "7 IRON", next: "5 IRON" },
    { d: 40, name: "60°", prev: null, next: "56°" },
    { d: 220, name: "DRIVER", prev: "3W", next: null },
    { d: 197, name: "DRIVER", prev: "3W", next: null },
    { d: 180, name: "3W", prev: "3H 19°", next: "DRIVER" },
    { d: 90, name: "52°", prev: "56°", next: "PW" }
];

for (const test of cases) {
    const got = clubAt(test.d);
    const ok = got.name === test.name && got.prev === test.prev && got.next === test.next;
    assert(ok, test.d, { expected: test, got });
    if (ok) {
        if (got.prevDist != null) {
            assert(got.prevDist < got.selectedDist, "prev must be shorter", got);
        }
        if (got.nextDist != null) {
            assert(got.nextDist > got.selectedDist, "next must be longer", got);
        }
        console.log("OK", test.d, got.name, got.range, "prev=", got.prev, "next=", got.next);
    }
}

const shuffled = DEFAULT_CLUBS.slice().reverse();
const shuffledIndex = selectClubIndex(105, shuffled);
const shuffledNeighbors = adjacentClubs(shuffledIndex, shuffled);
assert(shuffled[shuffledIndex].name === "9 IRON", "shuffled still selects 9 IRON");
assert(shuffledNeighbors.prev && shuffledNeighbors.prev.name === "PW", "shuffled prev is shorter PW", shuffledNeighbors);
assert(shuffledNeighbors.next && shuffledNeighbors.next.name === "8 IRON", "shuffled next is longer 8 IRON", shuffledNeighbors);
console.log("OK neighbors follow distance, not bag order");

if (failed) {
    process.exit(1);
}
console.log("All selector tests passed.");

const {
    selectClubIndex,
    adjacentClubs,
    DEFAULT_CLUBS,
    formatRange,
    rangeFromDistance,
    clubsFromAnchors,
    readAnchors,
    mergeSavedClubs,
    isEditableClub,
    RANGE_PAD
} = require("../app/src/main/assets/js/app.js");

function clubMap(clubs) {
    const byId = {};
    clubs.forEach((club) => {
        byId[club.id] = club;
    });
    return byId;
}

function clubAt(distance, clubs) {
    const bag = clubs || DEFAULT_CLUBS;
    const index = selectClubIndex(distance, bag);
    const selected = bag[index];
    const neighbors = adjacentClubs(index, bag);
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
assert(isEditableClub("driver") && isEditableClub("7i"), "only D and I7 are editable");
assert(!isEditableClub("pw") && !isEditableClub("9i"), "derived clubs are not editable");

const defaults = clubMap(DEFAULT_CLUBS);
const expectedDefaults = {
    driver: 200,
    "3w": 177,
    "3h": 160,
    "4h": 149,
    "5i": 134,
    "6i": 128,
    "7i": 122,
    "8i": 110,
    "9i": 102,
    pw: 93,
    "52": 81,
    "56": 67,
    "60": 56
};

Object.keys(expectedDefaults).forEach((id) => {
    const club = defaults[id];
    assert(club && club.distance === expectedDefaults[id], "default formula " + id, club);
    assert(club.min === club.distance - 5 && club.max === club.distance + 5, "±5 " + id, club);
});
console.log("OK default D=200 I7=122 formulas");

const custom = clubMap(clubsFromAnchors(210, 130));
assert(custom.driver.distance === 210, "custom driver", custom.driver);
assert(custom["3w"].distance === Math.round(210 * 0.886), "custom 3W", custom["3w"]);
assert(custom["3h"].distance === Math.round(210 * 0.8), "custom 3H", custom["3h"]);
assert(custom["4h"].distance === Math.round(210 * 0.743), "custom 4H", custom["4h"]);
assert(custom["5i"].distance === Math.round(130 * 1.095), "custom I5", custom["5i"]);
assert(custom["6i"].distance === Math.round(130 * 1.048), "custom I6", custom["6i"]);
assert(custom["7i"].distance === 130, "custom I7", custom["7i"]);
assert(custom["8i"].distance === Math.round(130 * 0.905), "custom I8", custom["8i"]);
assert(custom["9i"].distance === Math.round(130 * 0.838), "custom I9", custom["9i"]);
assert(custom.pw.distance === Math.round(130 * 0.762), "custom PW", custom.pw);
assert(custom["52"].distance === Math.round(130 * 0.762 * 0.875), "custom 52W", custom["52"]);
assert(custom["56"].distance === Math.round(130 * 0.762 * 0.725), "custom 56W", custom["56"]);
assert(custom["60"].distance === Math.round(130 * 0.762 * 0.6), "custom 60W", custom["60"]);
console.log("OK custom D=210 I7=130 formulas");

const migrated = readAnchors([
    { id: "driver", name: "DRIVER", min: 195, max: 200 },
    { id: "7i", distance: 125 }
]);
assert(migrated.driver === 200 && migrated.iron7 === 125, "migrate v1/v2 anchors", migrated);

const v3saved = readAnchors({ version: 3, driver: 190, iron7: 118 });
assert(v3saved.driver === 190 && v3saved.iron7 === 118, "read v3 anchors", v3saved);

const merged = mergeSavedClubs({ driver: 200, iron7: 122 });
assert(merged.find((c) => c.id === "pw").distance === 93, "merge computes PW", merged);
console.log("OK migrate and v3 storage");

const cases = [
    { d: 96, name: "PW", prev: "52°", next: "9 IRON" },
    { d: 91, name: "PW", prev: "52°", next: "9 IRON" },
    { d: 105, name: "9 IRON", prev: "PW", next: "8 IRON" },
    { d: 117, name: "7 IRON", prev: "8 IRON", next: "6 IRON" },
    { d: 40, name: "60°", prev: null, next: "56°" },
    { d: 220, name: "DRIVER", prev: "3W", next: null },
    { d: 197, name: "DRIVER", prev: "3W", next: null },
    { d: 180, name: "3W", prev: "3H 19°", next: "DRIVER" }
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

if (failed) {
    process.exit(1);
}
console.log("All selector tests passed.");

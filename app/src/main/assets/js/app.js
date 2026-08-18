(function () {
    "use strict";

    var MIN_DISTANCE = 40;
    var MAX_DISTANCE = 220;
    var RANGE_PAD = 5;
    var CLUB_VALUE_MIN = 1;
    var CLUB_VALUE_MAX = 400;
    var STORAGE_KEY = "gazza_clubs_v1";
    var DEFAULT_DRIVER = 200;
    var DEFAULT_IRON7 = 122;

    var CLUB_SPECS = [
        { id: "driver", name: "DRIVER", source: "driver" },
        { id: "3w", name: "3W", source: "driver", factor: 0.886 },
        { id: "3h", name: "3H 19°", source: "driver", factor: 0.8 },
        { id: "4h", name: "4H 22°", source: "driver", factor: 0.743 },
        { id: "5i", name: "5 IRON", source: "iron7", factor: 1.095 },
        { id: "6i", name: "6 IRON", source: "iron7", factor: 1.048 },
        { id: "7i", name: "7 IRON", source: "iron7" },
        { id: "8i", name: "8 IRON", source: "iron7", factor: 0.905 },
        { id: "9i", name: "9 IRON", source: "iron7", factor: 0.838 },
        { id: "pw", name: "PW", source: "iron7", factor: 0.762 },
        { id: "52", name: "52°", source: "pw", factor: 0.875 },
        { id: "56", name: "56°", source: "pw", factor: 0.725 },
        { id: "60", name: "60°", source: "pw", factor: 0.6 }
    ];

    function clampClubValue(value) {
        return Math.max(CLUB_VALUE_MIN, Math.min(CLUB_VALUE_MAX, value));
    }

    function rangeFromDistance(distance) {
        var value = clampClubValue(parseInt(distance, 10) || CLUB_VALUE_MIN);
        return {
            distance: value,
            min: clampClubValue(value - RANGE_PAD),
            max: clampClubValue(value + RANGE_PAD)
        };
    }

    function clubFromDistance(club) {
        var range = rangeFromDistance(club.distance);
        return {
            id: club.id,
            name: club.name,
            distance: range.distance,
            min: range.min,
            max: range.max
        };
    }

    function parseAnchorValue(value, fallback) {
        var n = parseInt(value, 10);
        if (isNaN(n)) {
            return fallback;
        }
        return clampClubValue(n);
    }

    function typicalForSpec(spec, driver, iron7) {
        var pw = iron7 * 0.762;
        if (spec.id === "driver") {
            return driver;
        }
        if (spec.id === "7i") {
            return iron7;
        }
        if (spec.source === "driver") {
            return Math.round(driver * spec.factor);
        }
        if (spec.source === "iron7") {
            return Math.round(iron7 * spec.factor);
        }
        return Math.round(pw * spec.factor);
    }

    function clubsFromAnchors(driver, iron7) {
        var d = parseAnchorValue(driver, DEFAULT_DRIVER);
        var i7 = parseAnchorValue(iron7, DEFAULT_IRON7);
        return CLUB_SPECS.map(function (spec) {
            return clubFromDistance({
                id: spec.id,
                name: spec.name,
                distance: typicalForSpec(spec, d, i7)
            });
        });
    }

    function isEditableClub(id) {
        return id === "driver" || id === "7i";
    }

    function formatRange(club) {
        if (!club) {
            return "—";
        }
        return club.min + "–" + club.max + " m";
    }

    function clubTypicalDistance(club) {
        if (club && club.distance != null && !isNaN(Number(club.distance))) {
            return Number(club.distance);
        }
        return (Number(club.min) + Number(club.max)) / 2;
    }

    function selectClubIndex(distance, clubs) {
        var bestIndex = 0;
        var bestDiff = Infinity;
        var bestInRange = false;
        var i;
        var club;
        var center;
        var diff;
        var inRange;

        for (i = 0; i < clubs.length; i += 1) {
            club = clubs[i];
            center = (Number(club.min) + Number(club.max)) / 2;
            diff = Math.abs(distance - center);
            inRange = distance >= Number(club.min) && distance <= Number(club.max);

            if (diff < bestDiff - 0.0001) {
                bestDiff = diff;
                bestIndex = i;
                bestInRange = inRange;
            } else if (Math.abs(diff - bestDiff) <= 0.0001 && inRange && !bestInRange) {
                bestIndex = i;
                bestInRange = true;
            }
        }

        return bestIndex;
    }

    function adjacentClubs(selectedIndex, clubs) {
        var selected = clubs[selectedIndex];
        var selectedDist = clubTypicalDistance(selected);
        var prev = null;
        var next = null;
        var prevDist = -Infinity;
        var nextDist = Infinity;
        var i;
        var club;
        var dist;

        for (i = 0; i < clubs.length; i += 1) {
            if (i === selectedIndex) {
                continue;
            }
            club = clubs[i];
            dist = clubTypicalDistance(club);
            if (dist < selectedDist && dist > prevDist) {
                prev = club;
                prevDist = dist;
            } else if (dist > selectedDist && dist < nextDist) {
                next = club;
                nextDist = dist;
            }
        }

        return { prev: prev, next: next };
    }

    function readTypicalDistance(club, fallbackDistance) {
        var distance = parseInt(club && club.distance, 10);
        if (!isNaN(distance)) {
            return distance;
        }
        var max = parseInt(club && club.max, 10);
        if (!isNaN(max)) {
            return max;
        }
        var min = parseInt(club && club.min, 10);
        if (!isNaN(min)) {
            return min;
        }
        return fallbackDistance;
    }

    function readAnchors(saved) {
        var driver = DEFAULT_DRIVER;
        var iron7 = DEFAULT_IRON7;
        var byId = {};

        if (saved && !Array.isArray(saved) && typeof saved === "object") {
            driver = parseAnchorValue(saved.driver, driver);
            iron7 = parseAnchorValue(saved.iron7, iron7);
            return { driver: driver, iron7: iron7 };
        }

        if (Array.isArray(saved)) {
            saved.forEach(function (club) {
                if (club && club.id) {
                    byId[club.id] = club;
                }
            });
            if (byId.driver) {
                driver = parseAnchorValue(
                    readTypicalDistance(byId.driver, driver),
                    driver
                );
            }
            if (byId["7i"]) {
                iron7 = parseAnchorValue(
                    readTypicalDistance(byId["7i"], iron7),
                    iron7
                );
            }
        }

        return { driver: driver, iron7: iron7 };
    }

    var DEFAULT_CLUBS = clubsFromAnchors(DEFAULT_DRIVER, DEFAULT_IRON7);

    function mergeSavedClubs(saved) {
        var anchors = readAnchors(saved);
        return clubsFromAnchors(anchors.driver, anchors.iron7);
    }

    function readNativeJson() {
        try {
            if (window.GazzaNative && typeof window.GazzaNative.loadClubs === "function") {
                return window.GazzaNative.loadClubs() || "";
            }
        } catch (e) {}
        return "";
    }

    function writeNativeJson(json) {
        try {
            if (window.GazzaNative && typeof window.GazzaNative.saveClubs === "function") {
                window.GazzaNative.saveClubs(json);
            }
        } catch (e) {}
    }

    function loadAnchorsFromStore() {
        var json = readNativeJson();
        if (!json) {
            try {
                json = window.localStorage.getItem(STORAGE_KEY) || "";
            } catch (e) {
                json = "";
            }
        }
        if (!json) {
            return { driver: DEFAULT_DRIVER, iron7: DEFAULT_IRON7 };
        }
        try {
            return readAnchors(JSON.parse(json));
        } catch (e) {
            return { driver: DEFAULT_DRIVER, iron7: DEFAULT_IRON7 };
        }
    }

    function saveAnchors(anchors) {
        var json = JSON.stringify({
            version: 3,
            driver: anchors.driver,
            iron7: anchors.iron7
        });
        try {
            window.localStorage.setItem(STORAGE_KEY, json);
        } catch (e) {}
        writeNativeJson(json);
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            DEFAULT_CLUBS: DEFAULT_CLUBS,
            DEFAULT_DRIVER: DEFAULT_DRIVER,
            DEFAULT_IRON7: DEFAULT_IRON7,
            RANGE_PAD: RANGE_PAD,
            CLUB_SPECS: CLUB_SPECS,
            selectClubIndex: selectClubIndex,
            adjacentClubs: adjacentClubs,
            formatRange: formatRange,
            rangeFromDistance: rangeFromDistance,
            clubsFromAnchors: clubsFromAnchors,
            readAnchors: readAnchors,
            mergeSavedClubs: mergeSavedClubs,
            isEditableClub: isEditableClub
        };
        return;
    }

    var anchors = loadAnchorsFromStore();
    var clubs = clubsFromAnchors(anchors.driver, anchors.iron7);
    var distance = 96;
    var drawerOpen = false;

    var els = {
        btnMenu: document.getElementById("btnMenu"),
        btnMore: document.getElementById("btnMore"),
        screenMain: document.getElementById("screenMain"),
        screenSettings: document.getElementById("screenSettings"),
        distanceInput: document.getElementById("distanceInput"),
        selectedName: document.getElementById("selectedName"),
        selectedRange: document.getElementById("selectedRange"),
        prevCard: document.getElementById("prevCard"),
        nextCard: document.getElementById("nextCard"),
        prevName: document.getElementById("prevName"),
        prevRange: document.getElementById("prevRange"),
        nextName: document.getElementById("nextName"),
        nextRange: document.getElementById("nextRange"),
        distanceSlider: document.getElementById("distanceSlider"),
        drawer: document.getElementById("drawer"),
        drawerBackdrop: document.getElementById("drawerBackdrop"),
        navClubSelection: document.getElementById("navClubSelection"),
        navSettings: document.getElementById("navSettings"),
        settingsList: document.getElementById("settingsList"),
        btnSettingsBack: document.getElementById("btnSettingsBack")
    };

    function clampDistance(value) {
        var n = parseInt(value, 10);
        if (isNaN(n)) {
            n = distance;
        }
        return Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, n));
    }

    function isAppInput(el) {
        return !!(el && el.tagName === "INPUT");
    }

    function isDistanceEditing() {
        return document.activeElement === els.distanceInput;
    }

    function hideDistanceKeyboard() {
        var active = document.activeElement;
        if (!isAppInput(active)) {
            return false;
        }
        active.blur();
        if (active === els.distanceInput) {
            commitDistanceInput();
        }
        return true;
    }

    function fillAdjCard(card, nameEl, rangeEl, club) {
        if (club) {
            card.classList.remove("is-empty");
            nameEl.textContent = club.name;
            rangeEl.textContent = formatRange(club);
        } else {
            card.classList.add("is-empty");
            nameEl.textContent = "—";
            rangeEl.textContent = "—";
        }
    }

    function renderMain() {
        var index = selectClubIndex(distance, clubs);
        var selected = clubs[index];
        var neighbors = adjacentClubs(index, clubs);

        if (!isDistanceEditing()) {
            els.distanceInput.value = String(distance);
        }
        els.distanceSlider.value = String(distance);
        els.selectedName.textContent = selected.name;
        els.selectedRange.textContent = formatRange(selected);

        fillAdjCard(els.prevCard, els.prevName, els.prevRange, neighbors.prev);
        fillAdjCard(els.nextCard, els.nextName, els.nextRange, neighbors.next);
    }

    function setDistance(value, fromSlider) {
        distance = clampDistance(value);
        if (!fromSlider) {
            els.distanceSlider.value = String(distance);
        }
        renderMain();
    }

    function commitDistanceInput() {
        var raw = String(els.distanceInput.value || "").replace(/\D/g, "");
        if (raw === "") {
            els.distanceInput.value = String(distance);
            return;
        }
        setDistance(raw, false);
        els.distanceInput.value = String(distance);
    }

    function closeDrawer() {
        drawerOpen = false;
        els.drawer.classList.remove("open");
        els.drawer.setAttribute("aria-hidden", "true");
        els.drawerBackdrop.classList.add("hidden");
    }

    function openDrawer() {
        hideDistanceKeyboard();
        drawerOpen = true;
        els.drawer.classList.add("open");
        els.drawer.setAttribute("aria-hidden", "false");
        els.drawerBackdrop.classList.remove("hidden");
    }

    function showMain() {
        els.screenSettings.classList.add("hidden");
        els.screenSettings.setAttribute("aria-hidden", "true");
        els.screenMain.classList.remove("hidden");
        closeDrawer();
        renderMain();
    }

    function applyAnchors(nextDriver, nextIron7) {
        anchors = {
            driver: parseAnchorValue(nextDriver, anchors.driver),
            iron7: parseAnchorValue(nextIron7, anchors.iron7)
        };
        clubs = clubsFromAnchors(anchors.driver, anchors.iron7);
        saveAnchors(anchors);
        renderMain();
        refreshSettingsValues();
    }

    function refreshSettingsValues() {
        if (!els.settingsList) {
            return;
        }
        clubs.forEach(function (club) {
            var card = els.settingsList.querySelector('[data-club-id="' + club.id + '"]');
            if (!card) {
                return;
            }
            var computed = card.querySelector(".settings-computed");
            var rangeEl = card.querySelector(".settings-range");
            var input = card.querySelector("input[data-anchor]");
            if (computed) {
                computed.textContent = club.distance + " m";
            }
            if (rangeEl) {
                rangeEl.textContent = "RANGE  " + formatRange(club);
            }
            if (input && document.activeElement !== input) {
                input.value = String(club.distance);
            }
        });
    }

    function renderSettings() {
        els.settingsList.innerHTML = "";
        clubs.forEach(function (club) {
            var editable = isEditableClub(club.id);
            var card = document.createElement("div");
            card.className = "settings-card" + (editable ? " is-editable" : " is-computed");
            card.setAttribute("data-club-id", club.id);
            if (editable) {
                card.innerHTML =
                    '<div class="settings-club"></div>' +
                    '<div class="settings-fields">' +
                    '<label>METRES<input type="number" inputmode="numeric" min="1" max="400" data-anchor=""></label>' +
                    "</div>" +
                    '<div class="settings-range"></div>';
            } else {
                card.innerHTML =
                    '<div class="settings-kicker">CALCULATED</div>' +
                    '<div class="settings-club"></div>' +
                    '<div class="settings-computed"></div>' +
                    '<div class="settings-range"></div>';
            }
            card.querySelector(".settings-club").textContent = club.name;
            card.querySelector(".settings-range").textContent = "RANGE  " + formatRange(club);

            if (editable) {
                var input = card.querySelector("input[data-anchor]");
                var anchorKey = club.id === "driver" ? "driver" : "iron7";
                input.setAttribute("data-anchor", anchorKey);
                input.value = String(club.distance);

                function commitAnchor() {
                    var raw = String(input.value || "").replace(/\D/g, "");
                    if (raw === "") {
                        input.value = String(anchors[anchorKey]);
                        return;
                    }
                    if (anchorKey === "driver") {
                        applyAnchors(raw, anchors.iron7);
                    } else {
                        applyAnchors(anchors.driver, raw);
                    }
                    input.value = String(anchors[anchorKey]);
                }

                input.addEventListener("input", function () {
                    var raw = String(input.value || "").replace(/\D/g, "");
                    if (raw !== input.value) {
                        input.value = raw;
                    }
                    var live = parseInt(raw, 10);
                    if (!isNaN(live) && live >= 40 && live <= 400) {
                        if (anchorKey === "driver") {
                            applyAnchors(live, anchors.iron7);
                        } else {
                            applyAnchors(anchors.driver, live);
                        }
                    }
                });
                input.addEventListener("change", commitAnchor);
                input.addEventListener("blur", commitAnchor);
            } else {
                card.querySelector(".settings-computed").textContent = club.distance + " m";
            }

            els.settingsList.appendChild(card);
        });
    }

    function showSettings() {
        hideDistanceKeyboard();
        els.screenMain.classList.add("hidden");
        els.screenSettings.classList.remove("hidden");
        els.screenSettings.setAttribute("aria-hidden", "false");
        closeDrawer();
        renderSettings();
    }

    window.gazzaOnBack = function () {
        if (hideDistanceKeyboard()) {
            return true;
        }
        if (drawerOpen) {
            closeDrawer();
            return true;
        }
        if (!els.screenSettings.classList.contains("hidden")) {
            showMain();
            return true;
        }
        return false;
    };

    window.gazzaHideKeyboard = function () {
        hideDistanceKeyboard();
        return true;
    };

    els.btnMenu.addEventListener("click", function () {
        if (drawerOpen) {
            closeDrawer();
        } else {
            openDrawer();
        }
    });
    els.btnMore.addEventListener("click", function () {
        if (drawerOpen) {
            closeDrawer();
        } else {
            openDrawer();
        }
    });
    els.drawerBackdrop.addEventListener("click", closeDrawer);
    els.navClubSelection.addEventListener("click", showMain);
    els.navSettings.addEventListener("click", showSettings);
    els.btnSettingsBack.addEventListener("click", showMain);

    els.distanceInput.addEventListener("input", function () {
        var raw = String(els.distanceInput.value || "").replace(/\D/g, "");
        if (raw !== els.distanceInput.value) {
            els.distanceInput.value = raw;
        }
        var live = parseInt(raw, 10);
        if (!isNaN(live) && live >= MIN_DISTANCE && live <= MAX_DISTANCE) {
            distance = live;
            els.distanceSlider.value = String(live);
            renderMain();
        }
    });

    els.distanceInput.addEventListener("blur", commitDistanceInput);

    els.distanceInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            event.preventDefault();
            hideDistanceKeyboard();
        }
    });

    els.screenMain.addEventListener("pointerdown", function (event) {
        if (event.target !== els.distanceInput) {
            hideDistanceKeyboard();
        }
    });

    els.distanceSlider.addEventListener("input", function (event) {
        setDistance(event.target.value, true);
    });

    saveAnchors(anchors);
    renderMain();
}());

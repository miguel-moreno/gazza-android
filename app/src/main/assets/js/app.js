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

    function isAnchorClub(id) {
        return id === "driver" || id === "7i";
    }

    function canUseAuto(id) {
        return !isAnchorClub(id);
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

    function cloneManual(manual) {
        var out = {};
        if (!manual || typeof manual !== "object") {
            return out;
        }
        CLUB_SPECS.forEach(function (spec) {
            if (!canUseAuto(spec.id) || manual[spec.id] == null || manual[spec.id] === "") {
                return;
            }
            var n = parseInt(manual[spec.id], 10);
            if (!isNaN(n)) {
                out[spec.id] = clampClubValue(n);
            }
        });
        return out;
    }

    function clubsFromAnchors(driver, iron7, manual) {
        var d = parseAnchorValue(driver, DEFAULT_DRIVER);
        var i7 = parseAnchorValue(iron7, DEFAULT_IRON7);
        var overrides = cloneManual(manual);
        return CLUB_SPECS.map(function (spec) {
            var typical = Object.prototype.hasOwnProperty.call(overrides, spec.id)
                ? overrides[spec.id]
                : typicalForSpec(spec, d, i7);
            return clubFromDistance({
                id: spec.id,
                name: spec.name,
                distance: typical
            });
        });
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

    function readSettings(saved) {
        var anchors = readAnchors(saved);
        var manual = {};
        if (saved && !Array.isArray(saved) && typeof saved === "object") {
            manual = cloneManual(saved.manual);
        }
        return {
            driver: anchors.driver,
            iron7: anchors.iron7,
            manual: manual
        };
    }

    var DEFAULT_CLUBS = clubsFromAnchors(DEFAULT_DRIVER, DEFAULT_IRON7, {});

    function mergeSavedClubs(saved) {
        var settings = readSettings(saved);
        return clubsFromAnchors(settings.driver, settings.iron7, settings.manual);
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

    function loadSettingsFromStore() {
        var json = readNativeJson();
        if (!json) {
            try {
                json = window.localStorage.getItem(STORAGE_KEY) || "";
            } catch (e) {
                json = "";
            }
        }
        if (!json) {
            return {
                driver: DEFAULT_DRIVER,
                iron7: DEFAULT_IRON7,
                manual: {}
            };
        }
        try {
            return readSettings(JSON.parse(json));
        } catch (e) {
            return {
                driver: DEFAULT_DRIVER,
                iron7: DEFAULT_IRON7,
                manual: {}
            };
        }
    }

    function persistSettings(settings) {
        var json = JSON.stringify({
            version: 5,
            driver: settings.driver,
            iron7: settings.iron7,
            manual: cloneManual(settings.manual)
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
            readSettings: readSettings,
            mergeSavedClubs: mergeSavedClubs,
            isAnchorClub: isAnchorClub,
            canUseAuto: canUseAuto,
            cloneManual: cloneManual
        };
        return;
    }

    var settings = loadSettingsFromStore();
    var clubs = clubsFromAnchors(settings.driver, settings.iron7, settings.manual);
    var settingsDraft = null;
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
        btnSettingsBack: document.getElementById("btnSettingsBack"),
        btnSettingsSave: document.getElementById("btnSettingsSave")
    };

    function clampDistance(value) {
        var n = parseInt(value, 10);
        if (isNaN(n)) {
            n = distance;
        }
        return Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, n));
    }

    function isTypedInput(el) {
        return !!(
            el &&
            el.tagName === "INPUT" &&
            (el.type === "number" || el.type === "text" || el.type === "")
        );
    }

    function isDistanceEditing() {
        return document.activeElement === els.distanceInput;
    }

    function hideDistanceKeyboard() {
        var active = document.activeElement;
        if (!isTypedInput(active)) {
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
        settingsDraft = null;
        els.screenSettings.classList.add("hidden");
        els.screenSettings.setAttribute("aria-hidden", "true");
        els.screenMain.classList.remove("hidden");
        closeDrawer();
        renderMain();
    }

    function copyDraft(source) {
        return {
            driver: source.driver,
            iron7: source.iron7,
            manual: cloneManual(source.manual)
        };
    }

    function readSettingsDraft() {
        var fallback = settingsDraft || settings;
        var driverInput = els.settingsList.querySelector('input[data-anchor="driver"]');
        var iron7Input = els.settingsList.querySelector('input[data-anchor="iron7"]');
        var driver = parseAnchorValue(driverInput && driverInput.value, fallback.driver);
        var iron7 = parseAnchorValue(iron7Input && iron7Input.value, fallback.iron7);
        var manual = cloneManual(fallback.manual);

        CLUB_SPECS.forEach(function (spec) {
            if (!canUseAuto(spec.id)) {
                return;
            }
            var card = els.settingsList.querySelector('[data-club-id="' + spec.id + '"]');
            if (!card) {
                return;
            }
            var toggle = card.querySelector("input[data-auto]");
            var input = card.querySelector("input[data-manual]");
            var autoOn = toggle ? toggle.checked : true;
            if (autoOn) {
                delete manual[spec.id];
                return;
            }
            if (input) {
                manual[spec.id] = parseAnchorValue(
                    input.value,
                    manual[spec.id] != null
                        ? manual[spec.id]
                        : typicalForSpec(spec, driver, iron7)
                );
            } else if (manual[spec.id] == null) {
                manual[spec.id] = typicalForSpec(spec, driver, iron7);
            }
        });

        return { driver: driver, iron7: iron7, manual: manual };
    }

    function refreshSettingsValues(previewClubs) {
        if (!els.settingsList) {
            return;
        }
        (previewClubs || clubs).forEach(function (club) {
            var card = els.settingsList.querySelector('[data-club-id="' + club.id + '"]');
            if (!card) {
                return;
            }
            var computed = card.querySelector(".settings-computed");
            var rangeEl = card.querySelector(".settings-range");
            var input = card.querySelector("input[data-anchor], input[data-manual]");
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

    function previewSettingsDraft() {
        settingsDraft = readSettingsDraft();
        refreshSettingsValues(
            clubsFromAnchors(settingsDraft.driver, settingsDraft.iron7, settingsDraft.manual)
        );
    }

    function bindMetresInput(input, fallbackValue) {
        function normalizeInput() {
            var raw = String(input.value || "").replace(/\D/g, "");
            if (raw !== input.value) {
                input.value = raw;
            }
            if (raw === "") {
                input.value = String(fallbackValue());
            }
        }

        input.addEventListener("input", function () {
            var raw = String(input.value || "").replace(/\D/g, "");
            if (raw !== input.value) {
                input.value = raw;
            }
            var live = parseInt(raw, 10);
            if (!isNaN(live) && live >= 1 && live <= 400) {
                previewSettingsDraft();
            }
        });
        input.addEventListener("change", function () {
            normalizeInput();
            previewSettingsDraft();
        });
        input.addEventListener("blur", function () {
            normalizeInput();
            previewSettingsDraft();
        });
        input.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                saveSettingsAndBack();
            }
        });
    }

    function saveSettingsAndBack() {
        var draft = readSettingsDraft();
        hideDistanceKeyboard();
        settings = copyDraft(draft);
        clubs = clubsFromAnchors(settings.driver, settings.iron7, settings.manual);
        persistSettings(settings);
        showMain();
    }

    function renderSettings() {
        var draft = settingsDraft || copyDraft(settings);
        settingsDraft = copyDraft(draft);
        var previewClubs = clubsFromAnchors(draft.driver, draft.iron7, draft.manual);
        els.settingsList.innerHTML = "";

        previewClubs.forEach(function (club) {
            var anchor = isAnchorClub(club.id);
            var autoOn = anchor ? false : !Object.prototype.hasOwnProperty.call(draft.manual, club.id);
            var editable = anchor || !autoOn;
            var card = document.createElement("div");
            card.className = "settings-card" + (editable ? " is-editable" : " is-computed");
            card.setAttribute("data-club-id", club.id);

            var head =
                '<div class="settings-card-head">' +
                '<div class="settings-club"></div>' +
                (anchor
                    ? ""
                    : '<label class="auto-toggle">' +
                      '<input type="checkbox" data-auto="1">' +
                      '<span class="auto-label">AUTO</span>' +
                      '<span class="switch"></span>' +
                      "</label>") +
                "</div>";

            if (editable) {
                card.innerHTML =
                    head +
                    '<div class="settings-fields">' +
                    '<label>METRES<input type="number" inputmode="numeric" min="1" max="400"></label>' +
                    "</div>" +
                    '<div class="settings-range"></div>';
            } else {
                card.innerHTML =
                    head +
                    '<div class="settings-computed"></div>' +
                    '<div class="settings-range"></div>';
            }

            card.querySelector(".settings-club").textContent = club.name;
            card.querySelector(".settings-range").textContent = "RANGE  " + formatRange(club);

            if (!anchor) {
                var toggle = card.querySelector("input[data-auto]");
                toggle.checked = autoOn;
                toggle.setAttribute("aria-label", "Auto " + club.name);
                toggle.addEventListener("change", function () {
                    var next = readSettingsDraft();
                    if (toggle.checked) {
                        delete next.manual[club.id];
                    } else if (next.manual[club.id] == null) {
                        next.manual[club.id] = club.distance;
                    }
                    settingsDraft = next;
                    renderSettings();
                });
            }

            if (editable) {
                var input = card.querySelector("input[type='number']");
                if (anchor) {
                    input.setAttribute("data-anchor", club.id === "driver" ? "driver" : "iron7");
                } else {
                    input.setAttribute("data-manual", club.id);
                }
                input.value = String(club.distance);
                bindMetresInput(input, function () {
                    return club.distance;
                });
            } else {
                card.querySelector(".settings-computed").textContent = club.distance + " m";
            }

            els.settingsList.appendChild(card);
        });
    }

    function showSettings() {
        hideDistanceKeyboard();
        settingsDraft = copyDraft(settings);
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
    els.btnSettingsSave.addEventListener("click", saveSettingsAndBack);

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

    persistSettings(settings);
    renderMain();
}());

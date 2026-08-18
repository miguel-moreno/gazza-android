(function () {
    "use strict";

    var MIN_DISTANCE = 40;
    var MAX_DISTANCE = 220;
    var RANGE_PAD = 5;
    var CLUB_VALUE_MIN = 1;
    var CLUB_VALUE_MAX = 400;
    var STORAGE_KEY = "gazza_clubs_v1";

    var DEFAULT_CLUBS = [
        { id: "driver", name: "DRIVER", distance: 200 },
        { id: "3w", name: "3W", distance: 185 },
        { id: "3h", name: "3H 19°", distance: 175 },
        { id: "4h", name: "4H 22°", distance: 160 },
        { id: "5i", name: "5 IRON", distance: 148 },
        { id: "6i", name: "6 IRON", distance: 140 },
        { id: "7i", name: "7 IRON", distance: 122 },
        { id: "8i", name: "8 IRON", distance: 112 },
        { id: "9i", name: "9 IRON", distance: 105 },
        { id: "pw", name: "PW", distance: 100 },
        { id: "52", name: "52°", distance: 95 },
        { id: "56", name: "56°", distance: 85 },
        { id: "60", name: "60°", distance: 70 }
    ].map(clubFromDistance);

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

    function cloneClubs(list) {
        return list.map(function (club) {
            return clubFromDistance(club);
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

    function sanitizeClub(club, fallback) {
        return clubFromDistance({
            id: fallback.id,
            name: fallback.name,
            distance: readTypicalDistance(club, fallback.distance)
        });
    }

    function mergeSavedClubs(saved) {
        var byId = {};
        if (Array.isArray(saved)) {
            saved.forEach(function (club) {
                if (club && club.id) {
                    byId[club.id] = club;
                }
            });
        }
        return DEFAULT_CLUBS.map(function (fallback) {
            return sanitizeClub(byId[fallback.id] || fallback, fallback);
        });
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

    function loadClubs() {
        var json = readNativeJson();
        if (!json) {
            try {
                json = window.localStorage.getItem(STORAGE_KEY) || "";
            } catch (e) {
                json = "";
            }
        }
        if (!json) {
            return cloneClubs(DEFAULT_CLUBS);
        }
        try {
            return mergeSavedClubs(JSON.parse(json));
        } catch (e) {
            return cloneClubs(DEFAULT_CLUBS);
        }
    }

    function saveClubs(clubs) {
        var json = JSON.stringify(clubs);
        try {
            window.localStorage.setItem(STORAGE_KEY, json);
        } catch (e) {}
        writeNativeJson(json);
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = {
            DEFAULT_CLUBS: DEFAULT_CLUBS,
            RANGE_PAD: RANGE_PAD,
            selectClubIndex: selectClubIndex,
            adjacentClubs: adjacentClubs,
            formatRange: formatRange,
            rangeFromDistance: rangeFromDistance,
            mergeSavedClubs: mergeSavedClubs,
            sanitizeClub: sanitizeClub
        };
        return;
    }

    var clubs = loadClubs();
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

    function isDistanceEditing() {
        return document.activeElement === els.distanceInput;
    }

    function hideDistanceKeyboard() {
        if (!isDistanceEditing()) {
            return false;
        }
        els.distanceInput.blur();
        commitDistanceInput();
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

    function renderSettings() {
        els.settingsList.innerHTML = "";
        clubs.forEach(function (club, index) {
            var card = document.createElement("div");
            card.className = "settings-card";
            card.innerHTML =
                '<div class="settings-club"></div>' +
                '<div class="settings-fields">' +
                '<label>METRES<input type="number" inputmode="numeric" min="1" max="400" data-field="distance"></label>' +
                "</div>" +
                '<div class="settings-range"></div>';
            card.querySelector(".settings-club").textContent = club.name;
            var distanceInput = card.querySelector('input[data-field="distance"]');
            var rangeEl = card.querySelector(".settings-range");
            distanceInput.value = club.distance;
            rangeEl.textContent = "AUTO RANGE  " + formatRange(club);

            function commit() {
                var updated = sanitizeClub({ distance: distanceInput.value }, club);
                clubs[index] = updated;
                distanceInput.value = updated.distance;
                rangeEl.textContent = "AUTO RANGE  " + formatRange(updated);
                saveClubs(clubs);
                renderMain();
            }

            distanceInput.addEventListener("change", commit);
            distanceInput.addEventListener("blur", commit);
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

    saveClubs(clubs);
    renderMain();
}());

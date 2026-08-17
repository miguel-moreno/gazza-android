(function () {
    "use strict";

    var MIN_DISTANCE = 40;
    var MAX_DISTANCE = 220;
    var STORAGE_KEY = "gazza_clubs_v1";

    var DEFAULT_CLUBS = [
        { id: "driver", name: "DRIVER", min: 195, max: 200 },
        { id: "3w", name: "3W", min: 175, max: 185 },
        { id: "3h", name: "3H 19°", min: 165, max: 175 },
        { id: "4h", name: "4H 22°", min: 155, max: 160 },
        { id: "5i", name: "5 IRON", min: 140, max: 148 },
        { id: "6i", name: "6 IRON", min: 132, max: 140 },
        { id: "7i", name: "7 IRON", min: 110, max: 122 },
        { id: "8i", name: "8 IRON", min: 105, max: 112 },
        { id: "9i", name: "9 IRON", min: 100, max: 105 },
        { id: "pw", name: "PW", min: 90, max: 100 },
        { id: "52", name: "52°", min: 85, max: 95 },
        { id: "56", name: "56°", min: 75, max: 85 },
        { id: "60", name: "60°", min: 60, max: 70 }
    ];

    function cloneClubs(list) {
        return list.map(function (club) {
            return {
                id: club.id,
                name: club.name,
                min: Number(club.min),
                max: Number(club.max)
            };
        });
    }

    function formatRange(club) {
        if (!club) {
            return "—";
        }
        return club.min + "–" + club.max + " m";
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

    function sanitizeClub(club, fallback) {
        var min = parseInt(club && club.min, 10);
        var max = parseInt(club && club.max, 10);
        if (isNaN(min)) {
            min = fallback.min;
        }
        if (isNaN(max)) {
            max = fallback.max;
        }
        min = Math.max(1, Math.min(400, min));
        max = Math.max(1, Math.min(400, max));
        if (min > max) {
            var swap = min;
            min = max;
            max = swap;
        }
        return {
            id: fallback.id,
            name: fallback.name,
            min: min,
            max: max
        };
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
            selectClubIndex: selectClubIndex,
            formatRange: formatRange,
            mergeSavedClubs: mergeSavedClubs
        };
        return;
    }

    var clubs = loadClubs();
    var distance = 96;
    var drawerOpen = false;
    var numpadOpen = false;
    var numpadBuffer = "";
    var numpadFresh = true;

    var els = {
        btnMenu: document.getElementById("btnMenu"),
        btnMore: document.getElementById("btnMore"),
        screenMain: document.getElementById("screenMain"),
        screenSettings: document.getElementById("screenSettings"),
        btnDistance: document.getElementById("btnDistance"),
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
        numpad: document.getElementById("numpad"),
        numpadBackdrop: document.getElementById("numpadBackdrop"),
        numpadValue: document.getElementById("numpadValue")
    };

    function clampDistance(value) {
        var n = parseInt(value, 10);
        if (isNaN(n)) {
            n = distance;
        }
        return Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, n));
    }

    function renderMain() {
        var index = selectClubIndex(distance, clubs);
        var selected = clubs[index];
        var prev = index > 0 ? clubs[index - 1] : null;
        var next = index < clubs.length - 1 ? clubs[index + 1] : null;

        els.btnDistance.textContent = String(distance);
        els.distanceSlider.value = String(distance);
        els.selectedName.textContent = selected.name;
        els.selectedRange.textContent = formatRange(selected);

        if (prev) {
            els.prevCard.classList.remove("is-empty");
            els.prevName.textContent = prev.name;
            els.prevRange.textContent = formatRange(prev);
        } else {
            els.prevCard.classList.add("is-empty");
            els.prevName.textContent = "—";
            els.prevRange.textContent = "—";
        }

        if (next) {
            els.nextCard.classList.remove("is-empty");
            els.nextName.textContent = next.name;
            els.nextRange.textContent = formatRange(next);
        } else {
            els.nextCard.classList.add("is-empty");
            els.nextName.textContent = "—";
            els.nextRange.textContent = "—";
        }
    }

    function setDistance(value, fromSlider) {
        distance = clampDistance(value);
        if (!fromSlider) {
            els.distanceSlider.value = String(distance);
        }
        renderMain();
    }

    function closeDrawer() {
        drawerOpen = false;
        els.drawer.classList.remove("open");
        els.drawer.setAttribute("aria-hidden", "true");
        els.drawerBackdrop.classList.add("hidden");
    }

    function openDrawer() {
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
                '<label>MIN<input type="number" inputmode="numeric" min="1" max="400" data-field="min"></label>' +
                '<label>MAX<input type="number" inputmode="numeric" min="1" max="400" data-field="max"></label>' +
                "</div>";
            card.querySelector(".settings-club").textContent = club.name;
            var minInput = card.querySelector('input[data-field="min"]');
            var maxInput = card.querySelector('input[data-field="max"]');
            minInput.value = club.min;
            maxInput.value = club.max;

            function commit() {
                var updated = sanitizeClub(
                    { min: minInput.value, max: maxInput.value },
                    club
                );
                clubs[index] = updated;
                minInput.value = updated.min;
                maxInput.value = updated.max;
                saveClubs(clubs);
                renderMain();
            }

            minInput.addEventListener("change", commit);
            maxInput.addEventListener("change", commit);
            minInput.addEventListener("blur", commit);
            maxInput.addEventListener("blur", commit);
            els.settingsList.appendChild(card);
        });
    }

    function showSettings() {
        els.screenMain.classList.add("hidden");
        els.screenSettings.classList.remove("hidden");
        els.screenSettings.setAttribute("aria-hidden", "false");
        closeDrawer();
        renderSettings();
    }

    function updateNumpadDisplay() {
        els.numpadValue.textContent = numpadBuffer === "" ? "—" : numpadBuffer;
    }

    function openNumpad() {
        numpadOpen = true;
        numpadBuffer = String(distance);
        numpadFresh = true;
        els.numpad.classList.remove("hidden");
        els.numpad.setAttribute("aria-hidden", "false");
        els.numpadBackdrop.classList.remove("hidden");
        updateNumpadDisplay();
    }

    function closeNumpad() {
        numpadOpen = false;
        els.numpad.classList.add("hidden");
        els.numpad.setAttribute("aria-hidden", "true");
        els.numpadBackdrop.classList.add("hidden");
    }

    function confirmNumpad() {
        if (numpadBuffer !== "") {
            setDistance(numpadBuffer, false);
        }
        closeNumpad();
    }

    function handleNumpadKey(key) {
        if (key === "ok") {
            confirmNumpad();
            return;
        }
        if (key === "del") {
            numpadFresh = false;
            numpadBuffer = numpadBuffer.slice(0, -1);
            updateNumpadDisplay();
            return;
        }
        if (numpadFresh) {
            numpadBuffer = key;
            numpadFresh = false;
        } else if (numpadBuffer.length < 3) {
            numpadBuffer += key;
        }
        updateNumpadDisplay();
        var live = parseInt(numpadBuffer, 10);
        if (!isNaN(live) && live >= MIN_DISTANCE && live <= MAX_DISTANCE) {
            els.distanceSlider.value = String(live);
            els.btnDistance.textContent = String(live);
        }
    }

    window.gazzaOnBack = function () {
        if (numpadOpen) {
            closeNumpad();
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
    els.btnDistance.addEventListener("click", openNumpad);
    els.numpadBackdrop.addEventListener("click", confirmNumpad);

    els.distanceSlider.addEventListener("input", function (event) {
        setDistance(event.target.value, true);
    });

    els.numpad.addEventListener("click", function (event) {
        var key = event.target.getAttribute("data-key");
        if (key) {
            handleNumpadKey(key);
        }
    });

    saveClubs(clubs);
    renderMain();
}());

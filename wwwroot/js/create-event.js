// wwwroot/js/create-event.js

document.addEventListener("DOMContentLoaded", function () {
    const LOCAL_STORAGE_KEY = "tallify_create_event_draft";

    // Root container – if not found, stop everything
    const root = document.querySelector(".app-page--create-event");
    if (!root) return;

    /* =========================================================
     * STEP STATE & NAVIGATION ELEMENTS
     * =======================================================*/

    let currentStep = 1;
    const totalSteps = 4;

    const stepIndexEl  = document.getElementById("eventStepIndex");
    const stepTotalEl  = document.getElementById("eventStepTotal");
    const stepPillText = document.getElementById("eventStepPillText");

    const btnNext = document.getElementById("btnStepNext");
    const btnBack = document.getElementById("btnStepBack");

    const criteriaStep2 = document.getElementById("criteriaStep2");
    const orwStep2      = document.getElementById("orwStep2");

    // 4 out of 4
    if (stepTotalEl) {
        stepTotalEl.textContent = totalSteps;
    }

    /* =========================================================
     * BASIC HELPERS
     * =======================================================*/

    function showToast(message, type = "error") {
        const container = document.getElementById("toast-container");
        if (!container) {
            console.log("[Toast]", type, message);
            return;
        }

        const toast = document.createElement("div");
        toast.className = `toast-item toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add("is-visible");
        });

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove("is-visible");
            toast.addEventListener("transitionend", () => {
                toast.remove();
            });
        }, 4000);
    }

    function getSelectedEventType() {
        return document.querySelector('input[name="eventType"]:checked')?.value || "criteria";
    }

    function stepLabel(step) {
        switch (step) {
            case 1: return "Basic";
            case 2: return "Scoring and Participants";
            case 3: return "Preferences and Appearance";
            case 4: return "Review";
            default: return "";
        }
    }

    function formatDateTime(dateStr, timeStr) {
        if (!dateStr || !timeStr) return "—";
        const dt = new Date(`${dateStr}T${timeStr}`);
        if (isNaN(dt.getTime())) return "—";
        return dt.toLocaleString(undefined, {
            year:  "numeric",
            month: "long",
            day:   "numeric",
            hour:  "numeric",
            minute: "2-digit"
        });
    }

    function updateStepUI(step) {
        if (stepPillText) stepPillText.textContent = stepLabel(step);

        if (btnNext) {
            if (step === 4) {
                if (window.currentEventId && window.currentEventId > 0) {
                    btnNext.textContent = "Save Changes";
                } else {
                    btnNext.textContent = "Publish Event";
                }
            } else if (step === 3) {
                btnNext.textContent = "Review";
                
                // Dynamic Label for Access Code
                const type = getSelectedEventType();
                const label = document.getElementById("accessCodeLabel");
                if (label) {
                    label.textContent = type === "orw" 
                        ? "Access Code for Scorers" 
                        : "Access Code for Judges";
                }

            } else {
                btnNext.textContent = "Next";
            }
        }

        if (btnBack) {
            if (step === 1) {
                btnBack.textContent = "Cancel";
                btnBack.style.display = "none";
            } else {
                btnBack.textContent = "Back";
                btnBack.style.display = "inline-flex";
            }
        }
    }

    function showStep(step) {
        currentStep = step;

        document.querySelectorAll(".event-step").forEach(section => {
            const isActive = Number(section.dataset.step) === step;
            section.classList.toggle("is-active", isActive);
        });

        if (stepIndexEl) stepIndexEl.textContent = step;
        if (stepPillText) stepPillText.textContent = stepLabel(step);
    }

    // INITIAL STEP
    showStep(1);
    updateStepUI(1);

    /* =========================================================
     * LOCAL STORAGE – SAVE / LOAD
     * =======================================================*/

    let eventThemeColor = null;                // used by getEventData
    window.selectedHeaderImageFileName = "";   // used by getEventData as well

    function getEventData() {
        return {
            /* STEP 1 — BASIC INFO */
            eventName:        document.getElementById("eventName")?.value || "",
            eventVenue:       document.getElementById("eventVenue")?.value || "",
            eventDescription: document.getElementById("eventDescription")?.value || "",
            eventStartDate:   document.getElementById("eventStartDate")?.value || "",
            eventStartTime:   document.getElementById("eventStartTime")?.value || "",
            // eventEndDate/Time removed
            eventType:        getSelectedEventType(),

            /* STEP 2 — PARTICIPANTS & SCORING */
            contestants:    collectContestantsForPayload(),
            accessUsers:    collectAccessUsersForPayload(),   // judges or scorers
            criteriaRounds: collectCriteriaForPayload(),      // criteria-based rounds
            orwRounds:      collectOrwRoundsForPayload(),     // ORW rounds
            shouldSendInvites: shouldSendInvites, // NEW

            /* STEP 3 — PREFERENCES */
            eventJudgeVisibility: document.getElementById("eventJudgeVisibility")?.value,
            eventScoreVisibility: document.getElementById("eventScoreVisibility")?.value,
            eventVotingSystem:    document.getElementById("eventVotingSystem")?.value,

            eventLiveFeed:        document.getElementById("eventLiveFeed")?.value || "no",
            
            // Access Code (explicitly mapped)
            accessCode:           document.getElementById("eventAccessCode")?.value || "",

            /* THEME / HEADER */
            selectedThemeColor:      eventThemeColor,
            selectedHeaderFileName: window.selectedHeaderImageFileName || ""
        };
    }


    function saveEventData() {
        try {
            const data = getEventData();
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Error saving to local storage", e);
        }
    }

    function loadEventData() {
        try {
            const data = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (!data) return;

            const draft = JSON.parse(data);

            // Step 1
            if (draft.eventName)        document.getElementById("eventName").value        = draft.eventName;
            if (draft.eventVenue)       document.getElementById("eventVenue").value       = draft.eventVenue;
            if (draft.eventDescription) document.getElementById("eventDescription").value = draft.eventDescription;
            if (draft.eventStartDate)   document.getElementById("eventStartDate").value   = draft.eventStartDate;
            if (draft.eventStartTime)   document.getElementById("eventStartTime").value   = draft.eventStartTime;


            // Event type
            if (draft.eventType) {
                const radioId = draft.eventType === "criteria" ? "eventTypeCriteria" : "eventTypeObjective";
                const radio = document.getElementById(radioId);
                if (radio) {
                    radio.checked = true;
                    updateEventTypeInfo();
                }
            }

            // Step 3
            if (draft.eventJudgeVisibility) document.getElementById("eventJudgeVisibility").value = draft.eventJudgeVisibility;
            if (draft.eventScoreVisibility) document.getElementById("eventScoreVisibility").value = draft.eventScoreVisibility;
            if (draft.eventVotingSystem)    document.getElementById("eventVotingSystem").value    = draft.eventVotingSystem;


            // Header filename
            if (draft.selectedHeaderFileName) {
                window.selectedHeaderImageFileName = draft.selectedHeaderFileName;
                const fnSpan = document.getElementById("headerFileName") || document.getElementById("selectedHeaderFileName");
                if (fnSpan) fnSpan.textContent = draft.selectedHeaderFileName;
            }

            // Theme preset
            if (draft.selectedThemeColor) {
                eventThemeColor = draft.selectedThemeColor;
                root.querySelectorAll(".theme-preset-option").forEach(btn => {
                    const isSelected = btn.dataset.color === draft.selectedThemeColor;
                    btn.classList.toggle("is-selected", isSelected);
                    btn.querySelector(".theme-label")?.classList.toggle("is-selected", isSelected);
                });
            }
            // New: Restore shouldSendInvites flag
            if (typeof draft.shouldSendInvites === 'boolean') {
                shouldSendInvites = draft.shouldSendInvites;
            }

            /* STEP 2 — RESTORE SCORING & PARTICIPANTS */

            // Contestants
            if (draft.contestants && Array.isArray(draft.contestants) && draft.contestants.length) {
                restoreContestantsFromDraft(draft.contestants);
            }

            // Judges / scorers (Step 2 people)
            if (draft.accessUsers && Array.isArray(draft.accessUsers) && draft.accessUsers.length) {
                restoreAccessUsersFromDraft(draft.accessUsers);
            }

            // Criteria rounds
            if (draft.criteriaRounds && draft.eventType === "criteria") {
                restoreCriteriaRoundsFromDraft(draft.criteriaRounds);
            }

            // ORW rounds
            if (draft.orwRounds && draft.eventType !== "criteria") {
                restoreOrwRoundsFromDraft(draft.orwRounds);
            }

            // ORW scorer assignments
            if (draft.scorerAssignments && draft.eventType !== "criteria") {
                restoreScorerAssignments(draft.scorerAssignments);
            }

            showToast("Event draft loaded.", "info");
        } catch (e) {
            console.warn("No draft found or error loading draft.", e);
        }
    }



    /* =========================================================
     * ERROR HELPERS
     * =======================================================*/

    function setError(key, msg) {
        const el = root.querySelector(`.event-error-message[data-error-for="${key}"]`);
        if (el) {
            el.textContent = msg;
            el.style.display = "block";
        }
        
        // Toggle invalid class
        const input = document.getElementById(key);
        if (input) input.classList.add("invalid");
        
        if (key === "eventStart") {
            document.getElementById("eventStartDate")?.classList.add("invalid");
            document.getElementById("eventStartTime")?.classList.add("invalid");
        }
    }

    function clearError(key) {
        const el = root.querySelector(`.event-error-message[data-error-for="${key}"]`);
        if (el) {
            el.textContent = "";
            el.style.display = "none";
        }
        
        // Remove invalid class
        const input = document.getElementById(key);
        if (input) input.classList.remove("invalid");
        
        if (key === "eventStart") {
            document.getElementById("eventStartDate")?.classList.remove("invalid");
            document.getElementById("eventStartTime")?.classList.remove("invalid");
        }
    }

    function clearAllErrors() {
        root.querySelectorAll(".event-error-message").forEach(el => {
            el.textContent = "";
            el.style.display = "none";
        });
        root.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
    }

    function showFieldErrorForInput(inputEl, message) {
        if (!inputEl) return;
        const field = inputEl.closest(".event-field") || inputEl.parentElement;
        if (!field) return;

        let err = field.querySelector(".event-error-message");
        if (!err) {
            err = document.createElement("div");
            err.className = "event-error-message";
            const label = field.querySelector(".event-label");
            if (label && label.nextSibling) {
                field.insertBefore(err, label.nextSibling);
            } else if (label) {
                field.appendChild(err);
            } else {
                field.insertBefore(err, field.firstChild);
            }
        }

        err.textContent = message;
        err.style.display = "inline-block";
        inputEl.classList.add("invalid");
    }

    function isValidEmail(email) {
        if (!email) return false;
        const trimmed = email.trim();
        if (!trimmed) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(trimmed);
    }

    /* =========================================================
     * TYPE INFO + PREVIEW TYPE CHIP
     * =======================================================*/

    const typeRadios            = root.querySelectorAll('input[name="eventType"]');
    const typeInfo              = document.getElementById("eventTypeInfo");
    const previewTypeChip       = document.querySelector(".type-chip");
    const contestantsHelperText = document.getElementById("contestantsHelperText");

    function updateEventTypeInfo() {
        const value = getSelectedEventType();

        if (typeInfo) {
            typeInfo.textContent = value === "criteria"
                ? "Criteria-based: Judges score contestants on weighted criteria."
                : "Objective-based: Scores are based on right/wrong or numeric answers.";
        }

        if (previewTypeChip) {
            if (value === "criteria") {
                previewTypeChip.textContent = "CB";
                previewTypeChip.classList.add("type-chip--criteria");
                previewTypeChip.classList.remove("type-chip--orw");
            } else {
                previewTypeChip.textContent = "ORW";
                previewTypeChip.classList.add("type-chip--orw");
                previewTypeChip.classList.remove("type-chip--criteria");
            }
        }

        if (contestantsHelperText) {
            contestantsHelperText.innerHTML =
                `Please ensure that the XLSX file contains: <strong>Picture, ID, Name, and Organization.</strong>`;
        }
    }

    typeRadios.forEach(r => r.addEventListener("change", updateEventTypeInfo));
    updateEventTypeInfo();

    /* =========================================================
     * TABLE EMPTY STATE
     * =======================================================*/

    function updateEmptyState(tbody, message) {
        if (!tbody) return;
        const table = tbody.closest("table");
        if (!table) return;

        const colCount = table.querySelectorAll("thead th").length;
        let emptyRow = tbody.querySelector(".event-table-empty");

        const dataRows = Array.from(
            tbody.querySelectorAll("tr")
        ).filter(tr => !tr.classList.contains("event-table-empty"));

        if (dataRows.length === 0) {
            if (!emptyRow) {
                emptyRow = document.createElement("tr");
                emptyRow.className = "event-table-empty table-empty-row";
                emptyRow.innerHTML = `<td colspan="${colCount}">${message}</td>`;
                tbody.appendChild(emptyRow);
            } else {
                const td = emptyRow.querySelector("td");
                if (td) {
                    td.colSpan = colCount;
                    td.textContent = message;
                }
            }
        } else if (emptyRow) {
            emptyRow.remove();
        }
    }

    /* =========================================================
     * DATE / TIME PICKER ICON BUTTONS
     * =======================================================*/

    function wirePicker(id, attr) {
        const input = document.getElementById(id);
        const btn   = root.querySelector(`[${attr}="${id}"]`);
        if (input && btn) {
            btn.addEventListener("click", () => input.showPicker?.() || input.focus());
        }
    }

    wirePicker("eventStartDate", "data-date-icon-for");
    wirePicker("eventStartTime", "data-time-icon-for");

    /* =========================================================
     * CONTESTANTS (rows, xlsx, photo, modal)
     * =======================================================*/

    const contestantsBody     = document.getElementById("contestantsBody");
    const uploadXlsxBtn       = document.getElementById("btnUploadContestants");
    const contestantsXlsxInput = document.getElementById("contestantsXlsxInput");

    function renumberContestants() {
        if (!contestantsBody) return;
        const rows = contestantsBody.querySelectorAll("tr[data-contestant-row]");
        rows.forEach((tr, index) => {
            const idCell = tr.querySelector("td:first-child");
            if (idCell) {
                const num = index + 1;
                idCell.textContent = "C" + String(num).padStart(3, "0");
            }
        });
    }

    // Photo modal
    let photoModal, photoModalImg;

    function ensurePhotoModal() {
        if (photoModal) return;

        photoModal = document.createElement("div");
        photoModal.className = "event-photo-modal-backdrop";
        photoModal.id = "photoPreviewModal";
        photoModal.innerHTML = `
            <div class="event-photo-modal">
                <div class="event-photo-modal-header">
                    <h3 class="event-photo-modal-title">Contestant Photo</h3>
                    <button type="button" class="modal-close-x" data-photo-close aria-label="Close">×</button>
                </div>
                <div class="event-photo-modal-body">
                    <img id="photoPreviewImage" alt="Contestant photo" />
                </div>
            </div>
        `;
        document.body.appendChild(photoModal);

        photoModalImg = photoModal.querySelector("#photoPreviewImage");

        function closePhotoModal() {
            photoModal.classList.remove("is-open");
            if (photoModalImg) {
                photoModalImg.src = "";
            }
            document.body.classList.remove("has-modal-open");
        }

        photoModal.addEventListener("click", (e) => {
            if (e.target === photoModal) closePhotoModal();
        });
        photoModal.querySelectorAll("[data-photo-close]").forEach(btn => {
            btn.addEventListener("click", closePhotoModal);
        });
    }

    function openPhotoModal(src) {
        if (!src) return;
        ensurePhotoModal();
        if (!photoModalImg) return;
        photoModalImg.src = src;
        photoModal.classList.add("is-open");
        document.body.classList.add("has-modal-open");
    }

    function wireContestantPhoto(row) {
        const photoInput = row.querySelector(".contestant-photo-input");
        const photoThumb = row.querySelector("[data-photo-preview]");
        const photoBtn   = row.querySelector("[data-upload-photo]");

        if (!photoInput || !photoThumb || !photoBtn) return;

        photoBtn.addEventListener("click", () => {
            photoInput.click();
        });

        photoInput.addEventListener("change", async () => {
            const file = photoInput.files[0];
            if (!file) return;

            // 1. Immediate Preview
            const reader = new FileReader();
            reader.onload = () => {
                const url = reader.result;
                photoThumb.style.backgroundImage = `url(${url})`;
                photoThumb.classList.add("has-photo");
            };
            reader.readAsDataURL(file);

            // 2. Upload
            photoBtn.textContent = "Uploading...";
            photoBtn.disabled = true;

            const formData = new FormData();
            formData.append("file", file);

            try {
                const response = await fetch("/Events/UploadImage", {
                    method: "POST",
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    // Success: Store SERVER path
                    // Note: Dashboard/Manage view expects absolute path for contestants? 
                    // Actually, if we store "/uploads/filename.jpg", it works as root-relative URL.
                    const serverPath = "/uploads/" + data.fileName;
                    
                    photoThumb.dataset.photoUrl = serverPath; 
                    photoThumb.style.backgroundImage = `url('${serverPath}')`;

                    photoBtn.textContent = "Replace photo";
                    photoBtn.disabled = false;
                    saveEventData();
                } else {
                    showToast("Photo upload failed: " + data.message, "error");
                    photoBtn.textContent = "Upload photo";
                    photoBtn.disabled = false;
                    photoThumb.classList.remove("has-photo");
                    photoThumb.style.backgroundImage = "";
                }
            } catch (err) {
                console.error(err);
                showToast("Error uploading photo.", "error");
                photoBtn.textContent = "Upload photo";
                photoBtn.disabled = false;
            }
        });

        photoThumb.addEventListener("click", () => {
            const url = photoThumb.dataset.photoUrl;
            if (!url) return;
            openPhotoModal(url);
        });
    }

    function addContestantRow() {
        if (!contestantsBody) return;

        const tr = document.createElement("tr");
        tr.dataset.contestantRow = "true";
        tr.innerHTML = `
            <td></td>
            <td>
                <input type="text"
                       class="event-input event-input-cell contestant-name-input"
                       placeholder="e.g. Jane Doe" />
            </td>
            <td>
                <input type="text"
                       class="event-input event-input-cell contestant-org-input"
                       placeholder="e.g. Science Club" />
            </td>
            <td class="contestant-photo-cell">
                <div class="contestant-photo-wrapper">
                    <div class="contestant-photo-thumb" data-photo-preview></div>
                    <button type="button" class="btn-outline btn-small" data-upload-photo>
                        Upload photo
                    </button>
                    <input type="file"
                           accept="image/*"
                           class="contestant-photo-input"
                           hidden />
                </div>
            </td>
            <td>
                <button type="button"
                        class="btn-danger-soft btn-small"
                        data-remove-contestant>
                    Remove
                </button>
            </td>
        `;

        tr.querySelector("[data-remove-contestant]")?.addEventListener("click", () => {
            tr.remove();
            renumberContestants();
            updateEmptyState(contestantsBody, "No contestants added yet.");
        });

        wireContestantPhoto(tr);

        contestantsBody.appendChild(tr);
        renumberContestants();
        updateEmptyState(contestantsBody, "No contestants added yet.");
    }

    document.getElementById("btnAddContestant")?.addEventListener("click", () => {
        const rows = contestantsBody.querySelectorAll("tr[data-contestant-row]");

        // 1. Validate Last Row (if exists)
        if (rows.length > 0) {
            const lastRow = rows[rows.length - 1];
            const nameVal = lastRow.querySelector(".contestant-name-input")?.value.trim();
            const orgVal  = lastRow.querySelector(".contestant-org-input")?.value.trim();
            
            let hasError = false;
            if (!nameVal) {
                showToast("Contestant Name is required", "error");
                hasError = true;
            }
            if (!orgVal) {
                showToast("Organization is required", "error");
                hasError = true;
            }
            
            if (hasError) return;
        }

        // Check for duplicates before adding
        const seen = new Set();
        let hasDuplicate = false;

        for (const row of rows) {
            const nameInput = row.querySelector(".contestant-name-input");
            const orgInput = row.querySelector(".contestant-org-input");

            const name = nameInput ? nameInput.value.trim().toLowerCase() : "";
            const org = orgInput ? orgInput.value.trim().toLowerCase() : "";

            // If a row is completely empty, we might ignore it or count it?
            // Let's ignore empty rows for duplicate checking, but if there are multiple empty rows that's also weird.
            // Requirement says: SAME Name AND SAME Organization.
            if (!name && !org) continue;

            const key = `${name}|${org}`;
            if (seen.has(key)) {
                hasDuplicate = true;
                break;
            }
            seen.add(key);
        }

        if (hasDuplicate) {
            showToast("Duplicate contestant found. Please edit the details.", "error");
        } else {
            addContestantRow();
        }
    });

    // XLSX upload
    if (uploadXlsxBtn && contestantsXlsxInput) {
        uploadXlsxBtn.addEventListener("click", () => {
            contestantsXlsxInput.value = "";
            contestantsXlsxInput.click();
        });

        contestantsXlsxInput.addEventListener("change", () => {
            const file = contestantsXlsxInput.files[0];
            if (!file) return;
            loadContestantsFromXlsx(file);
        });
    }

    function loadContestantsFromXlsx(file) {
        if (!file || !window.XLSX) {
            showToast("XLSX library not loaded or file missing.", "error");
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];

                const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                if (!rows.length || rows.length === 1) {
                    showToast("XLSX file appears to be empty.", "error");
                    return;
                }

                const header = rows[0].map(h => String(h).trim().toLowerCase());
                const idxPicture = header.indexOf("picture");
                const idxName    = header.indexOf("name");
                const idxOrg     = header.indexOf("organization");

                if (idxName === -1 || idxOrg === -1) {
                    showToast("XLSX must have 'Name' and 'Organization' columns.", "error");
                    return;
                }

                contestantsBody.querySelectorAll("tr[data-contestant-row]").forEach(tr => tr.remove());
                contestantsBody.querySelectorAll(".event-table-empty").forEach(tr => tr.remove());

                const addedKeys = new Set();
                let rowCount = 0;

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const nameVal = row[idxName] ? String(row[idxName]).trim() : "";
                    const orgVal  = row[idxOrg]  ? String(row[idxOrg]).trim()  : "";

                    if (!nameVal && !orgVal) continue;

                    const key = `${nameVal.toLowerCase()}|${orgVal.toLowerCase()}`;
                    if (addedKeys.has(key)) continue;
                    addedKeys.add(key);

                    addContestantRow();
                    rowCount++;

                    const allRows = contestantsBody.querySelectorAll("tr[data-contestant-row]");
                    const tr = allRows[allRows.length - 1];

                    const nameInput = tr.querySelector(".contestant-name-input");
                    const orgInput  = tr.querySelector(".contestant-org-input");

                    if (nameInput) nameInput.value = nameVal;
                    if (orgInput)  orgInput.value  = orgVal;

                    if (idxPicture >= 0) {
                        const picVal = row[idxPicture] ? String(row[idxPicture]).trim() : "";
                        if (picVal && /^https?:\/\//i.test(picVal)) {
                            const thumb = tr.querySelector("[data-photo-preview]");
                            const btn   = tr.querySelector("[data-upload-photo]");
                            if (thumb) {
                                thumb.style.backgroundImage = `url(${picVal})`;
                                thumb.classList.add("has-photo");
                                thumb.dataset.photoUrl = picVal;
                            }
                            if (btn) btn.textContent = "Replace photo";
                        }
                    }
                }

                renumberContestants();
                updateEmptyState(contestantsBody, "No contestants added yet.");

                if (rowCount === 0) {
                    showToast("No valid contestants found in XLSX.", "warning");
                } else {
                    showToast(`Loaded ${rowCount} contestant(s).`, "success");
                }

            } catch (err) {
                console.error(err);
                showToast("Failed to read XLSX file. Please check the format.", "error");
            }
        };

        reader.readAsArrayBuffer(file);
    }

    // Start with one contestant row
    addContestantRow();

    /* =========================================================
     * STEP 1 VALIDATION
     * =======================================================*/

    function validateStep1() {
        clearAllErrors();
        let valid = true;
        let errorCount = 0;

        const nameInput  = document.getElementById("eventName");
        const venueInput = document.getElementById("eventVenue");
        const startDate  = document.getElementById("eventStartDate");
        const startTime  = document.getElementById("eventStartTime");

        if (!nameInput.value.trim()) {
            setError("eventName", "Required");
            valid = false;
            errorCount++;
        }
        if (!venueInput.value.trim()) {
            setError("eventVenue", "Required");
            valid = false;
            errorCount++;
        }

        const startOk = startDate.value && startTime.value;

        if (!startOk) {
            setError("eventStart", "Required");
            valid = false;
            errorCount++;
        }

        if (startOk) {
            const startDateTime = new Date(`${startDate.value}T${startTime.value}`);

            // Start must be strictly in the future (date + time)
            if (startDateTime <= new Date()) {
                setError("eventStart", "Event start must be a future date/time.");
                valid = false;
                errorCount++;
            }
        }

        // Contestants
        const rows = contestantsBody.querySelectorAll("tr[data-contestant-row]");
        clearError("contestants");

        if (rows.length < 2) {
            showToast("At least 2 contestants are required.", "error");
            valid = false;
            // Return immediately for this specific logic error as it's a blocker
            return valid;
        } else {
            let missingSomething = false;
            
            rows.forEach(row => {
                const name       = row.querySelector(".contestant-name-input");
                const org        = row.querySelector(".contestant-org-input");
                const photoInput = row.querySelector(".contestant-photo-input");
                const photoThumb = row.querySelector("[data-photo-preview]");

                const hasName = !!name.value.trim();
                const hasOrg  = !!org.value.trim();

                // Photo is valid if:
                //  - there is a file selected in the input (new upload), OR
                //  - the thumbnail has a saved photoUrl (XLSX import or restored draft)
                const hasFile =
                    photoInput && photoInput.files && photoInput.files.length > 0;

                const hasThumbUrl =
                    photoThumb &&
                    photoThumb.dataset &&
                    typeof photoThumb.dataset.photoUrl === "string" &&
                    photoThumb.dataset.photoUrl.trim() !== "";

                const hasPhoto = hasFile || hasThumbUrl;

                if (!hasName || !hasOrg) {
                    missingSomething = true;
                }
            });

            if (missingSomething) {
                setError("contestants", "All contestants must have name and organization.");
                valid = false;
                errorCount++;
            }
        }

        // Duplicate contestants
        if (rows.length >= 2) {
            const seen = new Set();
            let hasDuplicate = false;

            rows.forEach(row => {
                const nameInputRow = row.querySelector(".contestant-name-input");
                const orgInputRow  = row.querySelector(".contestant-org-input");
                const nameVal = nameInputRow ? nameInputRow.value.trim().toLowerCase() : "";
                const orgVal  = orgInputRow  ? orgInputRow.value.trim().toLowerCase()  : "";

                if (!nameVal || !orgVal) return;

                const key = `${nameVal}|${orgVal}`;
                if (seen.has(key)) {
                    hasDuplicate = true;
                } else {
                    seen.add(key);
                }
            });

            if (hasDuplicate) {
                setError("contestants", "Duplicate contestants found (same name and organization).");
                valid = false;
                errorCount++;
            }
        }

        if (!valid) {
            if (errorCount === 1) {
                // If only one error type, we might want to be specific, but for now consistency is key.
                // However, the setError calls already show text on screen.
                showToast("Please check the highlighted field.", "warning");
            } else {
                showToast(`${errorCount} errors found. Please check the highlighted fields.`, "warning");
            }
        }

        return valid;
    }

        /* =========================================================
        * STEP 2 — CRITERIA-BASED ROUNDS, CRITERIA, SUBCRITERIA
        * =======================================================*/

        const criteriaRoundsList = document.getElementById("criteriaRoundsList");
        const judgesBody = document.getElementById("judgesBody");
        let roundCounter = 0;
        let usedJudgePins = new Set();

        function addSubcriteriaRow(container) {
            const wrapper = document.createElement("div");
            wrapper.className = "subcriteria-block";

            wrapper.innerHTML = `
                <div class="event-field event-field-full">
                    <label class="event-label">Sub-criteria Name</label>
                    <div class="input-with-button-inline">
                        <input class="event-input" placeholder="e.g. Originality" />
                        <button type="button" class="btn-danger-soft btn-small subcriteria-remove" aria-label="Remove Sub-criteria">
                            <i class="ri-close-line" style="font-size:1.2rem;"></i>
                        </button>
                    </div>
                </div>

                <div class="event-subcriteria-row">
                    <!-- Scoring Type Removed -->

                    <div class="event-field criteria-weight-field">
                        <label class="event-label">Weight (%)</label>
                        <input type="number" class="event-input" placeholder="e.g. 25" min="0" max="100" />
                    </div>

                    <div class="event-field">
                        <label class="event-label">Minimum Point</label>
                        <input type="number" class="event-input min-point-input" placeholder="0" />
                    </div>

                    <div class="event-field dynamic-field">
                        <label class="event-label point-label">Maximum Point</label>
                        <div class="point-field">
                            <input type="number" class="event-input max-point-input" placeholder="100" />
                        </div>
                    </div>
                </div>
            `;

            const row = wrapper.querySelector(".event-subcriteria-row");
            
            wrapper.querySelector(".subcriteria-remove").addEventListener("click", () => wrapper.remove());

            container.appendChild(wrapper);
            updateCriteriaInputVisibility(); // Ensure correct fields are shown
        }

        function addCriteriaBlock(container, roundIndex) {
            // Round 1 (index 1) should NOT have derived fields. Round 2+ (index > 1) can.
            const hasDerived = roundIndex > 1; 
            const block = document.createElement("div");
            block.className = "criteria-block";

            block.innerHTML = `
                <div class="event-field event-field-full">
                    <label class="event-label">Criteria Name</label>
                    <div style="display:flex; gap:10px;">
                        <input class="event-input" placeholder="e.g. Creativity" style="flex-grow:1;" />
                        <button type="button" class="btn-danger-soft btn-small criteria-remove" aria-label="Remove Criteria" style="width:42px; display:flex; align-items:center; justify-content:center;">
                            <i class="ri-close-line" style="font-size:1.2rem;"></i>
                        </button>
                    </div>
                </div>

                ${hasDerived ? `
                <div class="event-field event-field-full criteria-derived-field">
                    <label class="event-label">Derived From Round</label>
                    <div class="filter-select filter-select--combo" data-select-type="derived">
                        <button type="button" class="combo-full-width filter-select-trigger">
                            <span class="filter-select-label">None</span>
                            <span class="filter-select-icon"><i class="ri-arrow-down-s-line"></i></span>
                        </button>
                        <div class="filter-select-menu">
                            <button type="button" class="filter-select-option is-selected" data-value="">None</button>
                            ${Array.from({ length: roundIndex - 1 }, (_, i) =>
                                `<button type="button" class="filter-select-option" data-value="${i + 1}">Round ${i + 1}</button>`
                            ).join("")}
                        </div>
                    </div>
                </div>` : ""}

                <div class="event-criteria-row">
                    <!-- Scoring Type Removed -->

                    <div class="event-field criteria-weight-field">
                        <label class="event-label">Weight (%)</label>
                        <input type="number" class="event-input" placeholder="e.g. 25" min="0" max="100" />
                    </div>

                    <div class="event-field">
                        <label class="event-label">Minimum Point</label>
                        <input type="number" class="event-input min-point-input" placeholder="0" />
                    </div>

                    <div class="event-field dynamic-field">
                        <label class="event-label point-label">Maximum Point</label>
                        <div class="point-field">
                            <input type="number" class="event-input max-point-input" placeholder="100" />
                        </div>
                    </div>
                </div>

                <div class="subcriteria-separator">Sub-criteria</div>
                <div class="subcriteria-blocks"></div>
                <button type="button" class="btn-primary-soft btn-small btn-add-subcriteria">
                    <i class="ri-add-line"></i> Add sub-criteria
                </button>
            `;

            // wire dropdowns
            block.querySelectorAll(".filter-select").forEach(select => {
                const trigger = select.querySelector(".filter-select-trigger");
                const label = select.querySelector(".filter-select-label");
                const isDerived = select.dataset.selectType === "derived";

                // Function to handle Derived logic
                const updateDerivedState = (val) => {
                    if (!isDerived) return;
                    const minInput = block.querySelector(".min-point-input");
                    const maxInput = block.querySelector(".max-point-input");
                    if (minInput && maxInput) {
                        const isDerivedSelected = val !== ""; // val is the value from the dropdown, e.g., "1" or "" (for None)
                        minInput.disabled = isDerivedSelected;
                        maxInput.disabled = isDerivedSelected;
                        
                        if (isDerivedSelected) {
                            // Store current values and placeholders before clearing
                            minInput.dataset.originalValue = minInput.value;
                            maxInput.dataset.originalValue = maxInput.value;
                            minInput.dataset.originalPlaceholder = minInput.placeholder;
                            maxInput.dataset.originalPlaceholder = maxInput.placeholder;

                            minInput.value = "";
                            maxInput.value = "";
                            minInput.placeholder = "";
                            maxInput.placeholder = "";
                        } else {
                            // Restore original values and placeholders
                            minInput.value = minInput.dataset.originalValue || "";
                            maxInput.value = maxInput.dataset.originalValue || "";
                            minInput.placeholder = minInput.dataset.originalPlaceholder || "0"; // Default placeholder if none saved
                            maxInput.placeholder = minInput.dataset.originalPlaceholder || "100"; // Default placeholder if none saved
                        }
                    }
                };

                trigger.addEventListener("click", () => {
                    root.querySelectorAll(".filter-select").forEach(s => {
                        if (s !== select) s.classList.remove("filter-select--open");
                    });
                    select.classList.toggle("filter-select--open");
                });

                select.querySelectorAll(".filter-select-option").forEach(opt => {
                    opt.addEventListener("click", () => {
                        select.querySelectorAll(".filter-select-option").forEach(o => o.classList.remove("is-selected"));
                        opt.classList.add("is-selected");
                        const val = opt.dataset.value;
                        label.textContent = opt.textContent;
                        select.classList.remove("filter-select--open");
                        
                        // Trigger Logic
                        updateDerivedState(val);
                    });
                });
            });

            const subContainer = block.querySelector(".subcriteria-blocks");
            function addSubInBlock() {
                addSubcriteriaRow(subContainer);
            }
            block.querySelector(".btn-add-subcriteria").addEventListener("click", addSubInBlock);
            
            // Remove logic
            block.querySelector(".criteria-remove").addEventListener("click", () => {
                block.remove();
            });

            container.appendChild(block);
            updateCriteriaInputVisibility(); // Ensure correct fields are shown
        }

        function updateCriteriaInputVisibility() {
            const isPointing = document.getElementById("criteriaSystemPointing")?.checked;
            const weightFields = root.querySelectorAll(".criteria-weight-field");
            const criteriaSystemDescription = document.getElementById("criteriaSystemDescription");

            if (criteriaSystemDescription) {
                if (isPointing) {
                    criteriaSystemDescription.textContent = "Pointing System: Uses cumulative points from all criteria and deductions to determine the final ranking.";
                } else {
                    criteriaSystemDescription.textContent = "Averaging System: Uses judge averages and criterion weights to compute the final score.";
                }
            }
            
            weightFields.forEach(field => {
                if (isPointing) {
                    field.style.display = "none";
                    const input = field.querySelector("input");
                    if (input) input.value = ""; // Clear weight if hidden? Or keep it? 
                    // Better to not clear, just hide. But validation might fail if empty and required.
                    // The validator should ignore it if in pointing mode.
                } else {
                    field.style.display = "";
                }
            });
        }

        // Listeners for system toggle
        const sysRadios = root.querySelectorAll('input[name="criteriaSystem"]');
        sysRadios.forEach(r => r.addEventListener("change", updateCriteriaInputVisibility));
        
        // Initial call
        updateCriteriaInputVisibility();

        // Validate for Toasts (Min < 0, Max > 100)
        function validateCriteriaInputsForToast(roundEl) {
            const minInputs = roundEl.querySelectorAll(".min-point-input");
            const maxInputs = roundEl.querySelectorAll(".max-point-input");
            
            let hasMinError = false;
            let hasMaxError = false;
            let hasMinMaxOrderError = false;
            let valid = true;

            // Collect all min/max pairs in this round element
            const criteriaInputs = roundEl.querySelectorAll(".criteria-block, .subcriteria-block");

            criteriaInputs.forEach(block => {
                const minInput = block.querySelector(".min-point-input");
                const maxInput = block.querySelector(".max-point-input");

                if (minInput && maxInput) {
                    const minVal = parseFloat(minInput.value);
                    const maxVal = parseFloat(maxInput.value);

                    // Validate min >= 0
                    if (minInput.value && (minVal < 0)) {
                        hasMinError = true;
                        valid = false;
                    }

                    // Validate max <= 100
                    if (maxInput.value && (maxVal > 100)) {
                        hasMaxError = true;
                        valid = false;
                    }

                    // Validate min <= max (only if both are valid numbers)
                    if (minInput.value && maxInput.value && !isNaN(minVal) && !isNaN(maxVal) && (minVal > maxVal)) {
                        hasMinMaxOrderError = true;
                        valid = false;
                    }
                }
            });
            
            // Summary Toast Logic
            const errors = [];
            if (hasMinError) errors.push("Minimum Point must not be < 0");
            if (hasMaxError) errors.push("Maximum Point must not be > 100");
            if (hasMinMaxOrderError) errors.push("Minimum Point cannot be greater than Maximum Point");

            if (errors.length > 0) {
                if (errors.length === 1) {
                    showToast(errors[0], "error");
                } else {
                    showToast(`${errors.length} criteria value errors found. Please check Min/Max points.`, "error");
                }
            }

            return valid;
        }

        function createCriteriaRound() {
            if (!criteriaRoundsList) return;
            roundCounter++;

            const round = document.createElement("div");
            round.className = "event-round-card";
            round.innerHTML = `
                <div class="event-round-header">
                    <div class="event-round-header-left">
                        <span class="event-round-index">${roundCounter}</span>
                        <div class="event-field round-name-field">
                            <input class="event-input event-round-name" 
                                placeholder="e.g. Elimination Round" />
                        </div>
                    </div>
                    <button type="button" class="btn-danger-soft btn-small event-round-remove">
                        Remove
                    </button>
                </div>
                <div class="criteria-separator">Criteria</div>
                <div class="criteria-blocks"></div>
                <button type="button" class="btn-primary-soft btn-small btn-add-criteria" style="margin-top:16px;">
                    <i class="ri-add-line"></i> Add Criteria
                </button>
            `;

            round.querySelector(".event-round-remove").addEventListener("click", () => {
                round.remove();
                // Correctly re-index rounds
                roundCounter = criteriaRoundsList.children.length;
                Array.from(criteriaRoundsList.children).forEach((roundEl, idx) => {
                    roundEl.querySelector(".event-round-index").textContent = idx + 1;
                    const nameInput = roundEl.querySelector(".event-round-name");
                    if (nameInput && !nameInput.value) {
                        nameInput.placeholder = `Round ${idx + 1}`;
                    }
                });
            });

            criteriaRoundsList.appendChild(round);

            const criteriaContainer = round.querySelector(".criteria-blocks");
            
            // AUTOMATICALLY ADD ONE CRITERIA BLOCK
            addCriteriaBlock(criteriaContainer, roundCounter);
            
            // Updated: Validate existing criteria inputs before adding a new one
            round.querySelector(".btn-add-criteria").addEventListener("click", () => {
                if (validateCriteriaInputsForToast(round)) {
                    addCriteriaBlock(criteriaContainer, roundCounter);
                }
            });
        }

        function generateUniqueJudgePin() {
            const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
            let pin;
            do {
                pin = "";
                for (let i = 0; i < 5; i++) {
                    pin += chars[Math.floor(Math.random() * chars.length)];
                }
            } while (usedJudgePins.has(pin));
            usedJudgePins.add(pin);
            return pin;
        }

        function renumberJudges() {
            if (!judgesBody) return;
            const rows = judgesBody.querySelectorAll("tr[data-judge-row]");
            rows.forEach((tr, idx) => {
                const idCell = tr.querySelector("td:first-child");
                if (idCell) {
                    const num = idx + 1;
                    idCell.textContent = "J" + String(num).padStart(3, "0");
                }
            });
        }

        function validateJudgePins() {
            if (!judgesBody) return true;
            const rows = judgesBody.querySelectorAll("tr[data-judge-row]");
            if (!rows.length) return true;

            const missing = [];
            rows.forEach((tr, idx) => {
                const pinText = tr.querySelector(".judge-pin-value")?.textContent.trim();
                if (!pinText || pinText === "-----") {
                    missing.push(idx + 1);
                }
            });

            if (missing.length) {
                showToast("Some judges do not have generated PINs yet.", "warning");
                return false;
            }
            return true;
        }



        function validateCriteriaStep2() {
            let valid = true;
            let errorCount = 0;
            let specificJudgeErrorToast = null; 
            clearError("judges");
            const isPointing = document.getElementById("criteriaSystemPointing")?.checked;

            const rounds = criteriaRoundsList ? criteriaRoundsList.querySelectorAll(".event-round-card") : [];
            if (!rounds.length) {
                showToast("Add at least one round for criteria-based scoring.", "warning");
                return false;
            }

            rounds.forEach(round => {
                const roundNameInput = round.querySelector(".event-round-name");
                if (roundNameInput && !roundNameInput.value.trim()) {
                    showFieldErrorForInput(roundNameInput, "Required");
                    valid = false;
                    errorCount++;
                }

                const criteriaBlocks = round.querySelectorAll(".criteria-block");
                if (!criteriaBlocks.length) {
                    showToast("Each round must have at least one criteria.", "warning");
                    valid = false;
                    return; // Early return for this specific critical error
                }

                criteriaBlocks.forEach(block => {
                    const critNameInput = block.querySelector('input[placeholder="e.g. Creativity"]');
                    if (critNameInput && !critNameInput.value.trim()) {
                        showFieldErrorForInput(critNameInput, "Required");
                        valid = false;
                        errorCount++;
                    }

                    // Only validate weight if NOT pointing
                    if (!isPointing) {
                        const weightInput = block.querySelector(".event-criteria-row .criteria-weight-field input[type='number']");
                        if (weightInput && !weightInput.value.trim()) {
                            showFieldErrorForInput(weightInput, "Required");
                            valid = false;
                            errorCount++;
                        }
                    }

                    const subBlocks = block.querySelectorAll(".subcriteria-block");
                    subBlocks.forEach(sub => {
                        const subNameInput = sub.querySelector(".event-field-full input.event-input");
                        if (subNameInput && !subNameInput.value.trim()) {
                            showFieldErrorForInput(subNameInput, "Required");
                            valid = false;
                            errorCount++;
                        }
                    });
                });

                // Validate Min/Max Points using the existing function
                if (!validateCriteriaInputsForToast(round)) {
                    valid = false;
                    // Note: validateCriteriaInputsForToast handles its own toast notifications.
                    // We just need to ensure we don't proceed.
                }
            });

            const judgeRows = judgesBody ? judgesBody.querySelectorAll("tr[data-judge-row]") : [];
            if (!judgeRows.length) {
                setError("judges", "At least 1 judge required.");
                valid = false;
                errorCount++;
                specificJudgeErrorToast = "At least 1 judge is required."; 
            } else {
                const lastRow = judgeRows[judgeRows.length - 1];
                const nameInput = lastRow.querySelector(".judge-name-input");
                const emailInput = lastRow.querySelector(".judge-email-input");
                
                if (nameInput && emailInput) {
                    if (!nameInput.value.trim() || !emailInput.value.trim()) {
                        valid = false;
                        errorCount++;
                        specificJudgeErrorToast = "Please complete the last judge entry (Name & Email).";
                    }
                }
            }

            if (!isPointing) {
                rounds.forEach(round => {
                    if (!validateRoundWeight(round)) {
                        valid = false;
                        errorCount++;
                    }
                });
            }

            if (!valid) {
                if (specificJudgeErrorToast) {
                    showToast(specificJudgeErrorToast, "warning"); 
                } else if (errorCount > 0) {
                     showToast("Please fix the highlighted errors.", "warning");
                }
            }

            return valid;
        }

        function validateRoundWeight(roundEl) {
            if (document.getElementById("criteriaSystemPointing")?.checked) return true;

            // Only the "Weight (%)" inputs (now inside .criteria-weight-field)
            const weightInputs = roundEl.querySelectorAll(
                ".event-criteria-row .criteria-weight-field input[type='number']"
            );
            let total = 0;

            weightInputs.forEach(inp => {
                const raw = (inp.value || "").trim();
                if (!raw) return;
                const val = parseFloat(raw);
                if (!isNaN(val)) total += val;
            });

            // Use tolerance for floating point comparison
            return Math.abs(total - 100) < 0.1;
        }


        /* =========================================================
        * STEP 2 — ORW (OBJECTIVE RIGHT / WRONG)
        * =======================================================*/

        const orwRoundsList    = document.getElementById("orwRoundsList");
        const orwScorersBody   = document.getElementById("orwScorersBody");
        let   orwContestantIds = [];

        const scorerAssignments = new Map(); // row -> Set(contestant IDs)
        const contestantOwner   = new Map(); // contestantID -> row

        // Build the contestant ID list from Step 1 table
        function initOrwContestantsFromStep1() {
            if (!contestantsBody) return;

            const rows = contestantsBody.querySelectorAll("tr[data-contestant-row]");
            orwContestantIds = Array.from(rows)
                .map(tr => tr.querySelector("td:first-child")?.textContent.trim())
                .filter(Boolean);

            scorerAssignments.clear();
            contestantOwner.clear();
        }

        function renumberOrwRounds() {
            if (!orwRoundsList) return;
            [...orwRoundsList.children].forEach((round, idx) => {
                const indexEl   = round.querySelector(".event-round-index");
                const nameInput = round.querySelector(".event-round-name");
                if (indexEl) indexEl.textContent = idx + 1;
                if (nameInput && !nameInput.value) {
                    nameInput.placeholder = `New Round ${idx + 1}`;
                }
            });
        }



        function createOrwRound() {
            if (!orwRoundsList) return;

            const index = orwRoundsList.children.length + 1;
            const round = document.createElement("div");
            round.className = "event-round-card";

            round.innerHTML = `
                <div class="event-round-header">
                    <span class="event-round-index">${index}</span>
                    <div class="event-field event-field-full event-round-name-wrapper">
                        <label class="event-label">Round Name</label>
                        <input class="event-input event-round-name" placeholder="New Round ${index}" />
                    </div>
                    <button type="button" class="btn-danger-soft btn-small event-round-remove">Remove</button>
                </div>

                <div class="event-orw-row">
                    <div class="event-field">
                        <label class="event-label">Points per Correct <span class="required">*</span></label>
                        <input type="number" class="event-input" placeholder="e.g. 10" />
                    </div>
                    <div class="event-field">
                        <label class="event-label">Penalty per Wrong <span class="required">*</span></label>
                        <input type="number" class="event-input" placeholder="e.g. 10" />
                    </div>
                    <div class="event-field">
                        <label class="event-label">Points per Bonus <span class="required">*</span></label>
                        <input type="number" class="event-input" placeholder="e.g. 10" />
                    </div>
                    <div class="event-field">
                        <label class="event-label">Penalty per Skip <span class="required">*</span></label>
                        <input type="number" class="event-input" placeholder="e.g. 10" />
                    </div>
                    <div class="event-field">
                        <label class="event-label">Penalty per Violation <span class="required">*</span></label>
                        <input type="number" class="event-input" placeholder="e.g. 10" />
                    </div>
                </div>

            `;

            round.querySelector(".event-round-remove").addEventListener("click", () => {
                round.remove();
                renumberOrwRounds();
            });

            orwRoundsList.appendChild(round);
            renumberOrwRounds();
        }

        function renumberScorers() {
            if (!orwScorersBody) return;
            const rows = orwScorersBody.querySelectorAll("tr[data-scorer-row]");
            rows.forEach((tr, idx) => {
                const idCell = tr.querySelector("td:first-child");
                if (idCell) {
                    const num = idx + 1;
                    idCell.textContent = "S" + String(num).padStart(3, "0");
                }
            });
        }

        function validateScorerPins() {
            if (!orwScorersBody) return true;
            const rows = orwScorersBody.querySelectorAll("tr[data-scorer-row]");
            if (!rows.length) return true;

            const missing = [];
            rows.forEach((tr, idx) => {
                const pinText = tr.querySelector(".scorer-pin-value")?.textContent.trim();
                if (!pinText || pinText === "-----") {
                    missing.push(idx + 1);
                }
            });

            if (missing.length) {
                showToast("Some scorers do not have generated PINs yet.", "warning");
                return false;
            }
            return true;
        }

        // Rebuilds dropdown options when a chip is removed
        function rebuildTokenDropdowns() {
            if (!orwScorersBody) return;
            orwScorersBody.querySelectorAll("tr[data-scorer-row]").forEach(row => {
                const selector = row.querySelector(".token-select");
                if (!selector) return;
                const dropdown = selector.querySelector(".token-select-dropdown");
                const input    = selector.querySelector(".token-select-input");
                if (!dropdown || !input) return;

                if (!dropdown.classList.contains("is-open")) return;

                dropdown.innerHTML = "";
                const search = input.value.trim().toLowerCase();

                orwContestantIds.forEach(id => {
                    const owner = contestantOwner.get(id);
                    if (owner && owner !== row) return;
                    if (!id.toLowerCase().includes(search)) return;

                    const opt = document.createElement("div");
                    opt.className = "token-select-option";
                    opt.textContent = id;
                    opt.addEventListener("click", () => {
                        // actual assignment happens in wireTokenSelect
                        input.value = "";
                        dropdown.classList.remove("is-open");
                    });

                    dropdown.appendChild(opt);
                });
            });
        }

        // Chip renderer for C001 ×, C002 × ...
        function createChip(id, onRemove) {
            const chip = document.createElement("span");
            chip.className = "token-select-chip";
            chip.innerHTML = `
                ${id}
                <span class="token-select-chip-remove">×</span>
            `;

            const removeBtn = chip.querySelector(".token-select-chip-remove");
            if (removeBtn) {
                removeBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    onRemove(id);
                });
            }

            return chip;
        }

        // Wiring for the multi-select "Assigned contestant/s by ID"
        function wireTokenSelect(row) {
            const container  = row.querySelector(".token-select");
            const chipsEl    = row.querySelector(".token-select-chips");
            const inputEl    = row.querySelector(".token-select-input");
            const dropdownEl = row.querySelector(".token-select-dropdown");

            if (!container || !chipsEl || !inputEl || !dropdownEl) return;

            function refreshChips() {
                chipsEl.innerHTML = "";
                const assigned = scorerAssignments.get(row) || new Set();
                assigned.forEach(id => {
                    chipsEl.appendChild(createChip(id, removeAssignment));
                });
            }

            function removeAssignment(id) {
                const assigned = scorerAssignments.get(row);
                if (!assigned) return;
                assigned.delete(id);
                if (contestantOwner.get(id) === row) {
                    contestantOwner.delete(id);
                }
                refreshChips();
                rebuildTokenDropdowns();
            }

            function addAssignment(id) {
                const nameInput = row.querySelector(".scorer-name-input");
                if (!nameInput || !nameInput.value.trim()) {
                    showToast("Please enter scorer name first.", "warning");
                    return;
                }

                let assigned = scorerAssignments.get(row);
                if (!assigned) {
                    assigned = new Set();
                    scorerAssignments.set(row, assigned);
                }

                const existingOwner = contestantOwner.get(id);
                if (existingOwner && existingOwner !== row) {
                    const otherSet = scorerAssignments.get(existingOwner);
                    if (otherSet) otherSet.delete(id);
                }

                assigned.add(id);
                contestantOwner.set(id, row);

                refreshChips();
                rebuildTokenDropdowns();
            }

            function filterOptions(search) {
                dropdownEl.innerHTML = "";

                orwContestantIds.forEach(id => {
                    const owner = contestantOwner.get(id);
                    if (owner && owner !== row) return;
                    if (!id.toLowerCase().includes(search.toLowerCase())) return;

                    const opt = document.createElement("div");
                    opt.className = "token-select-option";
                    opt.textContent = id;
                    opt.addEventListener("click", () => {
                        addAssignment(id);
                        inputEl.value = "";
                        dropdownEl.classList.remove("is-open");
                    });
                    dropdownEl.appendChild(opt);
                });

                dropdownEl.classList.add("is-open");
            }

            inputEl.addEventListener("input", () => {
                filterOptions(inputEl.value.trim());
            });

            container.addEventListener("click", (e) => {
                e.stopPropagation();
                inputEl.focus();
                filterOptions("");
            });

            document.addEventListener("click", (e) => {
                if (!container.contains(e.target)) {
                    dropdownEl.classList.remove("is-open");
                }
            });

            scorerAssignments.set(row, new Set());
            refreshChips();
        }

        function addOrwScorerRow() {
            if (!orwScorersBody) return;

            const tr = document.createElement("tr");
            tr.dataset.scorerRow = "true";

            tr.innerHTML = `
                <td></td>
                <td>
                    <input class="event-input event-input-cell scorer-name-input"
                        placeholder="e.g. Mr. John Doe" />
                </td>
                <td>
                    <div class="token-select" data-role="scorer-assigned">
                        <div class="token-select-chips"></div>
                        <input type="text"
                            class="token-select-input"
                            placeholder="Search contestant ID..." />
                        <div class="token-select-dropdown"></div>
                    </div>
                </td>
                <td class="judges-pin-cell">
                    <span class="judge-pin-badge scorer-pin-value">-----</span>
                </td>
                <td class="judges-actions-cell">
                    <button type="button" class="btn-outline btn-small" data-generate-pin>Generate</button>
                    <button type="button" class="btn-danger-soft btn-small" data-remove-scorer>Remove</button>
                </td>
            `;

            scorerAssignments.set(tr, new Set());

            const pinSpan = tr.querySelector(".scorer-pin-value");

            tr.querySelector("[data-generate-pin]").addEventListener("click", () => {
                const nameInput = tr.querySelector(".scorer-name-input");
                const assigned  = scorerAssignments.get(tr) || new Set();

                if (!nameInput || !nameInput.value.trim()) {
                    showToast("Enter scorer name before generating a PIN.", "warning");
                    return;
                }
                if (!assigned || assigned.size === 0) {
                    showToast("Assign contestants to scorer before generating a PIN.", "warning");
                    return;
                }

                const newPin = generateUniqueJudgePin();
                pinSpan.textContent = newPin;
            });

            tr.querySelector("[data-remove-scorer]").addEventListener("click", () => {
                const set = scorerAssignments.get(tr);
                if (set) {
                    set.forEach(id => {
                        if (contestantOwner.get(id) === tr) {
                            contestantOwner.delete(id);
                        }
                    });
                }
                scorerAssignments.delete(tr);
                tr.remove();
                renumberScorers();
                updateEmptyState(orwScorersBody, "No scorers added yet.");
            });

            wireTokenSelect(tr);
            orwScorersBody.appendChild(tr);
            renumberScorers();
            updateEmptyState(orwScorersBody, "No scorers added yet.");
        }

        function validateOrwStep2() {
            let valid = true;
            let errorCount = 0;
            clearError("scorers");

            const rounds = orwRoundsList ? orwRoundsList.querySelectorAll(".event-round-card") : [];
            if (!rounds.length) {
                showToast("Add at least one ORW round.", "warning");
                return false;
            }

            rounds.forEach(round => {
                const roundNameInput = round.querySelector(".event-round-name");
                if (roundNameInput && !roundNameInput.value.trim()) {
                    showFieldErrorForInput(roundNameInput, "Required");
                    valid = false;
                    errorCount++;
                }

                const inputs = round.querySelectorAll(".event-orw-row input");
                inputs.forEach(inp => {
                    if (!inp.value.trim()) {
                        showFieldErrorForInput(inp, "Required");
                        valid = false;
                        errorCount++;
                    }
                });
            });

            const scorerRows = orwScorersBody ? orwScorersBody.querySelectorAll("tr[data-scorer-row]") : [];
            if (!scorerRows.length) {
                setError("scorers", "At least 1 scorer required.");
                valid = false;
                errorCount++;
            }

            scorerRows.forEach(row => {
                const nameInput = row.querySelector(".scorer-name-input");
                const assigned  = scorerAssignments.get(row);

                if (nameInput && !nameInput.value.trim()) {
                    showFieldErrorForInput(nameInput, "Required");
                    valid = false;
                    errorCount++;
                }

                if (!assigned || assigned.size === 0) {
                    const tokenInput = row.querySelector(".token-select-input");
                    if (tokenInput) {
                        showFieldErrorForInput(tokenInput, "Assign at least one contestant");
                    }
                    valid = false;
                    errorCount++;
                }
            });

            if (orwContestantIds.length) {
                const missing = orwContestantIds.filter(id => !contestantOwner.has(id));
                if (missing.length) {
                    showToast("Some contestants are still not assigned to any scorer.", "warning");
                    valid = false;
                    // This is a global error, so we show it specifically or count it
                    // Let's just return false here so the toast is seen immediately as it's critical
                    return false; 
                }
            }

            if (!valid) {
                 if (errorCount > 0) {
                     showToast(`${errorCount} errors found. Please check highlighted fields.`, "warning");
                 }
            }

            return valid;
        }

        /* =========================================================
        * STEP 2 INITIALIZERS (BUILD CRITERIA vs ORW)
        * =======================================================*/

        function buildCriteriaStep2() {
            if (criteriaStep2) criteriaStep2.style.display = "";
            if (orwStep2)      orwStep2.style.display      = "none";

            if (criteriaRoundsList && criteriaRoundsList.children.length === 0) {
                createCriteriaRound();
            }
            if (judgesBody && judgesBody.children.length === 0) {
                addJudgeRow();
            }
        }

        function buildOrwStep2() {
            if (!orwRoundsList || !orwScorersBody) return;

            if (criteriaStep2) criteriaStep2.style.display = "none";
            if (orwStep2)      orwStep2.style.display      = "";

            initOrwContestantsFromStep1();

            if (orwRoundsList.children.length === 0) {
                createOrwRound();
            }
            if (!orwScorersBody.querySelector("tr[data-scorer-row]")) {
                addOrwScorerRow();
            }

            updateEmptyState(orwScorersBody, "No scorers added yet.");
        }

        // Validate round inputs (Min/Max)
        function validateRoundInputs(roundEl) {
            const minInputs = roundEl.querySelectorAll(".min-point-input");
            const maxInputs = roundEl.querySelectorAll(".max-point-input");
            let valid = true;

            minInputs.forEach(input => {
                const val = parseFloat(input.value);
                if (input.value && (val < 0)) {
                    showFieldErrorForInput(input, "Min >= 0");
                    valid = false;
                }
            });

            maxInputs.forEach(input => {
                const val = parseFloat(input.value);
                if (input.value && (val > 100)) {
                    showFieldErrorForInput(input, "Max <= 100");
                    valid = false;
                }
            });

            return valid;
        }

        document.getElementById("btnAddCriteriaRound")?.addEventListener("click", () => {
            const rounds = criteriaRoundsList.querySelectorAll(".event-round-card");
            if (rounds.length > 0) {
                const lastRound = rounds[rounds.length - 1];

                // Only check weights for Add Round (as per new instruction to move Min/Max to Add Criteria)
                if (!validateRoundWeight(lastRound)) {
                    showToast("Fix your criteria weights — total must be exactly 100% before adding another round.", "error");
                    return;
                }
            }
            createCriteriaRound();
        });

        // Judge Logic
        function addJudgeRow() {
            if (!judgesBody) return;
            const tr = document.createElement("tr");
            tr.dataset.judgeRow = "true";

            tr.innerHTML = `
                <td></td>
                <td>
                    <input class="event-input event-input-cell judge-name-input" placeholder="e.g. Dr. Smith" />
                </td>
                <td>
                    <input class="event-input event-input-cell judge-email-input" placeholder="name@example.com" />
                </td>
                <td class="judges-pin-cell">
                    <span class="judge-pin-badge judge-pin-value">-----</span>
                </td>
                <td class="judges-actions-cell">
                    <button type="button" class="btn-outline btn-small" data-generate-pin>Generate</button>
                    <button type="button" class="btn-danger-soft btn-small" data-remove-judge>Remove</button>
                </td>
            `;

            const pinSpan = tr.querySelector(".judge-pin-value");

            tr.querySelector("[data-generate-pin]").addEventListener("click", () => {
                const nameInput = tr.querySelector(".judge-name-input");
                const emailInput = tr.querySelector(".judge-email-input");

                if (!nameInput.value.trim()) {
                    showToast("Enter judge name before generating a PIN.", "warning");
                    return;
                }
                
                const email = emailInput.value.trim();
                if (!email) {
                    showToast("Enter judge email before generating a PIN.", "warning");
                    return;
                }

                // Strict Email Regex Check
                if (!isValidEmail(email)) {
                     showToast("Invalid email format.", "error");
                     // Removed redundant showFieldErrorForInput
                     return;
                }

                const newPin = generateUniqueJudgePin();
                pinSpan.textContent = newPin;
            });

            tr.querySelector("[data-remove-judge]").addEventListener("click", () => {
                const currentPin = pinSpan.textContent.trim();
                if (currentPin && currentPin !== "-----") {
                    usedJudgePins.delete(currentPin);
                }
                tr.remove();
                renumberJudges();
                updateEmptyState(judgesBody, "No judges added yet.");
            });

            judgesBody.appendChild(tr);
            renumberJudges();
            updateEmptyState(judgesBody, "No judges added yet.");
        }
        
        document.getElementById("btnAddJudge")?.addEventListener("click", () => {
            const rows = judgesBody.querySelectorAll("tr[data-judge-row]");

            // 1. Validate Last Row
            if (rows.length > 0) {
                const lastRow = rows[rows.length - 1];
                const nameVal = lastRow.querySelector(".judge-name-input")?.value.trim();
                const emailVal = lastRow.querySelector(".judge-email-input")?.value.trim();
                const pinVal = lastRow.querySelector(".judge-pin-value")?.textContent.trim();

                let hasError = false;
                if (!nameVal) {
                    showToast("Judge Name is required", "error");
                    hasError = true;
                }
                if (!emailVal) {
                    showToast("Judge Email is required", "error");
                    hasError = true;
                }
                if (!pinVal || pinVal === "-----") {
                    showToast("Please generate a PIN before adding", "error");
                    hasError = true;
                }

                if (hasError) return;
            }

            // Duplicate Check
            const emails = new Set();
            let duplicateFound = false;

            rows.forEach(row => {
                const emailInput = row.querySelector(".judge-email-input");
                if (emailInput && emailInput.value.trim()) {
                    const email = emailInput.value.trim().toLowerCase();
                    if (emails.has(email)) {
                        duplicateFound = true;
                        // Removed redundant showFieldErrorForInput
                    }
                    emails.add(email);
                }
            });

            if (duplicateFound) {
                showToast("Duplicate email addresses found in the list.", "error");
                return;
            }

            addJudgeRow();
        });



        document.getElementById("btnAddOrwRound")?.addEventListener("click", createOrwRound);
        document.getElementById("btnAddScorer")?.addEventListener("click", addOrwScorerRow);

        /* =========================================================
        * RANK CONFIGURATION MODAL
        * =======================================================*/

        const rankModal = document.getElementById("rankConfigModal");
        const rankList  = document.getElementById("rankList");

        function openRankModal() {
            if (!rankModal || !rankList) return;

            rankModal.classList.add("is-open");
            rankList.innerHTML = "";
            addRankRow();

            const addBtn = document.getElementById("btnAddRankRow");
            if (addBtn) {
                const newBtn = addBtn.cloneNode(true);
                addBtn.replaceWith(newBtn);
                newBtn.addEventListener("click", addRankRow);
            }
        }

        function closeRankModal() {
            if (!rankModal) return;
            rankModal.classList.remove("is-open");
        }

        function renumberRankRows() {
            const rows = rankList.querySelectorAll(".rank-row");
            rows.forEach((r, i) => {
                const label = r.querySelector(".rank-name");
                const idx   = i + 1;
                label.textContent = `${rankEmoji(idx)}${numberToWords(idx)}`;
            });
        }

        function addRankRow() {
            if (!rankList) return;

            const index = rankList.children.length + 1;
            const row   = document.createElement("div");
            row.className = "rank-row";

            row.innerHTML = `
                <div class="rank-name">
                    ${rankEmoji(index)}${numberToWords(index)}
                </div>
                <input type="number" class="event-input rank-points-input" placeholder="Points" />
                <button type="button" class="rank-remove rank-remove-btn">×</button>
            `;

            row.querySelector(".rank-remove-btn").addEventListener("click", () => {
                row.remove();
                renumberRankRows();
            });

            rankList.appendChild(row);
        }

        // attach openers
        root.querySelectorAll(".rank-config-btn").forEach(btn => {
            btn.addEventListener("click", openRankModal);
        });

        // close handlers
        if (rankModal) {
            rankModal.querySelectorAll("[data-rank-cancel], .modal-close-x").forEach(b => {
                b.addEventListener("click", closeRankModal);
            });
            rankModal.addEventListener("click", e => {
                if (e.target === rankModal) closeRankModal();
            });
        }

        const rankSaveBtn = document.querySelector("[data-rank-save]");
        if (rankSaveBtn) {
            rankSaveBtn.addEventListener("click", () => {
                const ranks = [];
                rankList.querySelectorAll(".rank-row").forEach(row => {
                    const name   = row.querySelector(".rank-name")?.textContent.trim();
                    const points = row.querySelector(".rank-points-input")?.value;
                    if (name && points) {
                        ranks.push({ name, points: Number(points) });
                    }
                });
                console.log("Saved ranks:", ranks);
                closeRankModal();
            });
        }

        if (rankModal) {
            rankModal.classList.remove("is-open");
        }


    /* =========================================================
     * STEP 3 – THEME + HEADER + PREVIEW
     * =======================================================*/

    const previewHeader      = document.getElementById("previewHeader");
    const themeOptions       = document.querySelectorAll(".theme-preset-option");
    const customColorInput   = document.getElementById("eventThemeCustom");
    const headerImgInput     = document.getElementById("eventHeaderImage");
    const headerFileNameSpan = document.getElementById("headerFileName");
    const headerUploadText   = document.querySelector(".header-upload-btn");
    const removeHeaderBtn    = document.getElementById("removeHeaderImage");
    if (removeHeaderBtn) removeHeaderBtn.style.display = "none";

    let hasHeaderImage = false;

    function applyPreviewColor(color) {
        eventThemeColor = color;
        if (!hasHeaderImage && previewHeader) {
            previewHeader.style.backgroundImage = "none";
            previewHeader.style.backgroundColor = color || "#e5e7eb";
        }
    }

    // Clear default theme selection
    themeOptions.forEach(opt => {
        opt.classList.remove("is-selected");
        opt.querySelector(".theme-label")?.classList.remove("is-selected");
    });

    // Theme presets
    themeOptions.forEach(option => {
        option.addEventListener("click", () => {
            themeOptions.forEach(opt => {
                opt.classList.remove("is-selected");
                opt.querySelector(".theme-label")?.classList.remove("is-selected");
            });

            option.classList.add("is-selected");
            option.querySelector(".theme-label")?.classList.add("is-selected");

            const labelEl = option.querySelector(".theme-label");
            window.selectedThemeName = labelEl ? labelEl.textContent.trim() : "Custom";

            const color = option.dataset.color;
            if (color === "custom") {
                customColorInput.click();
            } else {
                applyPreviewColor(color);
                saveEventData();
            }
        });
    });

    customColorInput.addEventListener("input", e => {
        applyPreviewColor(e.target.value);
        window.selectedThemeName = "Custom color";

        const customBtn = document.querySelector('.theme-preset-option[data-color="custom"]');
        if (customBtn) {
            themeOptions.forEach(opt => opt.classList.remove("is-selected"));
            customBtn.classList.add("is-selected");
            customBtn.querySelector(".theme-label")?.classList.add("is-selected");
        }
        saveEventData();
    });

    headerImgInput?.addEventListener("change", async () => {
        const file = headerImgInput.files[0];

        if (file) {
            hasHeaderImage = true;
            
            // 1. Immediate Preview (UX)
            const reader = new FileReader();
            reader.onload = e => {
                previewHeader.style.backgroundImage = `url(${e.target.result})`;
                previewHeader.style.backgroundSize = "cover";
                previewHeader.style.backgroundPosition = "center";
                previewHeader.style.backgroundColor = "transparent";
            };
            reader.readAsDataURL(file);

            // 2. Upload to Server
            const formData = new FormData();
            formData.append("file", file);

             // Update text to "Uploading..."
            headerUploadText.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                    node.textContent = " Uploading...";
                }
            });
            
            try {
                const response = await fetch("/Events/UploadImage", {
                    method: "POST",
                    body: formData
                });
                const data = await response.json();

                if (data.success) {
                    // Success: Store SERVER filename
                    window.selectedHeaderImageFileName = "/uploads/" + data.fileName;
                    headerFileNameSpan.textContent = file.name; // Show user-friendly name
                    removeHeaderBtn.style.display = "inline-block";

                    // Update text to "Change photo"
                    headerUploadText.childNodes.forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                            node.textContent = " Change photo";
                        }
                    });
                    saveEventData();
                } else {
                    showToast("Image upload failed: " + data.message, "error");
                    hasHeaderImage = false;
                     // Restore text
                    headerUploadText.childNodes.forEach(node => {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                            node.textContent = " Choose photo";
                        }
                    });
                }

            } catch (err) {
                console.error(err);
                showToast("Error uploading image.", "error");
                hasHeaderImage = false;
            }

        } else {
            // Reset
            hasHeaderImage = false;
            window.selectedHeaderImageFileName = "";
            headerFileNameSpan.textContent = "";
            
            // Restore text: "Choose photo"
            headerUploadText.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                    node.textContent = " Choose photo";
                }
            });

            removeHeaderBtn.style.display = "none";

            previewHeader.style.backgroundImage = "none";
            previewHeader.style.backgroundColor = eventThemeColor || "#e5e7eb";
            saveEventData();
        }
    });

    removeHeaderBtn?.addEventListener("click", () => {
        headerImgInput.value = ""; // Clear input value
        hasHeaderImage = false;
        window.selectedHeaderImageFileName = "";
        headerFileNameSpan.textContent = "";
        
        // Restore text: "Choose photo"
        headerUploadText.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                node.textContent = " Choose photo";
            }
        });

        removeHeaderBtn.style.display = "none";

        previewHeader.style.backgroundImage = "none";
        previewHeader.style.backgroundColor = eventThemeColor || "#e5e7eb";
        saveEventData();
    });

    if (window.selectedHeaderImageFileName) {
        headerFileNameSpan.textContent = window.selectedHeaderImageFileName;
        // Update text to "Change photo" on load
        headerUploadText.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
                node.textContent = " Change photo";
            }
        });
        removeHeaderBtn.style.display = "inline-block";
    } else {
        removeHeaderBtn.style.display = "none";
    }

    applyPreviewColor(null);

    /* =========================================================
        * STEP 4 – POPULATE REVIEW PAGE
        * =======================================================*/

        function populateReview() {
            const data = getEventData();

            // small helper to write into inputs or plain elements
            function setVal(id, value) {
                const el = document.getElementById(id);
                if (!el) return;

                const v = value ?? "";
                if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
                    el.value = v;
                } else {
                    el.textContent = v;
                }
            }

            // ---------- Event details ----------

            const startText = formatDateTime(data.eventStartDate, data.eventStartTime);
            // const endText   = formatDateTime(data.eventEndDate, data.eventEndTime);

            const typeText = data.eventType === "criteria"
                ? "Criteria Based"
                : "Objective Based";

            setVal("reviewEventName",        data.eventName || "");
            setVal("reviewEventVenue",       data.eventVenue || "");
            setVal("reviewEventDescription", data.eventDescription || "No description");
            setVal("reviewEventStart",       startText);

            setVal("reviewEventType",        typeText);

            // ---------- Contestants (ID + Photo + Name + Organization) ----------

            const contestantsBody = document.getElementById("contestantsBody");
            const reviewBody      = document.getElementById("reviewContestantsBody");
            let contestantCount   = 0;

            if (contestantsBody && reviewBody) {
                reviewBody.innerHTML = "";

                const rows = contestantsBody.querySelectorAll("tr[data-contestant-row]");

                rows.forEach(row => {
                    const idCell     = row.querySelector("td:first-child");
                    const nameInput  = row.querySelector(".contestant-name-input");
                    const orgInput   = row.querySelector(".contestant-org-input");
                    const photoThumb = row.querySelector("[data-photo-preview]");

                    if (!nameInput || !nameInput.value.trim()) return;

                    const idText   = idCell ? idCell.textContent.trim() : "";
                    const nameText = nameInput.value.trim();
                    const orgText  = orgInput ? orgInput.value.trim() : "";
                    const photoUrl = (photoThumb && photoThumb.dataset.photoUrl) || "";

                    contestantCount++;

                    const photoHtml = photoUrl
                        ? `<div class="review-contestant-photo-thumb" style="background-image:url('${photoUrl}');"></div>`
                        : "—";

                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${idText}</td>
                        <td class="review-contestant-photo-cell">${photoHtml}</td>
                        <td>${nameText}</td>
                        <td>${orgText}</td>
                    `;
                    reviewBody.appendChild(tr);
                });

                if (!reviewBody.children.length) {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `<td colspan="4">No contestants added yet.</td>`;
                    reviewBody.appendChild(tr);
                }
            }

            setVal(
                "reviewContestantCount",
                contestantCount === 1
                    ? "1 contestant"
                    : `${contestantCount} contestants`
            );

            // ----- Rounds & scoring -----
                const roundsContainer = document.getElementById("reviewRoundsContainer");

                if (roundsContainer) {
                    roundsContainer.innerHTML = "";

                    // CRITERIA-BASED REVIEW
                    if (data.eventType === "criteria") {
                        // Use data from getEventData() which has the correct -1 logic
                        const roundsData = data.criteriaRounds || [];

                        if (roundsData.length > 0) {
                            roundsData.forEach((round, index) => {
                                const roundName = round.roundName || `Round ${index + 1}`;

                                const card = document.createElement("div");
                                card.className = "event-round-card";
                                card.innerHTML = `
                                    <div class="event-round-header">${roundName}</div>
                                `;

                                const table = document.createElement("table");
                                table.className = "app-table review-round-criteria-table";
                                table.innerHTML = `
                                    <thead>
                                        <tr>
                                            <th style="width:40%;">Criteria</th>
                                            <th style="width:20%;">Weight (%)</th>
                                            <th style="width:20%;">Minimum Points</th>
                                            <th style="width:20%;">Maximum Points</th>
                                        </tr>
                                    </thead>
                                    <tbody></tbody>
                                `;

                                const tbody = table.querySelector("tbody");

                                if (round.criteria) {
                                    round.criteria.forEach(c => {
                                        const minTxt = c.minPoints === -1 ? "N/A" : c.minPoints;
                                        const maxTxt = c.maxPoints === -1 ? "N/A" : c.maxPoints;

                                        const tr = document.createElement("tr");
                                        tr.innerHTML = `
                                            <td>${c.name}</td>
                                            <td>${c.weight}</td>
                                            <td>${minTxt}</td>
                                            <td>${maxTxt}</td>
                                        `;
                                        tbody.appendChild(tr);
                                    });
                                }

                                card.appendChild(table);
                                roundsContainer.appendChild(card);
                            });
                        } else {
                            roundsContainer.innerHTML =
                                "<p style='font-size:13px; color:#6b7280;'>No rounds added yet.</p>";
                        }
                    }

                    // ORW REVIEW (unchanged)
                    else {
                        const orwRounds = document.querySelectorAll("#orwRoundsList .event-round-card");

                        orwRounds.forEach((round, index) => {
                            const nameInput = round.querySelector(".event-round-name");
                            const roundName = (nameInput && nameInput.value.trim())
                                ? nameInput.value.trim()
                                : `Round ${index + 1}`;

                            const inputs = round.querySelectorAll(".event-orw-row input");
                            const [ptCorrect, ptWrong, ptBonus, penSkip, penViolation] = inputs;

                            const card = document.createElement("div");
                            card.className = "event-round-card";
                            card.innerHTML = `
                                <div class="event-round-header">${roundName}</div>
                                <div class="scoring-row">
                                    <div class="scoring-col">
                                        <label class="event-label">Points per Correct</label>
                                        <input type="text" class="event-input" readonly value="${ptCorrect?.value || ""}">
                                    </div>
                                    <div class="scoring-col">
                                        <label class="event-label">Penalty per Wrong</label>
                                        <input type="text" class="event-input" readonly value="${ptWrong?.value || ""}">
                                    </div>
                                    <div class="scoring-col">
                                        <label class="event-label">Points per Bonus</label>
                                        <input type="text" class="event-input" readonly value="${ptBonus?.value || ""}">
                                    </div>
                                    <div class="scoring-col">
                                        <label class="event-label">Penalty per Skip</label>
                                        <input type="text" class="event-input" readonly value="${penSkip?.value || ""}">
                                    </div>
                                    <div class="scoring-col">
                                        <label class="event-label">Penalty per Violation</label>
                                        <input type="text" class="event-input" readonly value="${penViolation?.value || ""}">
                                    </div>
                                </div>
                            `;
                            roundsContainer.appendChild(card);
                        });
                    }
                }


            // ---------- Tie-breakers (removed) ----------

            // ---------- Judges / Scorers ----------

            const peopleTitleEl     = document.getElementById("reviewPeopleTitle");
            const middleHeaderEl    = document.getElementById("reviewPeopleMiddleHeader");
            const primaryCountEl    = document.getElementById("reviewPrimaryRoleCount");
            const reviewScorersBody = document.getElementById("reviewScorersBody");

            let primaryCount = 0;

            if (reviewScorersBody) {
                reviewScorersBody.innerHTML = "";

                if (data.eventType === "criteria") {
                    if (peopleTitleEl)  peopleTitleEl.textContent  = "Judges";
                    if (middleHeaderEl) middleHeaderEl.textContent = "Email";

                    if (judgesBody) {
                        const rows = judgesBody.querySelectorAll("tr[data-judge-row]");
                        rows.forEach(row => {
                            const idCell     = row.querySelector("td:first-child");
                            // FIX: Use classes instead of placeholders
                            const nameInput  = row.querySelector(".judge-name-input");
                            const emailInput = row.querySelector(".judge-email-input");
                            const pinSpan    = row.querySelector(".judge-pin-value");

                            const tr = document.createElement("tr");
                            tr.innerHTML = `
                                <td>${idCell ? idCell.textContent.trim() : ""}</td>
                                <td>${nameInput ? nameInput.value.trim() : ""}</td>
                                <td>${emailInput ? emailInput.value.trim() : ""}</td>
                                <td>${pinSpan ? pinSpan.textContent.trim() : ""}</td>
                            `;
                            reviewScorersBody.appendChild(tr);
                            primaryCount++;
                        });
                    }
                } else {
                    if (peopleTitleEl)  peopleTitleEl.textContent  = "Scorers";
                    if (middleHeaderEl) middleHeaderEl.textContent = "Assigned Contestant/s by ID";

                    const scorersBody = document.getElementById("orwScorersBody");
                    if (scorersBody) {
                        const rows = scorersBody.querySelectorAll("tr[data-scorer-row]");
                        rows.forEach(row => {
                            const idCell    = row.querySelector("td:first-child");
                            const nameInput = row.querySelector(".scorer-name-input");
                            const pinSpan   = row.querySelector(".scorer-pin-value");

                            const assigned = scorerAssignments.get(row) || new Set();
                            const assignedText = Array.from(assigned).join(", ");

                            const tr = document.createElement("tr");
                            tr.innerHTML = `
                                <td>${idCell ? idCell.textContent.trim() : ""}</td>
                                <td>${nameInput ? nameInput.value.trim() : ""}</td>
                                <td>${assignedText || "—"}</td>
                                <td>${pinSpan ? pinSpan.textContent.trim() : ""}</td>
                            `;
                            reviewScorersBody.appendChild(tr);
                            primaryCount++;
                        });
                    }
                }
            }

            if (primaryCountEl) {
                primaryCountEl.textContent = String(primaryCount);
            }

            // ---------- Preferences & Preview ----------

            const selectedThemeBtn = root.querySelector(".theme-preset-option.is-selected");
            const themeName = selectedThemeBtn
                ? (selectedThemeBtn.querySelector(".theme-label")?.textContent.trim() || "Custom")
                : "Tallify Pink";

            setVal("reviewThemePreset", themeName);
            setVal("reviewHeaderFile", data.selectedHeaderFileName || "None");
            
            // Access Code & Label
            setVal("reviewAccessCode", data.accessCode);
            const reviewCodeLabel = document.getElementById("reviewAccessCodeLabel");
            if (reviewCodeLabel) {
                reviewCodeLabel.textContent = data.eventType === "criteria" 
                    ? "Access Code for Judges" 
                    : "Access Code for Scorers";
            }

            // ----- Preview card (header + title + chips) -----
            const reviewPreview = document.getElementById("reviewPreviewCard");
            if (reviewPreview) {
                const headerEl     = document.getElementById("reviewPreviewHeader");
                const titleEl      = document.getElementById("reviewPreviewEventName");
                const typeChipEl   = document.getElementById("reviewPreviewTypeChip");
                const statusChipEl = document.getElementById("reviewPreviewStatusChip");

                // Event name
                if (titleEl) {
                    titleEl.textContent = data.eventName || "Untitled event";
                }

                // Event type chip (CB / ORW)
                if (typeChipEl) {
                    const isCriteria = data.eventType === "criteria";
                    typeChipEl.textContent = isCriteria ? "CB" : "ORW";

                    typeChipEl.classList.toggle("preview-chip--criteria", isCriteria);
                    typeChipEl.classList.toggle("preview-chip--orw", !isCriteria);
                }

                // Status chip
                if (statusChipEl) {
                    statusChipEl.textContent = "Preparing";
                }

                // Copy header color/image from step 3 preview
                const step3Header = document.getElementById("previewHeader");
                if (headerEl && step3Header) {
                    const s = getComputedStyle(step3Header);

                    headerEl.style.backgroundImage    = s.backgroundImage;
                    headerEl.style.backgroundColor    = s.backgroundColor;
                    headerEl.style.backgroundSize     = s.backgroundSize;
                    headerEl.style.backgroundPosition = s.backgroundPosition;
                    headerEl.style.backgroundRepeat   = s.backgroundRepeat;
                }
            }

        }

    /* =========================================================
     * NAVIGATION – NEXT / BACK / PUBLISH
     * =======================================================*/

    let shouldSendInvites = false; // New global flag

    async function nextStep() {
        try {
            clearAllErrors();

            if (currentStep === 1) {
                if (!validateStep1()) return;

                const eventType = getSelectedEventType();
                if (eventType === "criteria") {
                    buildCriteriaStep2();
                } else {
                    buildOrwStep2();
                }
                currentStep = 2;
            }
            else if (currentStep === 2) {
                const eventType = getSelectedEventType();

                if (eventType === "criteria") {
                    if (!validateCriteriaStep2() || !validateJudgePins()) return;
                } else {
                    if (!validateOrwStep2() || !validateScorerPins()) return;
                }

                // Show Verification Info Modal instead of proceeding immediately
                const modalEl = document.getElementById('verificationInfoModal');
                if (modalEl) {
                    // Dynamic Text Update
                    const modalText = document.getElementById('verificationModalText');
                    if (modalText) {
                        if (window.currentEventId && window.currentEventId > 0) {
                            modalText.textContent = "The verification email will be sent to those who haven't verified their emails yet upon saving.";
                        } else {
                            modalText.textContent = "The verification email will be sent to the email of the judges to verify their email when you publish the event.";
                        }
                    }

                    const modal = new bootstrap.Modal(modalEl);
                    modal.show();
                    return; // Stop here, wait for modal interaction
                }
                
                currentStep = 3;
            }
            else if (currentStep === 3) {
                // --------------------------
                // STEP 3 VALIDATION
                // --------------------------
                let hasError = false;

                // 1. Check Access Code
                const accessCodeInput = document.getElementById("eventAccessCode");
                const accessCode = accessCodeInput ? accessCodeInput.value.trim() : "";
                
                if (!accessCode) {
                    showToast("Access Code is required", "error");
                    hasError = true;
                } else {
                    // 2. Check Uniqueness via AJAX
                    try {
                        const existingIdEl = document.getElementById("existingEventId");
                        const excludeId = existingIdEl ? existingIdEl.value : "";
                        
                        // Disable button while checking
                        if (btnNext) {
                            btnNext.disabled = true; 
                            btnNext.textContent = "Checking...";
                        }

                        const resp = await fetch(`/Events/CheckAccessCode?code=${encodeURIComponent(accessCode)}&excludeEventId=${excludeId}`);
                        const result = await resp.json();

                        if (!result.unique) {
                             showToast("Access Code is already taken", "error");
                             hasError = true;
                        }

                    } catch (err) {
                        console.error("Uniqueness check failed", err);
                        showToast("Failed to verify access code uniqueness. Please try again.", "warning");
                        hasError = true;
                    } finally {
                        // Restore button text
                        if (btnNext) {
                            btnNext.disabled = false;
                            btnNext.textContent = "Review";
                        }
                    }
                }

                // 3. Check Theme
                const selectedTheme = document.querySelector(".theme-preset-option.is-selected");
                if (!selectedTheme) {
                    showToast("Please select a Theme Preset", "error");
                    hasError = true;
                }

                if (hasError) return;

                // If all good, proceed
                currentStep = 4;
                populateReview();
                showStep(currentStep);
                updateStepUI(currentStep);
                return;
            }
            else if (currentStep === 4) {
                if (typeof createEventAndSave === "function") {
                    createEventAndSave();
                }
                return;
            }

            showStep(currentStep);
            updateStepUI(currentStep);
        } catch (error) {
            console.error("Error in nextStep:", error);
            showToast("An unexpected error occurred. Please check the console.", "error");
        }
    }

    function prevStep() {
        clearAllErrors();

        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
            updateStepUI(currentStep);
        } else {
            showToast("Event creation cancelled.", "info");
            window.location.href = "/Home/Dashboard";
        }
    }

    /* =========================================================
     * MODAL: PROCEED TO STEP 3
     * =======================================================*/
    const btnProceedStep3 = document.getElementById("btnProceedStep3");
    if (btnProceedStep3) {
        btnProceedStep3.addEventListener("click", function() {
            // 1. Hide Modal
            const modalEl = document.getElementById('verificationInfoModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            // 2. Proceed to Step 3
            currentStep = 3;
            
            // 3. Mark invites as "to be sent"
            shouldSendInvites = true; 
            saveEventData(); 

            // 4. Update UI
            showStep(currentStep);
            updateStepUI(currentStep);
        });
    }

    /* =========================================================
     * FINAL SAVE (Publish Event → backend)
     * =======================================================*/
    function createEventAndSave() {
        // 1. Gather Data
        const currentData = getEventData(); 

        // 2. Read ID for Edit Mode
        const existingEventIdEl = document.getElementById("existingEventId");
        let existingEventId = 0;
        if (existingEventIdEl) {
            existingEventId = parseInt(existingEventIdEl.value, 10) || 0;
        }

        // 3. Prepare Payload
        const payload = {
            eventId: existingEventId === 0 ? null : existingEventId,

            // Basic Info
            eventName:        currentData.eventName,
            eventVenue:       currentData.eventVenue,
            eventDescription: currentData.eventDescription,
            eventStartDate:   currentData.eventStartDate,
            eventStartTime:   currentData.eventStartTime,
            eventType:        currentData.eventType,
            accessCode:       document.getElementById("eventAccessCode")?.value.trim() || "",

            // Theme & Header
            themeColor:       currentData.selectedThemeColor,
            headerImage:      currentData.selectedHeaderFileName,

            // Complex Data (Lists)
            contestants:      currentData.contestants,
            accessUsers:      currentData.accessUsers,

            // Legacy JSON
            contestantsJson:    JSON.stringify(currentData.contestants),
            accessJson:         JSON.stringify(currentData.accessUsers),
            criteriaJson:       "{}",
            roundsJson:         JSON.stringify(
                                    currentData.eventType === "criteria" 
                                    ? currentData.criteriaRounds 
                                    : currentData.orwRounds
                                ),
            pointingSystemJson: "{}",

            // Flags
            shouldSendJudgeInvites: shouldSendInvites,
            IsPublishing: true
        };

        // 4. Final Validation
        if (!payload.eventName || !payload.eventVenue ||
            !payload.eventStartDate || !payload.eventStartTime) {
            showToast("Missing required event fields.", "error");
            return;
        }

        if (!payload.accessCode) {
            showToast("Access code is required.", "error");
            return;
        }

        // 5. Submit with Spinner
        if (btnNext) {
            btnNext.disabled = true;
            const loadingText = (window.currentEventId && window.currentEventId > 0) ? "Updating..." : "Publishing...";
            btnNext.innerHTML = `<i class="ri-loader-4-line ri-spin" style="margin-right: 8px;"></i> ${loadingText}`;
        }

        fetch("/Events/CreateFromWizard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        })
        .then(async (res) => {
            let data = {};
            try {
                data = await res.json();
            } catch { }

            if (!res.ok || !data.success) {
                throw new Error(data.message || `Failed to create event.`);
            }

            const successMessage = (window.currentEventId && window.currentEventId > 0) ? "Changes successfully saved" : "Event Published Successfully";
            showToast(successMessage, "success");

            try {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            } catch { }

            if (data.redirectUrl) {
                // slight delay for the toast to be seen
                setTimeout(() => {
                    window.location.href = data.redirectUrl;
                }, 1000);
            } else {
                window.location.href = "/Events";
            }
        })
        .catch(err => {
            console.error("CreateFromWizard error:", err);
            showToast(err.message || "An error occurred while saving the event.", "error");
            
            if (btnNext) {
                btnNext.disabled = false;
                btnNext.textContent = "Publish Event";
            }
        });
    }

    function collectContestantsForPayload() {
        const rows = document.querySelectorAll("#contestantsBody tr[data-contestant-row]");
        const result = [];
        let counter = 1;

        rows.forEach(row => {
            const idCell     = row.querySelector("td:first-child");
            const nameInput  = row.querySelector(".contestant-name-input");
            const orgInput   = row.querySelector(".contestant-org-input");
            const photoThumb = row.querySelector("[data-photo-preview]");

            if (!nameInput || !nameInput.value.trim()) return;

            const idText = idCell ? idCell.textContent.trim() : `C${String(counter).padStart(3, "0")}`;
            const name   = nameInput.value.trim();
            const org    = orgInput ? orgInput.value.trim() : "";
            const photo  = (photoThumb && photoThumb.dataset.photoUrl) || "";

            result.push({
                id:          idText,
                name:        name,
                organization: org,
                photoUrl:    photo
            });

            counter++;
        });

        return result;
    }

    function collectCriteriaForPayload() {
        const roundsContainer = document.getElementById("criteriaRoundsList");
        if (!roundsContainer) return [];

        const rounds = roundsContainer.querySelectorAll(".event-round-card");
        const result = [];

        rounds.forEach(round => {
            const roundNameInput = round.querySelector(".event-round-name");
            const roundName = roundNameInput ? roundNameInput.value.trim() : "";

            const criteriaBlocks = round.querySelectorAll(".criteria-block");
            const criteriaList = [];

            criteriaBlocks.forEach(block => {
                const nameInput = block.querySelector('input[placeholder="e.g. Creativity"]');
                // Update selector to match the new UI structure
                const weightInput = block.querySelector(".criteria-weight-field input[type='number']");
                const minPointsInput = block.querySelector(".min-point-input");
                const maxPointsInput = block.querySelector(".max-point-input");

                const name = nameInput ? nameInput.value.trim() : "";
                if (!name) return;

                const weight = weightInput ? parseFloat(weightInput.value || "0") : 0;
                
                // Check if derived (disabled inputs)
                const isDerived = minPointsInput && minPointsInput.disabled;
                
                // Capture selected derived round index
                let derivedFromRoundIndex = null;
                const derivedSelect = block.querySelector('.filter-select[data-select-type="derived"] .filter-select-option.is-selected');
                if (isDerived && derivedSelect) {
                    const val = derivedSelect.dataset.value;
                    if (val) derivedFromRoundIndex = parseInt(val);
                }
                
                let minPoints = 0;
                let maxPoints = 0;

                if (isDerived) {
                    minPoints = -1;
                    maxPoints = -1;
                } else {
                    minPoints = minPointsInput ? parseFloat(minPointsInput.value || "0") : 0;
                    maxPoints = maxPointsInput ? parseFloat(maxPointsInput.value || "0") : 0;
                }

                criteriaList.push({
                    name,
                    weight,
                    scoringType: "point",
                    minPoints,
                    maxPoints,
                    isDerived: isDerived,
                    derivedFromRoundIndex: derivedFromRoundIndex // NEW
                });
            });

            result.push({
                roundName,
                criteria: criteriaList
            });
        });

        return result;
    }

    function collectOrwRoundsForPayload() {
        const roundsContainer = document.getElementById("orwRoundsList");
        if (!roundsContainer) return [];

        const rounds = roundsContainer.querySelectorAll(".event-round-card");
        const result = [];

        rounds.forEach(round => {
            const nameInput = round.querySelector(".event-round-name");
            const roundName = nameInput ? nameInput.value.trim() : "";

            const inputs = round.querySelectorAll(".event-orw-row input");
            result.push({
                name:        roundName,
                ptCorrect:   inputs[0]?.value || "",
                ptWrong:     inputs[1]?.value || "",
                ptBonus:     inputs[2]?.value || "",
                penSkip:     inputs[3]?.value || "",
                penViolation: inputs[4]?.value || ""
            });
        });

        return result;
    }


    function collectScorerAssignments() {
        const rows = document.querySelectorAll("#orwScorersBody tr[data-scorer-row]");
        const result = [];

        rows.forEach(row => {
            const id   = row.querySelector("td:first-child")?.textContent.trim() || "";
            const name = row.querySelector(".scorer-name-input")?.value.trim() || "";
            const pin  = row.querySelector(".scorer-pin-value")?.textContent.trim() || "";

            const assigned = Array.from(scorerAssignments.get(row) || []);

            result.push({ id, name, pin, assigned });
        });

        return result;
    }

    function collectAccessUsersForPayload() {
        const eventType = getSelectedEventType();
        const users = [];
        if (eventType === "criteria") {
            // Judges
            const rows = document.querySelectorAll("#judgesBody tr[data-judge-row]");
            let counter = 1;
            rows.forEach(row => {
                const idCell     = row.querySelector("td:first-child");
                // FIX: Use classes instead of placeholders
                const nameInput  = row.querySelector(".judge-name-input");
                const emailInput = row.querySelector(".judge-email-input");
                const pinSpan    = row.querySelector(".judge-pin-value");
                
                const id   = idCell ? idCell.textContent.trim() : `J${String(counter).padStart(3, "0")}`;
                const name = nameInput ? nameInput.value.trim() : "";
                const assigned = emailInput ? emailInput.value.trim() : ""; // using email as "Assigned"
                const pin  = pinSpan ? pinSpan.textContent.trim() : "";
                
                if (!name && !assigned && !pin) return;
                users.push({
                    id:       id,
                    name:     name,
                    assigned: assigned,
                    pin:      pin
                });
                counter++;
            });
        } else {
            // ORW – Scorers
            const rows = document.querySelectorAll("#orwScorersBody tr[data-scorer-row]");
            let counter = 1;
            rows.forEach(row => {
                const idCell    = row.querySelector("td:first-child");
                const nameInput = row.querySelector(".scorer-name-input");
                const pinSpan   = row.querySelector(".scorer-pin-value");
                const assignedSet = scorerAssignments.get(row) || new Set();
                const assignedText = Array.from(assignedSet).join(", ");
                const id   = idCell ? idCell.textContent.trim() : `S${String(counter).padStart(3, "0")}`;
                const name = nameInput ? nameInput.value.trim() : "";
                const pin  = pinSpan ? pinSpan.textContent.trim() : "";
                if (!name && !assignedText && !pin) return;
                users.push({
                    id:       id,
                    name:     name,
                    assigned: assignedText,
                    pin:      pin
                });
                counter++;
            });
        }
        return users;
    }

    // ---------------------------------------------------------
    // RESTORE HELPERS FOR DRAFTS (Steps 1–2)
    // ---------------------------------------------------------
    function restoreContestantsFromDraft(list) {
        const tbody = document.getElementById("contestantsBody");
        if (!tbody) return;

        tbody.innerHTML = "";

        (list || []).forEach(c => {
            addContestantRow();
            const tr = tbody.querySelector("tr:last-child");
            if (!tr) return;

            const nameInput = tr.querySelector(".contestant-name-input");
            const orgInput  = tr.querySelector(".contestant-org-input");
            const thumb     = tr.querySelector("[data-photo-preview]");

            if (nameInput) nameInput.value = c.name || "";
            if (orgInput)  orgInput.value  = c.organization || "";

            if (thumb && c.photoUrl) {
                let url = c.photoUrl;
                if (url && !url.startsWith("/") && !url.startsWith("http")) {
                    url = "/uploads/" + url;
                }
                thumb.style.backgroundImage = `url("${url}")`;
                thumb.classList.add("has-photo");
                thumb.dataset.photoUrl = url;
            }
        });

        renumberContestants();
        updateEmptyState(tbody, "No contestants added yet.");
    }

    function restoreAccessUsersFromDraft(list) {
        const type = getSelectedEventType();

        if (type === "criteria") {
            const tbody = document.getElementById("judgesBody");
            if (!tbody) return;

            tbody.innerHTML = "";

            (list || []).forEach(j => {
                addJudgeRow();
                const tr = tbody.querySelector("tr:last-child");
                if (!tr) return;

                // FIX: Use classes instead of placeholders
                const nameInput  = tr.querySelector(".judge-name-input");
                const emailInput = tr.querySelector(".judge-email-input");
                const pinSpan    = tr.querySelector(".judge-pin-value");

                if (nameInput)  nameInput.value  = j.name || "";
                if (emailInput) emailInput.value = j.assigned || "";
                if (pinSpan)    pinSpan.textContent = j.pin || "-----";
            });

            renumberJudges();
            updateEmptyState(tbody, "No judges added yet.");
        } else {
            const tbody = document.getElementById("orwScorersBody");
            if (!tbody) return;

            tbody.innerHTML = "";

            (list || []).forEach(s => {
                addOrwScorerRow();
                const tr = tbody.querySelector("tr:last-child");
                if (!tr) return;

                const nameInput = tr.querySelector(".scorer-name-input");
                const pinSpan   = tr.querySelector(".scorer-pin-value");

                if (nameInput) nameInput.value = s.name || "";
                if (pinSpan)   pinSpan.textContent = s.pin || "-----";
            });

            renumberScorers();
            updateEmptyState(tbody, "No scorers added yet.");
        }
    }

    function restoreCriteriaRoundsFromDraft(rounds) {
        const list = document.getElementById("criteriaRoundsList");
        if (!list) return;

        list.innerHTML = "";
        roundCounter = 0;

        (rounds || []).forEach(r => {
            createCriteriaRound();
            const roundEl = list.querySelector(".event-round-card:last-child");
            if (!roundEl) return;

            const roundNameInput = roundEl.querySelector(".event-round-name");
            if (roundNameInput) roundNameInput.value = r.roundName || "";

            const criteriaContainer = roundEl.querySelector(".criteria-blocks");
            if (!criteriaContainer) return;

            criteriaContainer.innerHTML = "";

            (r.criteria || []).forEach(c => {
                addCriteriaBlock(criteriaContainer, roundCounter);
                const block = criteriaContainer.querySelector(".criteria-block:last-child");
                if (!block) return;

                const critNameInput = block.querySelector('input[placeholder="e.g. Creativity"]');
                const weightInput   = block.querySelector(".criteria-weight-field input[type='number']");
                const minPointsInput = block.querySelector(".min-point-input");
                const maxPointsInput = block.querySelector(".max-point-input");

                if (critNameInput) critNameInput.value = c.name || "";
                if (weightInput && typeof c.weight === "number") {
                    weightInput.value = c.weight;
                }
                if (minPointsInput && typeof c.minPoints === "number") {
                    minPointsInput.value = c.minPoints;
                }
                if (maxPointsInput && typeof c.maxPoints === "number") {
                    maxPointsInput.value = c.maxPoints;
                }

                if (c.isDerived && c.derivedFromRoundIndex) {
                    const dropdown = block.querySelector('.filter-select[data-select-type="derived"]');
                    if (dropdown) {
                        const option = dropdown.querySelector(`.filter-select-option[data-value="${c.derivedFromRoundIndex}"]`);
                        if (option) {
                            option.click();
                        }
                    }
                }
            });
        });
    }

    function restoreOrwRoundsFromDraft(rounds) {
        const container = document.getElementById("orwRoundsList");
        if (!container) return;

        container.innerHTML = "";

        (rounds || []).forEach(r => {
            createOrwRound();
            const roundEl = container.querySelector(".event-round-card:last-child");
            if (!roundEl) return;

            const nameInput = roundEl.querySelector(".event-round-name");
            if (nameInput) nameInput.value = r.name || "";

            const inputs = roundEl.querySelectorAll(".event-orw-row input");
            if (inputs[0]) inputs[0].value = r.ptCorrect ?? "";
            if (inputs[1]) inputs[1].value = r.ptWrong ?? "";
            if (inputs[2]) inputs[2].value = r.ptBonus ?? "";
            if (inputs[3]) inputs[3].value = r.penSkip ?? "";
            if (inputs[4]) inputs[4].value = r.penViolation ?? "";
        });

        renumberOrwRounds();
    }

    function restoreScorerAssignments(list) {
        const rows = document.querySelectorAll("#orwScorersBody tr[data-scorer-row]");

        rows.forEach((tr, index) => {
            const saved = list[index];
            if (!saved || !Array.isArray(saved.assigned)) return;

            let set = scorerAssignments.get(tr);
            if (!set) {
                set = new Set();
                scorerAssignments.set(tr, set);
            }

            const chips = tr.querySelector(".token-select-chips");
            if (chips) chips.innerHTML = "";

            saved.assigned.forEach(id => {
                set.add(id);
                contestantOwner.set(id, tr);

                if (chips) {
                    chips.appendChild(
                        createChip(id, (removedId) => {
                            set.delete(removedId);
                            if (contestantOwner.get(removedId) === tr) {
                                contestantOwner.delete(removedId);
                            }
                            rebuildTokenDropdowns();
                        })
                    );
                }
            });

            rebuildTokenDropdowns();
        });
    }

    function ensureInitialContestantRow() {
        const draft = localStorage.getItem(LOCAL_STORAGE_KEY);
        let has = false;

        if (draft) {
            try {
                const d = JSON.parse(draft);
                if (d.contestants && d.contestants.length > 0) has = true;
            } catch {}
        }

        if (!has) {
            if (contestantsBody && contestantsBody.children.length === 0) {
                addContestantRow();
            }
        }
    }

    function setupAutoSave() {
        // Save on ANY input/textarea change
        document.querySelectorAll("input, textarea, select")
            .forEach(el => el.addEventListener("input", saveEventData));

        // Save on contestant row change
        const observer = new MutationObserver(saveEventData);
        if (contestantsBody) observer.observe(contestantsBody, { childList: true, subtree: true });

        // Save when changing scoring, criteria, rounds, etc.
        document.body.addEventListener("change", e => {
            saveEventData();
        });

        // Save when uploading images
        document.body.addEventListener("change", e => {
            if (e.target.type === "file") saveEventData();
        });

        // Save whenever tokens (ORW assignments) change
        document.body.addEventListener("click", e => {
            if (e.target.classList.contains("token-select-option") ||
                e.target.classList.contains("token-select-chip-remove")) {
                saveEventData();
            }
        });
    }


    /* =========================================================
    * GOOGLE FORMS INITIALIZATION
    * =======================================================*/
    function initializeWizard() {

        const type = getSelectedEventType();

        // Check if we are in an Edit session
        if (window.currentEventId && window.currentEventId > 0) {
            // It's an Edit session, prioritize server data over local storage draft

            // Clear local storage draft to prevent conflicts
            try {
                localStorage.removeItem(LOCAL_STORAGE_KEY);
            } catch (e) {
                console.warn("Error clearing local storage:", e);
            }

            // Populate basic fields from globals (app.js reads from hidden inputs)
            if (window.existingEventName)        document.getElementById("eventName").value        = window.existingEventName;
            if (window.existingEventVenue)       document.getElementById("eventVenue").value       = window.existingEventVenue;
            if (window.existingEventDescription) document.getElementById("eventDescription").value = window.existingEventDescription;
            if (window.existingEventStartDate)   document.getElementById("eventStartDate").value   = window.existingEventStartDate;
            if (window.existingEventStartTime)   document.getElementById("eventStartTime").value   = window.existingEventStartTime;
            
            // Set event type
            if (window.existingEventType) {
                const radioId = window.existingEventType === "criteria" ? "eventTypeCriteria" : "eventTypeOrw";
                const radio = document.getElementById(radioId);
                if (radio) {
                    radio.checked = true;
                    updateEventTypeInfo();
                }
            }

            // Theme and Header
            if (window.existingThemeColor) {
                eventThemeColor = window.existingThemeColor;
                root.querySelectorAll(".theme-preset-option").forEach(btn => {
                    const isSelected = btn.dataset.color === window.existingThemeColor;
                    btn.classList.toggle("is-selected", isSelected);
                    btn.querySelector(".theme-label")?.classList.toggle("is-selected", isSelected);
                });
                applyPreviewColor(window.existingThemeColor);
            }
            if (window.existingHeaderImage) {
                let imgPath = window.existingHeaderImage;
                if (imgPath && !imgPath.startsWith("/") && !imgPath.startsWith("http")) {
                    imgPath = "/uploads/" + imgPath;
                }
                window.selectedHeaderImageFileName = imgPath;
                const fnSpan = document.getElementById("headerFileName");
                if (fnSpan) fnSpan.textContent = window.existingHeaderImage;
                
                // Show preview
                if (typeof previewHeader !== 'undefined' && previewHeader) {
                    previewHeader.style.backgroundImage = `url(${imgPath})`;
                    previewHeader.style.backgroundSize = "cover";
                    previewHeader.style.backgroundPosition = "center";
                    previewHeader.style.backgroundColor = "transparent";
                    hasHeaderImage = true;
                    const removeBtn = document.getElementById("removeHeaderImage");
                    if(removeBtn) removeBtn.style.display = "inline-block";
                }
            }

            // Restore complex lists
            if (window.wizardContestants && Array.isArray(window.wizardContestants) && window.wizardContestants.length) {
                restoreContestantsFromDraft(window.wizardContestants);
            }
            if (window.wizardAccessUsers && Array.isArray(window.wizardAccessUsers) && window.wizardAccessUsers.length) {
                restoreAccessUsersFromDraft(window.wizardAccessUsers);
            }

            // Restore rounds based on type
            if (window.existingEventType === "criteria") {
                if (window.wizardRounds) restoreCriteriaRoundsFromDraft(window.wizardRounds);
            } else { // ORW
                if (window.wizardRounds) restoreOrwRoundsFromDraft(window.wizardRounds);
            }
            // Restore scorer assignments for ORW if needed
            if (window.wizardScorerAssignments && window.existingEventType !== "criteria") {
                restoreScorerAssignments(window.wizardScorerAssignments);
            }


            // Build UI for Step 2 based on type
            if (type === "criteria") buildCriteriaStep2();
            else buildOrwStep2();

            // Set initial value for access code in Step 3
            if (window.existingAccessCode) {
                document.getElementById("eventAccessCode").value = window.existingAccessCode;
            }

            showToast("Event data loaded for editing.", "info");

        } else {
            // Not an Edit session, proceed with new event setup or local storage draft
            // STEP 2 UI creation logic:
            // If event type is criteria, build criteria step
            // If ORW, build ORW step
            if (currentStep === 2) {
                if (type === "criteria") buildCriteriaStep2();
                else buildOrwStep2();
            }

            // Now that the UI exists → restore draft
            loadEventData();
        }

        // If NO draft contestants → add 1 empty row
        ensureInitialContestantRow();

        // Auto-save listeners (Google Forms style)
        setupAutoSave();
    }


    /* =========================================================
     * CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
     * =======================================================*/

    document.addEventListener("click", (e) => {
        const clickedSelect = e.target.closest(".filter-select");
        root.querySelectorAll(".filter-select").forEach(select => {
            if (select !== clickedSelect) {
                select.classList.remove("filter-select--open");
            }
        });
    });

    /* =========================================================
     * INITIALIZATION & EVENT LISTENERS
     * =======================================================*/

    updateStepUI(currentStep);

    if (btnNext) btnNext.addEventListener("click", nextStep);
    if (btnBack) btnBack.addEventListener("click", prevStep);

    /* ---------------------------------------------------------
    GOOGLE-FORMS STYLE INITIALIZATION
    1. Build UI first
    2. THEN restore draft
    3. THEN auto-save on change
    ---------------------------------------------------------- */
    initializeWizard();


    // Only add a blank row IF no draft contestants exist
    const draftData = localStorage.getItem(LOCAL_STORAGE_KEY);
    let hasDraftContestants = false;

    if (draftData) {
        try {
            const parsed = JSON.parse(draftData);
            if (parsed.contestants && parsed.contestants.length > 0) {
                hasDraftContestants = true;
            }
        } catch {}
    }
});



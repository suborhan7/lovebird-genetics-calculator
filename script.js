// Snapshot of the most recently computed results, used by shareResults() to
// build a shareable link. Set at the end of calculateGenetics(); read (never
// mutated) by shareResults(). Null until a calculation has been run.
let lastCalcData = null;

// ==========================================
// 1. LINKAGE DATABASE (Z Chromosome Map)
// ==========================================
// Every entry here is a MEASURED recombination (cross-over) fraction between
// two sex-linked loci. Any locus pair NOT listed here has no published
// lovebird-specific data — getLinkage() below returns those as
// confidence:"unknown" and falls back to treating them as independently
// inherited (recombination 0.5), which is a modelling assumption, not a
// measurement. This distinction (confirmed vs. unknown) is surfaced to the
// user in the UI's "Cross-over data" panel and in a dynamic breeding
// warning, rather than being silently baked into the math.
const linkageDB = [
    { loci: ["opaline", "cinnamon"], recombination: 0.33, confidence: "confirmed", source: "Budgerigar Z-linkage map (Taylor 1961), applied to lovebirds by analogy — not measured in Agapornis directly." },
    { loci: ["opaline", "ino"], recombination: 0.30, confidence: "confirmed", source: "Budgerigar Z-linkage map (Taylor 1961), applied to lovebirds by analogy — not measured in Agapornis directly." },
    { loci: ["cinnamon", "ino"], recombination: 0.03, confidence: "confirmed", source: "Budgerigar Z-linkage map (Taylor 1961), applied to lovebirds by analogy — not measured in Agapornis directly." }
];

// Looks up the recombination fraction between two sex-linked loci, and
// reports HOW confident that number is — rather than the two cases (real
// data vs. no data) being computationally indistinguishable, as they were
// when the old code just fell through to a bare 0.5 default with no flag.
function getLinkage(locusA, locusB) {
    const hit = linkageDB.find(x => x.loci.includes(locusA) && x.loci.includes(locusB));
    if (hit) return { recombination: hit.recombination, confidence: "confirmed", source: hit.source };
    return { recombination: 0.5, confidence: "unknown", source: "No published cross-over data for this pair in any Agapornis species; modelled as fully independent until data exists." };
}

// ==========================================
// 2. MUTATION DATABASE
// ==========================================
const mutationDB = [
    // --- 1 Basic color mutation ---
    { id: "aqua", symbol: "bl^{aq}", name: "aqua", cat: 1, type: "AR", locus: "bl", locusGroup: "Multiple Alleles of bl-locus", alleles: ["aqua"], sp: { white_eye_ring: "original", roseicollis: "original" } },
    { id: "blue1", symbol: "bl^{1}", name: "blue1", cat: 1, type: "AR", locus: "bl", locusGroup: "Multiple Alleles of bl-locus", alleles: ["blue1"], sp: { white_eye_ring: "original" } },
    { id: "blue2", symbol: "bl^{2}", name: "blue2", cat: 1, type: "AR", locus: "bl", locusGroup: "Multiple Alleles of bl-locus", alleles: ["blue2"], sp: { white_eye_ring: "original" } },
    { id: "rose_blue", symbol: "bl", name: "*blue*", cat: 1, type: "AR", locus: "bl", locusGroup: "Multiple Alleles of bl-locus", alleles: ["rose_blue"], sp: { roseicollis: "original" }, note: "** needs further investigation" },
    { id: "turquoise", symbol: "bl^{tq}", name: "turquoise", cat: 1, type: "AR", locus: "bl", locusGroup: "Multiple Alleles of bl-locus", alleles: ["turquoise"], sp: { roseicollis: "original" } },
    { id: "teal", symbol: "tl", name: "teal", cat: 1, type: "AR", locus: "teal", locusGroup: "default", alleles: ["teal"], sp: { taranta: "original" } },

    // Compounds (bl-locus)
    { id: "aqua_blue1", symbol: "bl^{aq}/bl^{1}", name: "AquaBlue1", cat: 1, type: "AR", isCompound: true, locus: "bl", locusGroup: "Multiple Alleles of bl-locus", alleles: ["aqua", "blue1"], sp: { white_eye_ring: "original" } },
    { id: "aqua_blue2", symbol: "bl^{aq}/bl^{2}", name: "AquaBlue2", cat: 1, type: "AR", isCompound: true, locus: "bl", locusGroup: "Multiple Alleles of bl-locus", alleles: ["aqua", "blue2"], sp: { white_eye_ring: "original" } },
    { id: "blue1_blue2", symbol: "bl^{1}/bl^{2}", name: "Blue1Blue2", cat: 1, type: "AR", isCompound: true, locus: "bl", locusGroup: "Multiple Alleles of bl-locus", alleles: ["blue1", "blue2"], sp: { white_eye_ring: "original" } },
    { id: "aqua_rose_blue", symbol: "bl^{aq}/bl", name: "Aqua*blue*", cat: 1, type: "AR", isCompound: true, locus: "bl", locusGroup: "Multiple Alleles of bl-locus", alleles: ["aqua", "rose_blue"], sp: { roseicollis: "original" }, note: "** needs further investigation" },
    { id: "turquoise_rose_blue", symbol: "bl^{tq}/bl", name: "Turquoise*blue*", cat: 1, type: "AR", isCompound: true, locus: "bl", locusGroup: "Multiple Alleles of bl-locus", alleles: ["turquoise", "rose_blue"], sp: { roseicollis: "original" }, note: "** needs further investigation" },
    { id: "aqua_turquoise", symbol: "bl^{aq}/bl^{tq}", name: "AquaTurquoise", cat: 1, type: "AR", isCompound: true, locus: "bl", locusGroup: "Multiple Alleles of bl-locus", alleles: ["aqua", "turquoise"], sp: { roseicollis: "original" } },

    // --- 2 Dark factor ---
    { id: "dark_factor", symbol: "D", name: "dark factor", cat: 2, type: "AID", locus: "dark_factor", locusGroup: "default", alleles: ["dark_factor"], sp: { taranta: "original", roseicollis: "original", white_eye_ring: "original" } },

    // --- 3 Dominant factor influencing basic psittacofulvin ---
    { id: "misty", symbol: "Mt", name: "misty", cat: 3, type: "AID", locus: "misty", locusGroup: "default", alleles: ["misty"], sp: { taranta: "original", white_eye_ring: "original" } },
    { id: "violet", symbol: "V", name: "violet", cat: 3, type: "AID", locus: "violet", locusGroup: "default", alleles: ["violet"], sp: { roseicollis: "original", white_eye_ring: "original" } },
    { id: "slaty", symbol: "Slt", name: "slaty", cat: 3, type: "AD", locus: "slaty", locusGroup: "default", alleles: ["slaty"], sp: { white_eye_ring: "original" } },

    // --- 4 Eumelanin mutations ---
    { id: "dom_pied", symbol: "Pi", name: "dominant pied", cat: 4, type: "AD", locus: "dom_pied", locusGroup: "default", alleles: ["dom_pied"], sp: { roseicollis: "original", white_eye_ring: "original" } },
    { id: "dom_reduced", symbol: "Rdu", name: "dominant reduced", cat: 4, type: "AD", locus: "dom_reduced", locusGroup: "default", alleles: ["dom_reduced"], sp: { white_eye_ring: "original" }, infoNote: "Note: Dominant Reduced is an autosomal dominant mutation with variable expressivity. Birds carrying the mutation may show different levels of visual expression, from very mild to very strong. This calculator predicts inheritance only, not the intensity of the phenotype." },
    { id: "dom_edged", symbol: "Ed", name: "dominant edged", cat: 4, type: "AID", locus: "dom_edged", locusGroup: "default", alleles: ["dom_edged"], sp: { white_eye_ring: "original" } },
    { id: "euwing", symbol: "Ew", name: "euwing", cat: 4, type: "AID", locus: "euwing", locusGroup: "default", alleles: ["euwing"], sp: { white_eye_ring: "original" } },
    { id: "grey_factor", symbol: "Gf", name: "grey factor", cat: 4, type: "AID", locus: "grey_factor", locusGroup: "default", alleles: ["grey_factor"], sp: { roseicollis: "original" } },

    // AR (a-locus)
    { id: "nsl_ino", symbol: "a", name: "NSL ino", cat: 4, type: "AR", locus: "a", locusGroup: "Multiple Alleles of a-locus", alleles: ["nsl_ino"], sp: { white_eye_ring: "original" } },
    { id: "dec", symbol: "a^{dec}", name: "dark eyed clear", cat: 4, type: "AR", locus: "a", locusGroup: "Multiple Alleles of a-locus", alleles: ["dec"], sp: { white_eye_ring: "original" } },
    { id: "pastel", symbol: "a^{pa}", name: "pastel", cat: 4, type: "AR", locus: "a", locusGroup: "Multiple Alleles of a-locus", alleles: ["pastel"], sp: { white_eye_ring: "original" } },
    { id: "bronze_fallow", symbol: "a^{bz}", name: "bronze fallow", cat: 4, type: "AR", locus: "a", locusGroup: "Multiple Alleles of a-locus", alleles: ["bronze_fallow"], sp: { taranta: "original", roseicollis: "original", white_eye_ring: "original" } },

    // Compounds (a-locus)
    { id: "pastel_ino", symbol: "a^{pa}/a", name: "PastelIno", cat: 4, type: "AR", isCompound: true, locus: "a", locusGroup: "Multiple Alleles of a-locus", alleles: ["pastel", "nsl_ino"], sp: { white_eye_ring: "original" } },
    { id: "dec_ino", symbol: "a^{dec}/a", name: "DecIno", cat: 4, type: "AR", isCompound: true, locus: "a", locusGroup: "Multiple Alleles of a-locus", alleles: ["dec", "nsl_ino"], sp: { white_eye_ring: "original" } },
    { id: "pastel_dec", symbol: "a^{pa}/a^{dec}", name: "PastelDec", cat: 4, type: "AR", isCompound: true, locus: "a", locusGroup: "Multiple Alleles of a-locus", alleles: ["pastel", "dec"], sp: { white_eye_ring: "original" } },
    { id: "bronze_fallow_ino", symbol: "a^{bz}/a", name: "BronzeFallowIno", cat: 4, type: "AR", isCompound: true, locus: "a", locusGroup: "Multiple Alleles of a-locus", alleles: ["bronze_fallow", "nsl_ino"], sp: { white_eye_ring: "original" } },
    { id: "bronze_fallow_dec", symbol: "a^{bz}/a^{dec}", name: "BronzeFallowDec", cat: 4, type: "AR", isCompound: true, locus: "a", locusGroup: "Multiple Alleles of a-locus", alleles: ["bronze_fallow", "dec"], sp: { white_eye_ring: "original" } },
    { id: "bronze_fallow_pastel", symbol: "a^{bz}/a^{pa}", name: "BronzeFallowPastel", cat: 4, type: "AR", isCompound: true, locus: "a", locusGroup: "Multiple Alleles of a-locus", alleles: ["bronze_fallow", "pastel"], sp: { white_eye_ring: "original" } },

    // AR (dil-locus & independent)
    { id: "dilute", symbol: "dil", name: "dilute", cat: 4, type: "AR", locus: "dilute", locusGroup: "Multiple Alleles of dil-locus", alleles: ["dilute"], sp: { roseicollis: "original", white_eye_ring: "original" } },
    { id: "pale_fallow", symbol: "pf", name: "pale fallow", cat: 4, type: "AR", locus: "pale_fallow", locusGroup: "Independent Loci", alleles: ["pale_fallow"], sp: { taranta: "original", roseicollis: "original", white_eye_ring: "original" } },
    { id: "dun_fallow", symbol: "df", name: "dun fallow", cat: 4, type: "AR", locus: "dun_fallow", locusGroup: "Independent Loci", alleles: ["dun_fallow"], sp: { white_eye_ring: "original" } },
    { id: "rec_pied", symbol: "s", name: "recessive pied", cat: 4, type: "AR", locus: "rec_pied", locusGroup: "Independent Loci", alleles: ["rec_pied"], sp: { roseicollis: "original", white_eye_ring: "original" } },
    { id: "faded", symbol: "fd", name: "*faded*", cat: 4, type: "AR", locus: "faded", locusGroup: "Independent Loci", alleles: ["faded"], sp: { white_eye_ring: "original" }, note: "** needs further investigation" },
    { id: "marbled", symbol: "mb", name: "marbled", cat: 4, type: "AR", locus: "marbled", locusGroup: "Independent Loci", alleles: ["marbled"], sp: { roseicollis: "original" } },
    { id: "dm_jade", symbol: "ja", name: "DM jade", cat: 4, type: "AR", locus: "dm_jade", locusGroup: "Independent Loci", alleles: ["dm_jade"], sp: { roseicollis: "original" }, infoNote: "Note: DM Jade is an autosomal recessive, sexually dimorphic mutation. Although inheritance is predicted accurately, males and females with the same genotype may look different. Therefore, the visual appearance of offspring depends on their sex as well as their genotype." },

    // SLR (ino-locus)
    { id: "sl_ino", symbol: "ino", name: "SL ino", cat: 4, type: "SLR", locus: "ino", locusGroup: "Multiple Alleles of ino-locus", alleles: ["sl_ino"], sp: { roseicollis: "original" } },
    { id: "pallid", symbol: "ino^{pd}", name: "pallid", cat: 4, type: "SLR", locus: "ino", locusGroup: "Multiple Alleles of ino-locus", alleles: ["pallid"], sp: { roseicollis: "original", white_eye_ring: "original" } },
    { id: "pale", symbol: "ino^{pe}", name: "pale", cat: 4, type: "SLR", locus: "ino", locusGroup: "Multiple Alleles of ino-locus", alleles: ["pale"], sp: { roseicollis: "original", white_eye_ring: "original" } },

    // Compounds (ino-locus)
    { id: "pallid_ino", symbol: "ino^{pd}/ino", name: "PallidIno", cat: 4, type: "SLR", isCompound: true, locus: "ino", locusGroup: "Multiple Alleles of ino-locus", alleles: ["pallid", "sl_ino"], sp: { roseicollis: "original" } },
    { id: "pale_ino", symbol: "ino^{pe}/ino", name: "PaleIno", cat: 4, type: "SLR", isCompound: true, locus: "ino", locusGroup: "Multiple Alleles of ino-locus", alleles: ["pale", "sl_ino"], sp: { roseicollis: "original" } },
    { id: "pallid_pale", symbol: "ino^{pd}/ino^{pe}", name: "PallidPale", cat: 4, type: "SLR", isCompound: true, locus: "ino", locusGroup: "Multiple Alleles of ino-locus", alleles: ["pallid", "pale"], sp: { roseicollis: "original", white_eye_ring: "original" } },

    // SLR (Independent Loci)
    { id: "cinnamon", symbol: "cin", name: "cinnamon", cat: 4, type: "SLR", locus: "cinnamon", locusGroup: "Independent Loci", alleles: ["cinnamon"], sp: { roseicollis: "original", white_eye_ring: "original" } },

    // SLID
    { id: "sl_dom_greywing", symbol: "Grw", name: "SL dominant greywing", cat: 4, type: "SLID", locus: "sl_dom_greywing", locusGroup: "default", alleles: ["sl_dom_greywing"], sp: { white_eye_ring: "original" }, warningNote: "Note: The crossover (linkage) rate between SL dominant greywing and other sex-linked mutations (opaline, pallid, pale, cinnamon) has not yet been established by researchers. Until this data becomes available, the calculator assumes these mutations are inherited completely independently of one another." },

    // --- 5 Both eumelanin and psittacofulvin ---
    { id: "opaline", symbol: "op", name: "opaline", cat: 5, type: "SLR", locus: "opaline", locusGroup: "default", alleles: ["opaline"], sp: { roseicollis: "original", white_eye_ring: "original" } },

    // --- 6 Pigment expression in mask ---
    { id: "orange_face", symbol: "of", name: "orange face", cat: 6, type: "AR", locus: "orange_face", locusGroup: "default", alleles: ["orange_face"], sp: { roseicollis: "original", white_eye_ring: "original" } },
    { id: "pale_headed", symbol: "Ph", name: "pale headed", cat: 6, type: "AID", locus: "pale_headed", locusGroup: "default", alleles: ["pale_headed"], sp: { roseicollis: "original" } }
];

// ==========================================
// 2b. NAMING ORDER (Ornitho-Genetics convention)
// ==========================================
const CAT_NAME_ORDER = { 6: 1, 5: 2, 4: 3, 3: 4, 2: 5, 1: 6 };
function nameRank(cat) { return CAT_NAME_ORDER[cat] ?? 99; }

const allZloci = [...new Set(mutationDB.filter(m => m.type.includes("SL")).map(m => m.locus))];
const zMapOrder = ["opaline", "ino", "cinnamon", ...allZloci.filter(l => !["opaline", "ino", "cinnamon"].includes(l))];
const zNamingOrder = ["opaline", "cinnamon", "ino", ...allZloci.filter(l => !["opaline", "cinnamon", "ino"].includes(l))];

const categoriesOrder = ["Basic color mutation", "Dark factor", "Dominant factor influencing the appearance of basic psittacofulvin mutations", "Eumelanin mutations", "Mutation influencing both eumelanin and psittacofulvin expression", "Mutation influencing pigment expression in the mask"];
const moiLabels = { "AR": "Autosomal Recessive", "AD": "Autosomal Dominant", "AID": "Autosomal Incomplete Dominant", "SLR": "Sex-Linked Recessive", "SLID": "Sex-Linked Incomplete Dominant" };
const lociGroups = { 'bl': ['aqua', 'blue1', 'blue2', 'rose_blue', 'turquoise', 'aqua_blue1', 'aqua_blue2', 'blue1_blue2', 'aqua_rose_blue', 'turquoise_rose_blue', 'aqua_turquoise'], 'a': ['nsl_ino', 'dec', 'pastel', 'bronze_fallow', 'pastel_ino', 'dec_ino', 'pastel_dec', 'bronze_fallow_ino', 'bronze_fallow_dec', 'bronze_fallow_pastel'], 'dil': ['dilute'], 'ino': ['sl_ino', 'pallid', 'pale', 'pallid_ino', 'pale_ino', 'pallid_pale'] };

function updateUI() {
    const species = document.getElementById("species").value;
    const ui = document.getElementById("calculator-ui");
    const btn = document.getElementById("calc-btn");
    const rBtn = document.getElementById("reset-btn");
    const symToggleWrap = document.getElementById("symbol-toggle-wrap");
    const results = document.getElementById("results-container");

    if (species === "none") {
        ui.style.display = "none"; btn.style.display = "none"; rBtn.style.display = "none";
        if (symToggleWrap) symToggleWrap.style.display = "none";
        results.style.display = "none";
        return;
    }
    ui.style.display = "flex"; btn.style.display = "inline-block"; rBtn.style.display = "inline-block";
    if (symToggleWrap) symToggleWrap.style.display = "block";
    results.style.display = "none";
    renderBird("sire-categories", species, "male");
    renderBird("dam-categories", species, "female");
}

// ==========================================
// GENETIC SYMBOLS / FORMULAS VISIBILITY TOGGLE
// ==========================================
// Pure display toggle: adds/removes a class on <body>, which CSS rules use
// to hide (a) the symbol column next to each mutation checkbox, and (b) the
// whole Genetic Formula(s) column (header + cells) in both the Parents
// table and the offspring results table(s). No calculation logic, stored
// genotype/phenotype data, or mutation-selection behavior is touched --
// re-rendering the mutation lists (species change) or regenerating results
// keeps whatever hidden/shown state was last set, since the class lives on
// <body> rather than on the regenerated elements themselves.
let geneticSymbolsHidden = false;
function toggleGeneticSymbols() {
    geneticSymbolsHidden = !geneticSymbolsHidden;
    document.body.classList.toggle("hide-genetic-symbols", geneticSymbolsHidden);
    const btn = document.getElementById("toggle-symbols-btn");
    if (btn) btn.textContent = geneticSymbolsHidden ? "Show Genetic Symbols" : "Hide Genetic Symbols";
}

function resetCalculator() {
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
        let itemDiv = cb.closest('.mutation-item');
        itemDiv.classList.remove('active');
        itemDiv.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    });
    document.getElementById("results-container").style.display = "none";
    handleConstraints('sire-categories', 'male');
    handleConstraints('dam-categories', 'female');
}

function toggleMutation(checkbox, containerId, sex) {
    const itemDiv = checkbox.closest('.mutation-item');
    if (checkbox.checked) {
        itemDiv.classList.add('active');
        const mut = mutationDB.find(m => m.id === checkbox.dataset.id);
        const defaultVal = ["AD", "AID", "SLID"].includes(mut.type) ? "1" : "2";
        const radio = itemDiv.querySelector(`input[type="radio"][value="${defaultVal}"]`) || itemDiv.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    } else {
        itemDiv.classList.remove('active');
        itemDiv.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    }
    handleConstraints(containerId, sex);
}

function handleConstraints(containerId, sex) {
    const container = document.getElementById(containerId);
    for (const [locus, mutIds] of Object.entries(lociGroups)) {
        let activeId = null;
        mutIds.forEach(id => {
            const cb = container.querySelector(`input[data-id="${id}"]`);
            if (cb && cb.checked) activeId = id;
        });
        mutIds.forEach(id => {
            const cb = container.querySelector(`input[data-id="${id}"]`);
            if (!cb) return;
            cb.disabled = (activeId !== null && id !== activeId);
            cb.closest('label').style.opacity = cb.disabled ? '0.5' : '1';
        });
    }

    container.querySelectorAll('.mutation-item.active').forEach(item => {
        const mut = mutationDB.find(m => m.id === item.querySelector('input[type="checkbox"]').dataset.id);
        if (mut.type.includes("SL") && sex === "male") {
            const zAssign = item.querySelector('.z-assign');
            if (zAssign) zAssign.style.display = (item.querySelector('input[value="1"]:checked')) ? "flex" : "none";
        }
        if (mut.id === "dark_factor") {
            const blSplit = container.querySelectorAll('.mutation-item.active input[data-id^="blue1"], .mutation-item.active input[data-id^="blue2"], .mutation-item.active input[data-id^="aqua"], .mutation-item.active input[data-id^="turquoise"], .mutation-item.active input[data-id^="rose_blue"]');
            let blSplitActive = false;
            let blVisActive = false;
            blSplit.forEach(el => {
                if (el.closest('.mutation-item').querySelector('input[value="1"]:checked')) blSplitActive = true;
                if (el.closest('.mutation-item').querySelector('input[value="2"]:checked')) blVisActive = true;
            });
            const tAssign = item.querySelector('.t-assign');
            if (tAssign) {
                tAssign.style.display = (item.querySelector('input[value="1"]:checked') && blSplitActive && !blVisActive) ? "flex" : "none";
            }
        }
    });
}

// ==========================================
// UI TEMPLATE FUNCTIONS (refactored out of one giant nested ternary into
// small, single-purpose builders — each handles exactly one control shape)
// ==========================================
function radioBtn(inputName, val, label, containerId, sex) {
    return `<label><input type="radio" name="${inputName}" value="${val}" onchange="handleConstraints('${containerId}', '${sex}')"><span>${label}</span></label>`;
}
function assignPanel(inputName, kind) {
    // kind: 'z' (Z1/Z2 chromosome assignment) or 't' (dark-factor T1/T2 phase)
    const cls = kind === "z" ? "z-assign" : "t-assign";
    const suffix = kind === "z" ? "_z" : "_t";
    const opts = kind === "z" ? [["z1", "Z1"], ["z2", "Z2"]] : [["T1", "T1"], ["T2", "T2"]];
    const note = kind === "z"
        ? `Each Z chromosome can carry different mutations. Two sex-linked genes placed on <strong>different</strong> Z's can recombine (cross-over) in the offspring — that's what produces cross-over phenotypes like opaline-cinnamon.`
        : `<strong>T1</strong> = dark factor linked to the green/wild-type chromosome. <strong>T2</strong> = linked to the blue-mutant chromosome. Affects offspring odds when paired with a blue-series split.`;
    return `<div class="${cls}"><div class="assign-row"><span class="assign-label">${kind === "z" ? "Assign to" : "Phase"}</span>${
        opts.map((o, i) => `<label class="pillopt"><input type="radio" name="${inputName}${suffix}" value="${o[0]}" ${i === 0 ? "checked" : ""}><span>${o[1]}</span></label>`).join("")
    }</div><p class="assign-note">${note}</p></div>`;
}
function geneButtonsFor(mut, inputName, containerId, sex) {
    if (mut.isCompound) return radioBtn(inputName, "2", "Visual", containerId, sex);
    if (mut.id === "dark_factor") return radioBtn(inputName, "1", "D", containerId, sex) + radioBtn(inputName, "2", "DD", containerId, sex) + assignPanel(inputName, "t");
    if (mut.type === "AR") return radioBtn(inputName, "1", "Split", containerId, sex) + radioBtn(inputName, "2", "Visual", containerId, sex);
    if (mut.type.includes("SL")) {
        if (sex !== "male") return radioBtn(inputName, "1", "Visual", containerId, sex);
        const base = radioBtn(inputName, "1", "Split", containerId, sex) + radioBtn(inputName, "2", "Visual", containerId, sex);
        return base + assignPanel(inputName, "z");
    }
    return radioBtn(inputName, "1", "SF", containerId, sex) + radioBtn(inputName, "2", "DF", containerId, sex);
}
function mutationItemHTML(mut, containerId, sex) {
    const inputName = `${sex}_${mut.id}`;
    const notes = [
        mut.warningNote ? `<div class="mnote warn">${mut.warningNote}</div>` : "",
        mut.note ? `<div class="mnote flag">${mut.note}</div>` : "",
        mut.infoNote ? `<div class="mnote info">${mut.infoNote}</div>` : ""
    ].join("");
    return `<div class="mutation-item">
        <label class="mutation-label"><input type="checkbox" data-id="${mut.id}" onchange="toggleMutation(this, '${containerId}', '${sex}')">
            <span class="mut-sym">${renderFormat(mut.symbol)}</span><span class="mut-name">${mut.name}</span></label>
        <div class="gene-options"><div class="seg">${geneButtonsFor(mut, inputName, containerId, sex)}</div></div>
        ${notes}
    </div>`;
}
function locusGroupHTML(locusGroup, muts, containerId, sex) {
    const isNested = locusGroup !== "default";
    const header = isNested ? `<div class="locus-h">${locusGroup}</div>` : "";
    return `<div class="${isNested ? "locus-block" : ""}">${header}${muts.map(m => mutationItemHTML(m, containerId, sex)).join("")}</div>`;
}
function moiBlockHTML(type, locusGroupsObj, containerId, sex) {
    const sortedLocus = Object.keys(locusGroupsObj).sort((a, b) => {
        if (a === "default") return -1; if (b === "default") return 1;
        if (a === "Independent Loci") return 1; if (b === "Independent Loci") return -1;
        return a.localeCompare(b);
    });
    return `<div class="moi-h">${moiLabels[type] || type}</div>` +
        sortedLocus.map(lg => locusGroupHTML(lg, locusGroupsObj[lg], containerId, sex)).join("");
}
function categoryHTML(catName, catNum, species, containerId, sex, openByDefault) {
    const validMuts = mutationDB.filter(mut => mut.cat === catNum && mut.sp[species]);
    if (!validMuts.length) return "";
    const groupedByMOI = {};
    validMuts.forEach(mut => {
        if (sex === "female" && mut.isCompound && mut.type === "SLR") return;
        if (!groupedByMOI[mut.type]) groupedByMOI[mut.type] = {};
        const groupName = mut.locusGroup || "default";
        (groupedByMOI[mut.type][groupName] = groupedByMOI[mut.type][groupName] || []).push(mut);
    });
    const sortedMOI = Object.keys(groupedByMOI).sort((a, b) =>
        ["AR", "AID", "AD", "SLR", "SLID"].indexOf(a) - ["AR", "AID", "AD", "SLR", "SLID"].indexOf(b));
    return `<details class="cat"${openByDefault ? " open" : ""}><summary>${catName}</summary>` +
        sortedMOI.map(type => moiBlockHTML(type, groupedByMOI[type], containerId, sex)).join("") +
        `</details>`;
}
function renderBird(containerId, species, sex) {
    const container = document.getElementById(containerId);
    container.innerHTML = categoriesOrder.map((catName, i) =>
        categoryHTML(catName, i + 1, species, containerId, sex, i === 0)).join("");
    handleConstraints(containerId, sex);
}

function parseState(containerId, isMale) {
    const container = document.getElementById(containerId);
    const active = container.querySelectorAll('.mutation-item.active');
    const autoGenes = {}, z1 = [], z2 = [];
    let splitCount = 0, dfPhase = null;
    active.forEach(item => {
        const cb = item.querySelector('input[type="checkbox"]');
        const mut = mutationDB.find(m => m.id === cb.dataset.id);
        const geneVal = parseInt(item.querySelector('input[type="radio"]:checked').value);
        if (mut.type.includes("SL")) {
            if (isMale) {
                if (mut.isCompound) { mut.alleles.forEach((a, i) => i === 0 ? z1.push(a) : z2.push(a)); }
                else if (geneVal === 2) mut.alleles.forEach(a => { z1.push(a); z2.push(a); });
                else {
                    const zRadio = item.querySelector(`input[name="male_${mut.id}_z"]:checked`);
                    (zRadio?.value === "z1" || (!zRadio && splitCount++ % 2 === 0)) ? mut.alleles.forEach(a => z1.push(a)) : mut.alleles.forEach(a => z2.push(a));
                }
            } else mut.alleles.forEach(a => z1.push(a));
        } else {
            let locus = mut.locus;
            if (!autoGenes[locus]) autoGenes[locus] = [];
            if (mut.isCompound) {
                // Compound (e.g. PastelIno): one copy of each allele.
                autoGenes[locus].push(mut.alleles[0], mut.alleles[1]);
            } else if (geneVal === 2) {
                // Visual (homozygous): two copies of the same mutant allele.
                autoGenes[locus].push(mut.alleles[0], mut.alleles[0]);
            } else {
                // Split (heterozygous): one mutant allele, one wild-type.
                autoGenes[locus].push(mut.alleles[0], "+");
            }
            if (mut.id === "dark_factor" && geneVal === 1) {
                const tRadio = item.querySelector(`input[name="${isMale ? 'male' : 'female'}_dark_factor_t"]:checked`);
                if(tRadio) dfPhase = tRadio.value;
            }
        }
    });

    let isDFHetero = autoGenes['dark_factor'] && autoGenes['dark_factor'][0] !== autoGenes['dark_factor'][1];
    let blMutants = autoGenes['bl'] ? autoGenes['bl'].filter(a => a !== "+") : [];
    if (!isDFHetero || blMutants.length !== 1) dfPhase = null;
    else if (isDFHetero && blMutants.length === 1 && !dfPhase) dfPhase = "T1"; 

    return { z1, z2, autoGenes, dfPhase };
}

function generateZGametesMale(z1, z2) {
    let chrom1 = zMapOrder.map(l => z1.find(a => mutationDB.find(m => m.id === a)?.locus === l) || "+");
    let chrom2 = zMapOrder.map(l => z2.find(a => mutationDB.find(m => m.id === a)?.locus === l) || "+");
    if (JSON.stringify(chrom1) === JSON.stringify(chrom2)) {
        const result = [{ chr: 'Z', genes: chrom1.filter(a => a !== "+"), prob: 1.0 }];
        result.unknownLinkagePairs = [];
        return result;
    }
    let gametes = [], perms = 1 << zMapOrder.length;
    const unknownPairsUsed = new Map(); // key "locusA|locusB" -> {loci:[a,b]}
    for (let i = 0; i < perms; i++) {
        let genes = [], p = 1.0;
        for (let j = 0; j < zMapOrder.length; j++) {
            let from2 = (i & (1 << j)) !== 0;
            genes.push(from2 ? chrom2[j] : chrom1[j]);
            if (j > 0) {
                let cross = from2 !== ((i & (1 << (j - 1))) !== 0);
                const locusA = zMapOrder[j - 1], locusB = zMapOrder[j];
                const link = getLinkage(locusA, locusB);
                p *= cross ? link.recombination : (1 - link.recombination);
                // Only worth flagging when this boundary is actually doing
                // something: both flanking loci carry a real mutation on at
                // least one of the two Z chromosomes, and there's no
                // confirmed rate backing the number being used.
                const aActive = chrom1[j - 1] !== "+" || chrom2[j - 1] !== "+";
                const bActive = chrom1[j] !== "+" || chrom2[j] !== "+";
                if (link.confidence === "unknown" && aActive && bActive) {
                    unknownPairsUsed.set(`${locusA}|${locusB}`, { loci: [locusA, locusB] });
                }
            }
        }
        gametes.push({ genes: genes.filter(a => a !== "+"), prob: p / 2 });
    }
    let condensed = {};
    gametes.forEach(g => { let k = g.genes.sort().join("_"); if (!condensed[k]) condensed[k] = { genes: g.genes, prob: 0 }; condensed[k].prob += g.prob; });
    const result = Object.values(condensed).filter(g => g.prob > 0);
    result.unknownLinkagePairs = [...unknownPairsUsed.values()];
    return result;
}

function generateAutosomalGametes(autoGenes, dfPhase) {
    let pool = [{ genes: {}, prob: 1.0 }];
    let loci = Object.keys(autoGenes);
    let isDfHet = autoGenes['dark_factor'] && autoGenes['dark_factor'][0] !== autoGenes['dark_factor'][1];
    let blMutants = autoGenes['bl'] ? autoGenes['bl'].filter(a => a !== "+") : [];
    let hasLinkedDF_BL = dfPhase && isDfHet && blMutants.length === 1;

    if (hasLinkedDF_BL) {
        loci = loci.filter(l => l !== 'dark_factor' && l !== 'bl');
        let df_mut = autoGenes['dark_factor'].find(a => a !== "+");
        let bl_mut = blMutants[0];
        
        let p1 = dfPhase === "T1" ? [{ 'dark_factor': df_mut, 'bl': "+" }, { 'dark_factor': "+", 'bl': bl_mut }] : [{ 'dark_factor': df_mut, 'bl': bl_mut }, { 'dark_factor': "+", 'bl': "+" }];
        let r1 = dfPhase === "T1" ? [{ 'dark_factor': df_mut, 'bl': bl_mut }, { 'dark_factor': "+", 'bl': "+" }] : [{ 'dark_factor': df_mut, 'bl': "+" }, { 'dark_factor': "+", 'bl': bl_mut }];
        let next = [];
        pool.forEach(g => {
            p1.forEach(set => next.push({ genes: { ...g.genes, ...set }, prob: g.prob * 0.43 }));
            r1.forEach(set => next.push({ genes: { ...g.genes, ...set }, prob: g.prob * 0.07 }));
        });
        pool = next;
    }
    loci.forEach(l => {
        let next = [];
        pool.forEach(g => { next.push({ genes: { ...g.genes, [l]: autoGenes[l][0] }, prob: g.prob * 0.5 }); next.push({ genes: { ...g.genes, [l]: autoGenes[l][1] }, prob: g.prob * 0.5 }); });
        pool = next;
    });
    return pool;
}

function capitalizeFirst(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getWTSymbol(locus) {
    const mapping = { "bl": "bl^{+}", "a": "a^{+}", "ino": "ino^{+}", "dilute": "dil^{+}" };
    if (mapping[locus]) return mapping[locus];

    let mut = mutationDB.find(m => m.locus === locus);
    if (mut && mut.symbol) return mut.symbol.split('^')[0].split('_')[0] + "^{+}";
    return "+";
}

function formatSymbol(alleles, locus) {
    let wt = getWTSymbol(locus);
    if (alleles[0] === "+" && alleles[1] === "+") return `${wt}/${wt}`;

    let a1 = alleles[0] === "+" ? wt : (mutationDB.find(x => x.id === alleles[0])?.symbol || "+");
    let a2 = alleles[1] === "+" ? wt : (mutationDB.find(x => x.id === alleles[1])?.symbol || "+");
    return `${a1}/${a2}`;
}

function renderFormat(str) {
    return str.replace(/\^\{(.*?)\}/g, "<sup>$1</sup>").replace(/_\{(.*?)\}/g, "<sub>$1</sub>");
}

function buildLinkedBlDfSymbol(bl_c1, df_c1, bl_c2, df_c2) {
    function sym(id, locus) {
        if (id === "+") return getWTSymbol(locus);
        const m = mutationDB.find(x => x.id === id);
        return m ? m.symbol : "+";
    }
    const chrom1 = `${sym(bl_c1, "bl")}_${sym(df_c1, "dark_factor")}`;
    const chrom2 = `${sym(bl_c2, "bl")}_${sym(df_c2, "dark_factor")}`;
    // Sort the two chromosome strings, same as every other locus's
    // formatSymbol() sorts its pair of alleles before printing — otherwise
    // "sire gives D / dam gives +" and "sire gives + / dam gives D" print
    // in opposite orders even though they're the same genotype, so the
    // offspring-row merge (which matches on exact symbol+name text) treats
    // them as two different rows and halves each one's displayed probability.
    const [a, b] = [chrom1, chrom2].sort();
    return `${a}/${b}`;
}

function getParentBlDfChromosomes(autoGenes, dfPhase) {
    const dfAlleles = autoGenes['dark_factor'] || ["+", "+"];
    const blAlleles = autoGenes['bl'] || ["+", "+"];
    const dfMut = dfAlleles.find(a => a !== "+");
    const blMutants = blAlleles.filter(a => a !== "+");

    if (dfPhase && dfMut && blMutants.length === 1) {
        // Genuinely ambiguous case (dark factor split + bl split): which
        // chromosome carries which allele isn't recoverable from the
        // genotype alone — that's exactly what the T1/T2 phase selection
        // in the UI is for, so use it here.
        const blMut = blMutants[0];
        if (dfPhase === "T1") {
            // T1: dark factor linked to the wild-type/green chromosome.
            return { df_c1: dfMut, bl_c1: "+", df_c2: "+", bl_c2: blMut };
        }
        // T2: dark factor linked to the mutant/blue chromosome.
        return { df_c1: dfMut, bl_c1: blMut, df_c2: "+", bl_c2: "+" };
    }
    // Unambiguous: at least one of the two loci is homozygous or entirely
    // absent, so it contributes the same allele to both chromosomes —
    // direct index pairing is safe regardless of which side is "1" vs "2".
    return { df_c1: dfAlleles[0] ?? "+", bl_c1: blAlleles[0] ?? "+", df_c2: dfAlleles[1] ?? "+", bl_c2: blAlleles[1] ?? "+" };
}

function translatePhenotype(z1, z2, auto, sex, indPhase, hasSL, offspringMode, blDfBlock) {
    let visualTraits = [];
    let splitTraits = [];
    let symbolParts = [];
    let expressedIDs = [];

    const orderedLoci = Object.keys(auto).sort((a, b) => {
        const repA = mutationDB.find(m => m.locus === a);
        const repB = mutationDB.find(m => m.locus === b);
        return nameRank(repA ? repA.cat : 99) - nameRank(repB ? repB.cat : 99);
    });

    orderedLoci.forEach(locus => {
        let alleles = auto[locus].sort();
        // Every locus reaching this point is one that's actually
        // segregating in this cross (it's a key in `auto`), so its symbol
        // should always be shown — including when this particular
        // offspring happens to be wild-type at it (e.g. the rare
        // double-recombinant outcome that inherited neither linked
        // mutation). Suppressing it here previously left the genotype
        // column blank for that outcome.
        // In offspring mode, bl and dark_factor are pulled out of this
        // per-locus symbol list entirely — they're shown together as one
        // chromosome-paired block (blDfBlock) instead, so we don't want
        // them appearing a second time here.
        // The joined bl/dark-factor block is gated on blDfBlock being
        // supplied at all (used for both parents and offspring), not on
        // offspringMode — offspringMode only controls the Z-linked
        // crossover-symbol reordering below, which stays offspring-only.
        if (!(blDfBlock && (locus === "bl" || locus === "dark_factor"))) {
            symbolParts.push(formatSymbol(alleles, locus));
        }

        if (alleles[0] === "+" && alleles[1] === "+") return;

        if (alleles[0] === alleles[1]) {
            let m = mutationDB.find(x => x.id === alleles[0] && !x.isCompound);
            if (m) {
                visualTraits.push({ ...m, zygosity: ["AID", "AD"].includes(m.type) ? "DF" : "VISUAL" });
                expressedIDs.push(m.id);
            }
        } else if (alleles[0] === "+" || alleles[1] === "+") {
            let mutId = alleles[0] !== "+" ? alleles[0] : alleles[1];
            let m = mutationDB.find(x => x.id === mutId && !x.isCompound);
            if (m) {
                if (["AID", "AD"].includes(m.type)) {
                    visualTraits.push({ ...m, zygosity: "SF" }); expressedIDs.push(m.id);
                } else {
                    splitTraits.push(m);
                }
            }
        } else {
            let comp = mutationDB.find(x => x.isCompound && x.alleles.includes(alleles[0]) && x.alleles.includes(alleles[1]));
            if (comp) {
                visualTraits.push({ ...comp, zygosity: "VISUAL" }); expressedIDs.push(comp.id);
            } else {
                let m1 = mutationDB.find(x => x.id === alleles[0]);
                let m2 = mutationDB.find(x => x.id === alleles[1]);
                if (m1 && m2) {
                    visualTraits.push({ ...m1, customName: `${m1.name}-${m2.name}` });
                    expressedIDs.push(m1.id, m2.id);
                }
            }
        }
    });

    // The bl-locus/dark-factor pair is always shown as one joined,
    // chromosome-paired block at the very front of the symbol string
    // (ahead of all other autosomal loci) whenever blDfBlock is supplied —
    // for both parents and offspring — regardless of whether either
    // mutation is active in this cross. This is also what makes "type 1"
    // vs "type 2" phase genuinely visible in the symbol itself, not just
    // in the name.
    if (blDfBlock) {
        symbolParts.unshift(blDfBlock);
    }

    // getZSymbol takes the sibling Z's alleles (otherZArr) so it can tell
    // which loci are segregating in this individual at all. A locus that's
    // mutant on the *other* Z but wild-type on this one must still be
    // printed here — as that locus's own wildtype symbol (e.g. "op^{+}",
    // "cin^{+}") — rather than silently dropped or collapsed to a bare
    // "+"/generic "Z^{+}". Only when neither Z carries anything at all
    // (nothing segregating for this individual) does the whole thing
    // collapse to the generic "Z^{+}".
    const getZSymbol = (zArr, otherZArr = []) => {
        const combinedLoci = [...new Set([...zArr, ...otherZArr]
            .map(id => mutationDB.find(m => m.id === id)?.locus)
            .filter(Boolean))];
        if (combinedLoci.length === 0) return "Z^{+}";
        const sortedLoci = combinedLoci.sort((a, b) => {
            const order = offspringMode ? zNamingOrder : zMapOrder;
            return order.indexOf(a) - order.indexOf(b);
        });
        const syms = sortedLoci.map(locus => {
            const id = zArr.find(a => mutationDB.find(m => m.id === a)?.locus === locus);
            return id ? mutationDB.find(x => x.id === id).symbol : getWTSymbol(locus);
        });
        return "Z " + syms.join("_");
    };

    if (hasSL) {
        if (sex === "female") {
            symbolParts.push(`${getZSymbol(z1)}/W`);
        } else {
            symbolParts.push(`${getZSymbol(z1, z2)}/${getZSymbol(z2, z1)}`);
        }
    }

    if (sex === "female") {
        z1.forEach(id => {
            let m = mutationDB.find(x => x.id === id);
            if (m) { visualTraits.push({ ...m, zygosity: "VISUAL" }); expressedIDs.push(m.id); }
        });
    } else {
        let filteredZ1 = [...z1];
        let filteredZ2 = [...z2];

        const slCompounds = mutationDB.filter(m => m.type === "SLR" && m.isCompound);
        for (let comp of slCompounds) {
            if ((filteredZ1.includes(comp.alleles[0]) && filteredZ2.includes(comp.alleles[1])) ||
                (filteredZ1.includes(comp.alleles[1]) && filteredZ2.includes(comp.alleles[0]))) {
                visualTraits.push({ ...comp, zygosity: "VISUAL" });
                expressedIDs.push(comp.id);
                filteredZ1 = filteredZ1.filter(id => id !== comp.alleles[0] && id !== comp.alleles[1]);
                filteredZ2 = filteredZ2.filter(id => id !== comp.alleles[0] && id !== comp.alleles[1]);
            }
        }

        const allZ = [...new Set([...filteredZ1, ...filteredZ2])];
        allZ.forEach(id => {
            let m = mutationDB.find(x => x.id === id);
            if (!m) return;
            if (filteredZ1.includes(id) && filteredZ2.includes(id)) {
                visualTraits.push({ ...m, zygosity: m.type.includes("ID") || m.type.includes("AD") ? "DF" : "VISUAL" });
                expressedIDs.push(m.id);
            } else if (m.type.includes("ID") || m.type.includes("AD")) {
                visualTraits.push({ ...m, zygosity: "SF" });
                expressedIDs.push(m.id);
            } else {
                const zKey = filteredZ1.includes(id) ? "z1" : "z2";
                splitTraits.push({ ...m, zKey });
            }
        });
    }

    let finalWords = [];
    let modifiers = visualTraits.filter(m => m.cat > 1).sort((a, b) => nameRank(a.cat) - nameRank(b.cat));
    let baseColorMuts = visualTraits.filter(m => m.cat === 1);

    function formatModWord(m) {
        let pName = m.customName ? m.customName : m.name;
        if (m.id === "dark_factor") return m.zygosity === "DF" ? "DD" : "D";
        if (m.zygosity === "SF" || m.zygosity === "DF") return `${m.zygosity} ${pName}`;
        return pName;
    }

    let zLinkedMods = modifiers.filter(m => m.type === "SLR" || m.type === "SLID");
    let otherMods = modifiers.filter(m => !(m.type === "SLR" || m.type === "SLID"));

    let outputUnits = otherMods.map(m => ({ rank: nameRank(m.cat), text: formatModWord(m) }));

    if (zLinkedMods.length > 0) {
        zLinkedMods.sort((a, b) => {
            let idxA = zNamingOrder.indexOf(a.locus);
            let idxB = zNamingOrder.indexOf(b.locus);
            if(idxA === -1) idxA = 99;
            if(idxB === -1) idxB = 99;
            return idxA - idxB;
        });
        const zRank = Math.min(...zLinkedMods.map(m => nameRank(m.cat)));
        outputUnits.push({ rank: zRank, text: zLinkedMods.map(formatModWord).join("-") });
    }

    outputUnits.sort((a, b) => a.rank - b.rank);
    outputUnits.forEach(u => finalWords.push(u.text));

    let baseName = baseColorMuts.length > 0 ? baseColorMuts.map(m => m.name).join(" ") : "green";
    finalWords.push(baseName);

    let finalName = finalWords.join(" ");
    // Sentence-case the whole phenotype: only the very first letter of the
    // full name is uppercase (abbreviations like D/DD/SF/DF are already the
    // correct case and are untouched since they only ever appear later in
    // the string, not as the very first character here unless they already
    // are the first word — in which case they're already correctly cased).
    finalName = capitalizeFirst(finalName);

    if (splitTraits.length > 0) {
        splitTraits.sort((a, b) => nameRank(a.cat) - nameRank(b.cat));

        const zGroups = {};
        const zOrder = [];
        const splitUnits = [];

        splitTraits.forEach(m => {
            if (m.zKey) {
                if (!zGroups[m.zKey]) { zGroups[m.zKey] = []; zOrder.push(m.zKey); }
                zGroups[m.zKey].push(m);
            } else {
                splitUnits.push(m.name);
            }
        });
        
        zOrder.forEach(k => {
            zGroups[k].sort((a, b) => {
                let idxA = zNamingOrder.indexOf(a.locus);
                let idxB = zNamingOrder.indexOf(b.locus);
                if(idxA === -1) idxA = 99;
                if(idxB === -1) idxB = 99;
                return idxA - idxB;
            });
            splitUnits.push(zGroups[k].map(m => m.name).join("-"));
        });

        finalName += "/" + splitUnits.join("/");
    }

    if (indPhase) finalName += (indPhase === "T1" ? " type 1" : (indPhase === "T2" ? " type 2" : " " + indPhase));
    if (hasSL) finalName += ` (${sex})`;

    return { symbol: renderFormat(symbolParts.join("; ")), name: finalName, expressedIDs: expressedIDs };
}

// ==========================================
// PURE COMPUTATION CORE — no DOM access anywhere in this function. This is
// what calculateGenetics() calls to do the actual genetics, and it's also
// exactly what the self-test harness below calls, so the tested code path
// and the shipped code path are identical, not a parallel copy.
// sireState/damState: { z1, z2, autoGenes, dfPhase } — the same shape parseState() returns.
// ==========================================
function computeOffspring(sireState, damState) {
    const sire = sireState, dam = damState;
    const hasSL = sire.z1.length > 0 || sire.z2.length > 0 || dam.z1.length > 0;

    let sIndPhase = null, dIndPhase = null;
    let sBlHets = sire.autoGenes['bl'] ? sire.autoGenes['bl'].filter(a => a !== "+") : [];
    if (sire.dfPhase && sBlHets.length === 1) sIndPhase = sire.dfPhase;
    let dBlHets = dam.autoGenes['bl'] ? dam.autoGenes['bl'].filter(a => a !== "+") : [];
    if (dam.dfPhase && dBlHets.length === 1) dIndPhase = dam.dfPhase;

    const sireBlDfChr = getParentBlDfChromosomes(sire.autoGenes, sire.dfPhase);
    const sireBlDfBlock = buildLinkedBlDfSymbol(sireBlDfChr.bl_c1, sireBlDfChr.df_c1, sireBlDfChr.bl_c2, sireBlDfChr.df_c2);
    const damBlDfChr = getParentBlDfChromosomes(dam.autoGenes, dam.dfPhase);
    const damBlDfBlock = buildLinkedBlDfSymbol(damBlDfChr.bl_c1, damBlDfChr.df_c1, damBlDfChr.bl_c2, damBlDfChr.df_c2);

    const sirePheno = translatePhenotype(sire.z1, sire.z2, sire.autoGenes, "male", sIndPhase, true, false, sireBlDfBlock);
    const damPheno = translatePhenotype(dam.z1, [], dam.autoGenes, "female", dIndPhase, true, false, damBlDfBlock);

    // Parental Z haplotype patterns (which loci sit on which chromosome) —
    // used below purely to flag which offspring rows are cross-over
    // products, i.e. Z gametes that match neither parental chromosome.
    const sireChrom1Loci = zMapOrder.filter(l => sire.z1.some(a => mutationDB.find(m => m.id === a)?.locus === l));
    const sireChrom2Loci = zMapOrder.filter(l => sire.z2.some(a => mutationDB.find(m => m.id === a)?.locus === l));
    const recombinationPossible = (sireChrom1Loci.length + sireChrom2Loci.length) >= 2 &&
        JSON.stringify(sireChrom1Loci) !== JSON.stringify(sireChrom2Loci);

    const sireZGametes = generateZGametesMale(sire.z1, sire.z2);
    const sireAutoGametes = generateAutosomalGametes(sire.autoGenes, sire.dfPhase);
    const damZGametes = [{ chr: 'Z', genes: dam.z1, prob: 0.5 }, { chr: 'W', genes: [], prob: 0.5 }];
    const damAutoGametes = generateAutosomalGametes(dam.autoGenes, dam.dfPhase);

    let rawOffspring = {};

    sireZGametes.forEach(sz => {
        const szLoci = [...new Set(sz.genes.map(a => mutationDB.find(m => m.id === a)?.locus).filter(Boolean))].sort();
        const isCrossover = recombinationPossible &&
            JSON.stringify(szLoci) !== JSON.stringify([...sireChrom1Loci].sort()) &&
            JSON.stringify(szLoci) !== JSON.stringify([...sireChrom2Loci].sort());

        damZGametes.forEach(dz => {
            const sex = dz.chr === "W" ? "female" : "male";
            sireAutoGametes.forEach(sa => {
                damAutoGametes.forEach(da => {
                    const prob = sz.prob * dz.prob * sa.prob * da.prob;
                    if (prob === 0) return;

                    const auto = {};
                    [...Object.keys(sa.genes), ...Object.keys(da.genes)].forEach(l => {
                        auto[l] = [sa.genes[l] || "+", da.genes[l] || "+"];
                    });

                    let indPhase = null;
                    let df_c1 = sa.genes['dark_factor'] || "+", bl_c1 = sa.genes['bl'] || "+";
                    let df_c2 = da.genes['dark_factor'] || "+", bl_c2 = da.genes['bl'] || "+";
                    let isDfHet = (df_c1 !== "+" || df_c2 !== "+") && !(df_c1 !== "+" && df_c2 !== "+");
                    let isBlSplit = ((bl_c1 !== "+" ? 1 : 0) + (bl_c2 !== "+" ? 1 : 0)) === 1;
                    if (isDfHet && isBlSplit) indPhase = df_c1 !== "+" ? (bl_c1 !== "+" ? "type 2" : "type 1") : (bl_c2 !== "+" ? "type 2" : "type 1");

                    const blDfBlock = buildLinkedBlDfSymbol(bl_c1, df_c1, bl_c2, df_c2);
                    const pheno = translatePhenotype(sz.genes, dz.genes, auto, sex, indPhase, hasSL, true, blDfBlock);
                    const key = pheno.symbol + pheno.name;

                    if (!rawOffspring[key]) rawOffspring[key] = { ...pheno, prob: 0, crossover: isCrossover };
                    rawOffspring[key].prob += prob;
                });
            });
        });
    });

    return { hasSL, sirePheno, damPheno, offspringArray: Object.values(rawOffspring), unknownLinkagePairs: sireZGametes.unknownLinkagePairs || [] };
}

function calculateGenetics() {
    const sire = parseState("sire-categories", true);
    const dam = parseState("dam-categories", false);
    const { hasSL, sirePheno, damPheno, offspringArray, unknownLinkagePairs } = computeOffspring(sire, dam);

    const sireName = sirePheno.name.replace(" (male)", "");
    const damName = damPheno.name.replace(" (female)", "");
    document.getElementById("parents-summary").innerHTML = `
        <div class="parents-heading">Parents</div>
        <table class="parents-table">
            <thead><tr><th class="col-genetic-formula">Genetic Formulas</th><th>Phenotype / Mutation Name</th></tr></thead>
            <tbody>
                <tr><td class="genetic-formula col-genetic-formula">${sirePheno.symbol}</td><td><strong>&#9794; Male:</strong> ${sireName}</td></tr>
                <tr><td class="genetic-formula col-genetic-formula">${damPheno.symbol}</td><td><strong>&#9792; Female:</strong> ${damName}</td></tr>
            </tbody>
        </table>`;

    renderResults(offspringArray, hasSL, true, unknownLinkagePairs);

    // Snapshot just what the results view needs (already-rendered symbol/name
    // strings + probabilities + expressedIDs for the warnings check) so
    // shareResults() can serialize it into a link without re-deriving
    // anything from the input UI. Captured *after* renderResults() so the
    // offspring order here matches what was just displayed (it sorts
    // offspringArray in place by probability).
    lastCalcData = {
        sire: { symbol: sirePheno.symbol, name: sireName },
        dam: { symbol: damPheno.symbol, name: damName },
        hasSL: hasSL,
        offspring: offspringArray.map(r => ({ symbol: r.symbol, name: r.name, prob: r.prob, expressedIDs: r.expressedIDs }))
    };
    document.getElementById("share-link-box").style.display = "none";
    document.getElementById("share-link-box").innerHTML = "";
}

function renderResults(resultsData, hasSL, showShareButton = true, unknownLinkagePairs = []) {
    const container = document.getElementById("results-container");
    const content = document.getElementById("results-content");
    content.innerHTML = "";

    resultsData.sort((a, b) => b.prob - a.prob);
    let allExpressedIDs = [];
    resultsData.forEach(r => allExpressedIDs = allExpressedIDs.concat(r.expressedIDs));

    function buildTableHTML(data) {
        const maxProb = Math.max(...data.map(r => r.prob), 0.0001);
        return `<table><thead><tr><th class="col-genetic-formula">Genetic Formulas</th><th>Mutation / Phenotype Name</th><th>Probability</th></tr></thead><tbody>` +
            data.map(r => `<tr><td class="genetic-formula col-genetic-formula"><strong>${r.symbol}</strong></td>` +
                `<td>${r.name}${r.crossover ? '<span class="co-badge" title="Cross-over product: this offspring inherited a combination of sex-linked genes that were on different Z chromosomes in the sire.">cross-over</span>' : ''}</td>` +
                `<td><div class="prob-cell"><span class="prob-num">${(r.prob * 100).toFixed(2)}%</span><span class="prob-bar"><i style="width:${Math.max(3, r.prob / maxProb * 100).toFixed(1)}%"></i></span></div></td></tr>`).join("") +
            `</tbody></table>`;
    }

    if (!hasSL) {
        content.innerHTML = buildTableHTML(resultsData);
    } else {
        let maleOffspring = resultsData.filter(r => r.name.includes('(male)'));
        let femaleOffspring = resultsData.filter(r => r.name.includes('(female)'));
        let html = "";
        if (maleOffspring.length > 0) html += `<h3 class="sex-m">Male offspring <span class="sexmark">1.0</span></h3>` + buildTableHTML(maleOffspring);
        if (femaleOffspring.length > 0) html += `<h3 class="sex-f">Female offspring <span class="sexmark">0.1</span></h3>` + buildTableHTML(femaleOffspring);
        content.innerHTML = html;
    }

    const warnings = generateBreedingWarnings([...new Set(allExpressedIDs)]);
    warnings.forEach(note => {
        content.innerHTML += `<div class="mutation-warning-note">${note}</div>`;
    });

    // Dynamic, data-driven version of the old hardcoded greywing note: this
    // fires for ANY sex-linked locus pair actually in play in this specific
    // cross that lacks a confirmed cross-over rate in linkageDB — not just
    // the one locus someone remembered to hand-annotate.
    unknownLinkagePairs.forEach(pair => {
        const names = pair.loci.map(l => mutationDB.find(m => m.locus === l)?.name || l);
        content.innerHTML += `<div class="mutation-warning-note linkage">No published cross-over rate exists between <strong>${names[0]}</strong> and <strong>${names[1]}</strong> in any Agapornis species. This result assumes they're inherited fully independently (50/50) until that data is measured — see the Cross-over data panel below.</div>`;
    });

    container.style.display = "block";
    container.scrollIntoView({ behavior: 'smooth' });

    // Share Results is only meaningful once real results exist, and is
    // hidden entirely when this render call is itself a read-only shared
    // view (nothing new to share from there).
    const shareContainer = document.getElementById("share-container");
    if (shareContainer) shareContainer.style.display = showShareButton ? "block" : "none";
}

function generateBreedingWarnings(mutIDs) {
    const warnings = [];

    const eumelaninIDs = ["nsl_ino", "dec", "pastel", "bronze_fallow", "dilute", "pale_fallow", "dun_fallow", "rec_pied", "faded", "marbled", "dm_jade", "sl_ino", "pallid", "pale", "cinnamon", "dom_pied", "dom_reduced", "dom_edged", "euwing", "grey_factor", "sl_dom_greywing"];
    const psittacineIDs = ["aqua", "blue1", "blue2", "rose_blue", "turquoise", "teal", "orange_face", "pale_headed"];

    let euCount = mutIDs.filter(id => eumelaninIDs.includes(id) || mutationDB.find(m => m.id === id)?.alleles.some(a => eumelaninIDs.includes(a))).length;
    if (euCount >= 2) warnings.push("This combines multiple eumelanin mutations. Such combinations reduce dark pigment and are generally considered visually unrecognizable/not accepted by breed standards.");

    let psitCount = mutIDs.filter(id => psittacineIDs.includes(id) || mutationDB.find(m => m.id === id)?.alleles.some(a => psittacineIDs.includes(a))).length;
    if (psitCount >= 2) warnings.push("This combines multiple psittacine mutations, which is generally avoided as the visual result is not clearly recognizable.");

    if (mutIDs.some(id => mutationDB.find(m => m.id === id)?.isCompound)) {
        warnings.push("These mutations are alleles of the same gene. Combining them typically produces an intermediate, non-standard result rather than a distinct new mutation which are not accepted at exhibitions.");
    }

    return warnings;
}

// ==========================================
// SHARE RESULTS
// ==========================================
// Encodes lastCalcData into the URL's hash fragment (#shared=...) rather
// than sending anything to a server — this app has no backend, and the
// hash never leaves the browser on a plain link click/paste. Opening that
// URL re-runs mutationDB/generateBreedingWarnings() locally against the
// decoded data, so the payload only needs the already-rendered symbol/name
// strings, probabilities, and expressedIDs — not the full parent UI state.

function encodeSharePayload(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

function decodeSharePayload(str) {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
}

function shareResults() {
    if (!lastCalcData) return;
    const encoded = encodeSharePayload(lastCalcData);
    const url = `${window.location.origin}${window.location.pathname}#shared=${encoded}`;

    const box = document.getElementById("share-link-box");
    box.style.display = "flex";
    box.innerHTML = `<input type="text" id="share-link-input" readonly><button type="button" id="copy-link-btn" onclick="copyShareLink()">Copy Link</button>`;
    const input = document.getElementById("share-link-input");
    input.value = url;
    input.focus();
    input.select();
}

function copyShareLink() {
    const input = document.getElementById("share-link-input");
    const btn = document.getElementById("copy-link-btn");
    if (!input) return;
    input.select();
    input.setSelectionRange(0, input.value.length);

    const showResult = (ok) => {
        if (!btn) return;
        const original = "Copy Link";
        btn.textContent = ok ? "Copied!" : "Press Ctrl+C";
        setTimeout(() => { btn.textContent = original; }, 1500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(() => showResult(true)).catch(() => {
            try { showResult(document.execCommand("copy")); } catch (e) { showResult(false); }
        });
    } else {
        try { showResult(document.execCommand("copy")); } catch (e) { showResult(false); }
    }
}

// Replaces the interactive calculator with a read-only rendering of a
// shared link's breeding results: parents' phenotype/genotype and the
// offspring genotype/phenotype/probability table — nothing else from the
// original selection UI is shown or reconstructed.
function enterSharedView(payload) {
    const headerControls = document.getElementById("header-controls");
    const symbolToggle = document.getElementById("symbol-toggle-wrap");
    const calcUI = document.getElementById("calculator-ui");
    const controls = document.getElementById("controls-container");
    if (headerControls) headerControls.style.display = "none";
    if (symbolToggle) symbolToggle.style.display = "none";
    if (calcUI) calcUI.style.display = "none";
    if (controls) controls.style.display = "none";

    const banner = document.getElementById("shared-banner");
    if (banner) {
        banner.style.display = "flex";
        banner.innerHTML = `<span>You're viewing shared breeding results (read-only).</span><button type="button" onclick="exitSharedView()">Start New Calculation</button>`;
    }

    document.getElementById("parents-summary").innerHTML = `
        <div class="parents-heading">Parents</div>
        <table class="parents-table">
            <thead><tr><th class="col-genetic-formula">Genetic Formulas</th><th>Phenotype / Mutation Name</th></tr></thead>
            <tbody>
                <tr><td class="genetic-formula col-genetic-formula">${payload.sire.symbol}</td><td><strong>&#9794; Male:</strong> ${payload.sire.name}</td></tr>
                <tr><td class="genetic-formula col-genetic-formula">${payload.dam.symbol}</td><td><strong>&#9792; Female:</strong> ${payload.dam.name}</td></tr>
            </tbody>
        </table>`;

    renderResults(payload.offspring, payload.hasSL, false);
}

function exitSharedView() {
    window.location.hash = "";
    window.location.reload();
}

function initSharedViewFromURL() {
    const hash = window.location.hash;
    if (!hash.startsWith("#shared=")) return;
    try {
        const payload = decodeSharePayload(hash.slice("#shared=".length));
        enterSharedView(payload);
    } catch (e) {
        console.error("Failed to load shared results link:", e);
    }
}

// ==========================================
// SPECIES DROPDOWN (custom, for partial-italic option text)
// ==========================================
// A native <select><option> can't render inline <i> tags — every browser
// shows plain text inside dropdown options. So the visible control here is
// a custom listbox; the original <select id="species"> stays in the DOM
// (hidden) purely as the value store everything else already reads via
// document.getElementById("species").value, and updateUI() is called
// directly on selection instead of relying on a native change event.
function initSpeciesDropdown() {
    const wrapper = document.getElementById("species-custom");
    const trigger = document.getElementById("species-trigger");
    const triggerLabel = document.getElementById("species-trigger-label");
    const optionsList = document.getElementById("species-options");
    const hiddenSelect = document.getElementById("species");
    if (!wrapper || !trigger || !optionsList || !hiddenSelect) return;

    function closeList() {
        optionsList.style.display = "none";
        trigger.setAttribute("aria-expanded", "false");
    }

    trigger.addEventListener("click", () => {
        const isOpen = optionsList.style.display === "block";
        optionsList.style.display = isOpen ? "none" : "block";
        trigger.setAttribute("aria-expanded", String(!isOpen));
    });

    optionsList.querySelectorAll("li[role=\"option\"]").forEach(li => {
        li.addEventListener("click", () => {
            const value = li.getAttribute("data-value");
            triggerLabel.innerHTML = li.innerHTML;
            hiddenSelect.value = value;
            closeList();
            updateUI();
        });
    });

    document.addEventListener("click", (e) => {
        if (!wrapper.contains(e.target)) closeList();
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeList();
    });
}

// ==========================================
// SELF-TEST HARNESS — known-answer regression checks, run against the exact
// same computeOffspring()/translatePhenotype() code path the app uses (not
// a parallel re-implementation). This exists specifically so a future edit
// that silently breaks a ratio — the class of bug this project has hit
// before — shows up immediately as a red panel instead of a hand-checked
// "looks right" guess. Percentages here are whole-clutch (each sex is half
// the clutch, so e.g. "all daughters visual" reads as 50%, not 100%).
// ==========================================
function blankParent() { return { z1: [], z2: [], autoGenes: {}, dfPhase: null }; }
function pctOf(offspringArray, matcher) { return offspringArray.filter(matcher).reduce((s, r) => s + r.prob, 0); }
const _near = (a, b, eps = 0.006) => Math.abs(a - b) <= eps;

const SELF_TESTS = [
  { name: "Autosomal recessive: aqua split × split → 25% visual",
    run() { const s = blankParent(), d = blankParent(); s.autoGenes.bl = ["aqua", "+"]; d.autoGenes.bl = ["aqua", "+"];
      const { offspringArray } = computeOffspring(s, d);
      const v = pctOf(offspringArray, r => /^aqua/i.test(r.name));
      return { pass: _near(v, .25), got: (v * 100).toFixed(1) + "%", want: "25.0%" }; } },

  { name: "No sex-linked gene active → results are not split by sex",
    run() { const s = blankParent(), d = blankParent(); s.autoGenes.bl = ["aqua", "+"]; d.autoGenes.bl = ["aqua", "+"];
      const { hasSL } = computeOffspring(s, d);
      return { pass: hasSL === false, got: `hasSL=${hasSL}`, want: "false" }; } },

  { name: "CITED (ABE International): green/SL-ino cock × SL-ino hen → 25/25/25/25",
    run() { const s = blankParent(); s.z1 = ["sl_ino"]; const d = blankParent(); d.z1 = ["sl_ino"];
      const { offspringArray } = computeOffspring(s, d);
      const inoM = pctOf(offspringArray, r => /^sl ino green \(male\)$/i.test(r.name));
      const splitM = pctOf(offspringArray, r => /^green\/sl ino \(male\)$/i.test(r.name));
      const inoF = pctOf(offspringArray, r => /^sl ino green \(female\)$/i.test(r.name));
      const grnF = pctOf(offspringArray, r => /^green \(female\)$/i.test(r.name));
      const pass = _near(inoM, .25) && _near(splitM, .25) && _near(inoF, .25) && _near(grnF, .25);
      return { pass, got: `${(inoM*100).toFixed(0)}/${(splitM*100).toFixed(0)}/${(inoF*100).toFixed(0)}/${(grnF*100).toFixed(0)}%`, want: "25/25/25/25%" }; } },

  { name: "Sex-linked split cock × normal hen → 25% of clutch visual daughters",
    run() { const s = blankParent(); s.z1 = ["sl_ino"]; const d = blankParent();
      const { offspringArray } = computeOffspring(s, d);
      const dv = pctOf(offspringArray, r => /^sl ino green \(female\)$/i.test(r.name));
      return { pass: _near(dv, .25), got: (dv * 100).toFixed(1) + "%", want: "25.0%" }; } },

  { name: "Cross-over: cinnamon(Z1) + opaline(Z2), r=0.33 → recombinant daughters 8.25%",
    run() { const s = blankParent(); s.z1 = ["cinnamon"]; s.z2 = ["opaline"]; const d = blankParent();
      const { offspringArray } = computeOffspring(s, d);
      const rec = pctOf(offspringArray, r => /\(female\)$/.test(r.name) && /cinnamon/i.test(r.name) && /opaline/i.test(r.name));
      return { pass: _near(rec, .0825, .006), got: (rec * 100).toFixed(2) + "%", want: "≈8.25%" }; } },

  { name: "Cross-over rows are flagged: recombinant daughter carries the crossover badge",
    run() { const s = blankParent(); s.z1 = ["cinnamon"]; s.z2 = ["opaline"]; const d = blankParent();
      const { offspringArray } = computeOffspring(s, d);
      const flagged = offspringArray.some(r => r.crossover && /cinnamon/i.test(r.name) && /opaline/i.test(r.name));
      return { pass: flagged, got: flagged ? "flagged" : "not flagged", want: "flagged" }; } },

  { name: "Incomplete dominant: dark factor SF × SF → 25% DD, 50% D",
    run() { const s = blankParent(); s.autoGenes.dark_factor = ["dark_factor", "+"]; const d = blankParent(); d.autoGenes.dark_factor = ["dark_factor", "+"];
      const { offspringArray } = computeOffspring(s, d);
      const dd = pctOf(offspringArray, r => /^dd /i.test(r.name)); const d1 = pctOf(offspringArray, r => /^d /i.test(r.name));
      return { pass: _near(dd, .25) && _near(d1, .5), got: `DD ${(dd*100).toFixed(0)}% / D ${(d1*100).toFixed(0)}%`, want: "25% / 50%" }; } },

  { name: "Homozygous selection parses as visual, not split (this project's earlier regression bug)",
    run() { const t = translatePhenotype([], [], { bl: ["aqua", "aqua"] }, "male", null, false, true, null);
      return { pass: /^aqua$/i.test(t.name) && !t.name.includes("/"), got: t.name, want: "Aqua (no split suffix)" }; } },

  { name: "Heterozygous selection parses as split, not visual",
    run() { const t = translatePhenotype([], [], { bl: ["aqua", "+"] }, "male", null, false, true, null);
      return { pass: /^green\/aqua$/i.test(t.name), got: t.name, want: "Green/aqua" }; } },

  { name: "Dark factor × blue-series linked phase (T1): 43/43/7/7 class split",
    run() { const s = blankParent(); s.autoGenes.dark_factor = ["dark_factor", "+"]; s.autoGenes.bl = ["aqua", "+"]; s.dfPhase = "T1"; const d = blankParent();
      const { offspringArray } = computeOffspring(s, d);
      const dOnly = pctOf(offspringArray, r => /^d green$/i.test(r.name));
      const aquaOnly = pctOf(offspringArray, r => /^green\/aqua$/i.test(r.name));
      const clean = pctOf(offspringArray, r => /^green$/i.test(r.name));
      const both = pctOf(offspringArray, r => /^d green\/aqua/i.test(r.name));
      const pass = _near(dOnly, .43, .02) && _near(aquaOnly, .43, .02) && _near(clean, .07, .01) && _near(both, .07, .01);
      return { pass, got: `${(dOnly*100).toFixed(0)}/${(aquaOnly*100).toFixed(0)}/${(clean*100).toFixed(0)}/${(both*100).toFixed(0)}%`, want: "43/43/7/7%" }; } },

  { name: "Two independent AR splits (aqua & orange face) → 6.25% double-visual",
    run() { const s = blankParent(); s.autoGenes.bl = ["aqua", "+"]; s.autoGenes.orange_face = ["orange_face", "+"];
      const d = blankParent(); d.autoGenes.bl = ["aqua", "+"]; d.autoGenes.orange_face = ["orange_face", "+"];
      const { offspringArray } = computeOffspring(s, d);
      const both = pctOf(offspringArray, r => /orange face aqua/i.test(r.name));
      return { pass: _near(both, .0625), got: (both * 100).toFixed(2) + "%", want: "6.25%" }; } },

  { name: "getLinkage: confirmed pair (opaline↔cinnamon) returns the measured rate",
    run() { const l = getLinkage("opaline", "cinnamon");
      return { pass: _near(l.recombination, .33, .001) && l.confidence === "confirmed", got: `${l.recombination} / ${l.confidence}`, want: "0.33 / confirmed" }; } },

  { name: "getLinkage: unconfirmed pair (cinnamon↔sl_dom_greywing) reports unknown, defaults to 0.5",
    run() { const l = getLinkage("cinnamon", "sl_dom_greywing");
      return { pass: _near(l.recombination, .5) && l.confidence === "unknown", got: `${l.recombination} / ${l.confidence}`, want: "0.5 / unknown" }; } },

  { name: "A cross actually using an unconfirmed SL pair surfaces a dynamic warning",
    run() { const s = blankParent(); s.z1 = ["cinnamon"]; s.z2 = ["sl_dom_greywing"]; const d = blankParent();
      const { unknownLinkagePairs } = computeOffspring(s, d);
      const flagged = unknownLinkagePairs.some(p => p.loci.includes("cinnamon") && p.loci.includes("sl_dom_greywing"));
      return { pass: flagged, got: JSON.stringify(unknownLinkagePairs), want: "contains [cinnamon, sl_dom_greywing]" }; } },

  { name: "A cross with only confirmed-linkage loci reports no unknown pairs",
    run() { const s = blankParent(); s.z1 = ["cinnamon"]; s.z2 = ["opaline"]; const d = blankParent();
      const { unknownLinkagePairs } = computeOffspring(s, d);
      return { pass: unknownLinkagePairs.length === 0, got: JSON.stringify(unknownLinkagePairs), want: "[]" }; } },

  { name: "Sum of all offspring probabilities across a full cross = 100%",
    run() { const s = blankParent(); s.z1 = ["cinnamon"]; s.z2 = ["opaline"]; s.autoGenes.bl = ["aqua", "+"];
      const d = blankParent(); d.z1 = ["opaline"];
      const { offspringArray } = computeOffspring(s, d);
      const tot = offspringArray.reduce((sum, r) => sum + r.prob, 0);
      return { pass: _near(tot, 1), got: (tot * 100).toFixed(1) + "%", want: "100.0%" }; } }
];

function runSelfTests() {
  const panel = document.getElementById("self-test-body");
  const pill = document.getElementById("self-test-pill");
  if (!panel || !pill) return;
  let passCount = 0;
  const rows = SELF_TESTS.map(t => {
    let r; try { r = t.run(); } catch (e) { r = { pass: false, got: "error: " + e.message, want: "—" }; }
    if (r.pass) passCount++;
    return `<div class="tcase ${r.pass ? "" : "fail"}"><div class="tcase-top"><span>${t.name}</span><span class="tstatus ${r.pass ? "ok" : "bad"}">${r.pass ? "pass" : "FAIL"}</span></div><div class="tdetail">got ${r.got} · want ${r.want}</div></div>`;
  });
  panel.innerHTML = rows.join("");
  pill.textContent = `${passCount}/${SELF_TESTS.length}`;
  pill.className = "pill " + (passCount === SELF_TESTS.length ? "ok" : "bad");
  const details = document.getElementById("self-test-panel");
  if (details && passCount !== SELF_TESTS.length) details.open = true;
}

// ==========================================
// CROSS-OVER DATA PANEL — a visible, always-accurate rendering of exactly
// what generateZGametesMale() actually knows vs. assumes. Built by pairing
// up every sex-linked locus in the mutation database combinatorially and
// looking each pair up via getLinkage(), so a newly added SL mutation
// automatically shows up here as "unknown" with no extra step required —
// nobody has to remember to hand-write a note for it.
// ==========================================
function renderLinkagePanel() {
    const body = document.getElementById("linkage-body");
    if (!body) return;
    const locusName = l => mutationDB.find(m => m.locus === l)?.name || l;
    const pairs = [];
    for (let i = 0; i < allZloci.length; i++) {
        for (let j = i + 1; j < allZloci.length; j++) {
            pairs.push({ a: allZloci[i], b: allZloci[j], ...getLinkage(allZloci[i], allZloci[j]) });
        }
    }
    pairs.sort((p, q) => (p.confidence === q.confidence) ? 0 : (p.confidence === "confirmed" ? -1 : 1));
    body.innerHTML = pairs.map(p => `<div class="lrow">
        <span class="lpair">${locusName(p.a)} &harr; ${locusName(p.b)}</span>
        <span class="lval">${p.confidence === "confirmed" ? (p.recombination * 100).toFixed(0) + "% cross-over" : "assumed independent"}</span>
        <span class="lpill ${p.confidence === "confirmed" ? "ok" : "bad"}">${p.confidence}</span>
        <span class="lsource">${p.source}</span>
    </div>`).join("");
}

document.addEventListener("DOMContentLoaded", initSpeciesDropdown);
document.addEventListener("DOMContentLoaded", initSharedViewFromURL);
document.addEventListener("DOMContentLoaded", runSelfTests);
document.addEventListener("DOMContentLoaded", renderLinkagePanel);
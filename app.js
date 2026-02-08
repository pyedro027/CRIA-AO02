// =========================
//  CHECK-IN EPI - app.js
//  Corrigido: EPIs por função (à prova de acento/espaco)
//  + Setores por função (Obra/Logística com vários setores)
// =========================

// ====== UTIL: normaliza texto (tira acento, baixa caixa, remove espaços duplos)
const normalizeText = (text) =>
  String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

// ====== MAP: EPIs por função (use as chaves "bonitas" aqui)
const ROLE_EPI_MAP = {
  Soldador: [
    "Capacete",
    "Óculos",
    "Protetor auricular",
    "Luvas (raspa)",
    "Máscara/Respirador",
    "Protetor facial",
    "Avental/perneira (se aplicável)",
    "Botina",
    "Manga longa",
    "Colete refletivo",
  ],
  Eletricista: [
    "Capacete",
    "Óculos",
    "Luvas isolantes",
    "Botina",
    "Vestimenta anti-chama (se aplicável)",
    "Protetor auricular",
    "Cinto de segurança (altura)",
    "Colete refletivo",
  ],
  Logística: [
    "Colete refletivo",
    "Botina",
    "Luvas (nitrílica/vaqueta)",
    "Óculos",
    "Protetor auricular (se necessário)",
  ],
  Manutenção: [
    "Capacete",
    "Óculos",
    "Protetor auricular",
    "Luvas (nitrílica/raspa)",
    "Botina",
    "Máscara/Respirador",
    "Colete refletivo",
    "Cinto de segurança (altura)",
  ],
  Produção: [
    "Capacete",
    "Óculos",
    "Protetor auricular",
    "Luvas",
    "Botina",
    "Máscara/Respirador",
    "Colete refletivo",
    "Protetor facial (se necessário)",
  ],
  Obra: [
    "Capacete",
    "Óculos",
    "Protetor auricular",
    "Luvas",
    "Botina",
    "Máscara/Respirador",
    "Colete refletivo",
    "Cinto de segurança (altura)",
  ],
  Administrativo: [],
  Outro: [
    "Capacete",
    "Óculos",
    "Protetor auricular",
    "Luvas",
    "Botina",
    "Máscara/Respirador",
    "Colete refletivo",
  ],
};

// ====== Administrativo: EPIs base se marcar visita operacional
const ADMIN_BASE_EPI = ["Capacete", "Óculos", "Botina", "Colete refletivo"];

// ====== STORAGE
const STORAGE_KEY = "epiCheckins";

// ====== VIEWS
const views = {
  login: document.getElementById("view-login"),
  checklist: document.getElementById("view-checklist"),
  summary: document.getElementById("view-summary"),
  history: document.getElementById("view-history"),
};

const showView = (viewName) => {
  Object.values(views).forEach((view) => view.classList.add("hidden"));
  views[viewName].classList.remove("hidden");
};

// ====== DOM
const loginForm = document.getElementById("login-form");
const workerName = document.getElementById("worker-name");
const workerId = document.getElementById("worker-id");
const workerRole = document.getElementById("worker-role");
const workerSector = document.getElementById("worker-sector");
const workerShift = document.getElementById("worker-shift");

const adminVisit = document.getElementById("admin-visit");
const adminVisitWrapper = document.getElementById("admin-visit-wrapper");

const checklistContainer = document.getElementById("checklist-container");
const workerSummary = document.getElementById("worker-summary");

const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const safetyAlert = document.getElementById("safety-alert");

const signatureInput = document.getElementById("signature-input");
const truthConfirm = document.getElementById("truth-confirm");
const signatureHelper = document.getElementById("signature-helper");
const finishButton = document.getElementById("finish-checkin");

const summaryContent = document.getElementById("summary-content");
const newCheckinButton = document.getElementById("new-checkin");
const changeRoleButton = document.getElementById("change-role");

const demoButton = document.getElementById("demo-button");

const historyList = document.getElementById("history-list");
const filterName = document.getElementById("filter-name");
const filterStart = document.getElementById("filter-start");
const filterEnd = document.getElementById("filter-end");
const applyFiltersButton = document.getElementById("apply-filters");
const clearHistoryButton = document.getElementById("clear-history");

const modal = document.getElementById("modal");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");
const printRecordButton = document.getElementById("print-record");

// ====== STATE
let currentUser = null;
let currentChecklist = [];
let currentRecordForPrint = null;

// ====== Emojis por item
const itemEmojis = [
  { keyword: "Capacete", emoji: "🪖" },
  { keyword: "Óculos", emoji: "🕶️" },
  { keyword: "Protetor auricular", emoji: "🎧" },
  { keyword: "Luvas", emoji: "🧤" },
  { keyword: "Máscara", emoji: "😷" },
  { keyword: "Respirador", emoji: "😷" },
  { keyword: "Protetor facial", emoji: "🛡️" },
  { keyword: "Botina", emoji: "🥾" },
  { keyword: "Colete", emoji: "🦺" },
  { keyword: "Cinto", emoji: "🪢" },
  { keyword: "Vestimenta", emoji: "🧥" },
  { keyword: "Avental", emoji: "🦺" },
  { keyword: "Manga", emoji: "👕" },
];

// =========================
// 1) FUNÇÃO: achar chave correta do ROLE_EPI_MAP mesmo com acento/erro
// =========================
const getCanonicalRoleKey = (roleValue) => {
  const roleNorm = normalizeText(roleValue);
  const keys = Object.keys(ROLE_EPI_MAP);

  // procura chave que normalizada bate
  const match = keys.find((k) => normalizeText(k) === roleNorm);
  return match || roleValue; // se não achar, devolve original (pode virar fallback)
};

// =========================
// 2) SETORES por função
// =========================
const SECTORS_BY_ROLE = {
  Soldador: ["Produção", "Manutenção", "Almoxarifado", "Obra"],
  Eletricista: ["Manutenção", "Produção", "Obra"],
  Logística: [
    "Recebimento",
    "Armazenagem",
    "Separação",
    "Expedição",
    "Transporte",
    "Controle de Estoque",
    "Conferência",
  ],
  Manutenção: ["Manutenção", "Produção", "Obra"],
  Produção: ["Produção", "Linha 1", "Linha 2", "Qualidade"],
  Obra: [
    "Frente de Serviço",
    "Almoxarifado de Obra",
    "Elétrica",
    "Hidráulica",
    "Estruturas",
    "Acabamento",
    "Terraplanagem",
    "Logística de Obra",
    "Administrativo de Obra",
    "Segurança do Trabalho",
  ],
  Administrativo: ["Administrativo", "RH", "Financeiro", "Compras"],
  Outro: ["Produção", "Manutenção", "Logística", "Almoxarifado", "Obra", "Administrativo"],
};

const DEFAULT_SECTORS = ["Produção", "Manutenção", "Logística", "Almoxarifado", "Obra", "Administrativo"];

// =========================
// 3) CHECKLIST por função
// =========================
const getChecklistForRole = (rawRole) => {
  const roleKey = getCanonicalRoleKey(rawRole);

  if (roleKey === "Administrativo") {
    return adminVisit.checked ? ADMIN_BASE_EPI : [];
  }

  return ROLE_EPI_MAP[roleKey] || [];
};

const buildChecklist = () => {
  const items = getChecklistForRole(currentUser.role);
  currentChecklist = items.map((item, index) => ({
    id: `${getCanonicalRoleKey(currentUser.role)}-${index}`,
    name: item,
    status: "",
    observation: "",
    photo: "",
  }));
};

// =========================
// 4) PROGRESSO
// =========================
const updateProgress = () => {
  const total = currentChecklist.length;
  const answered = currentChecklist.filter((item) => item.status).length;
  progressText.textContent = `Respondidos: ${answered}/${total}`;
  const percent = total === 0 ? 100 : Math.round((answered / total) * 100);
  progressFill.style.width = `${percent}%`;

  const hasIssue = currentChecklist.some(
    (item) => item.status === "Não possuo" || item.status === "Danificado"
  );
  safetyAlert.classList.toggle("hidden", !hasIssue);
};

// =========================
// 5) RENDER CHECKLIST
// =========================
const createStatusSelect = (item) => {
  const wrapper = document.createElement("div");
  wrapper.className = "item__status";

  const label = document.createElement("label");
  label.className = "field";
  label.innerHTML = `
    <span>Status obrigatório</span>
    <select data-id="${item.id}" class="status-select">
      <option value="" disabled ${item.status ? "" : "selected"}>Selecione</option>
      <option value="OK" ${item.status === "OK" ? "selected" : ""}>OK (estou usando)</option>
      <option value="Não possuo" ${item.status === "Não possuo" ? "selected" : ""}>Não possuo</option>
      <option value="Danificado" ${item.status === "Danificado" ? "selected" : ""}>Danificado</option>
    </select>
  `;

  wrapper.appendChild(label);
  return wrapper;
};

const createObservation = (item) => {
  const label = document.createElement("label");
  label.className = "field";
  label.innerHTML = `
    <span>Observação (opcional)</span>
    <textarea data-id="${item.id}" class="observation-input" placeholder="Descreva algo relevante"></textarea>
  `;
  label.querySelector("textarea").value = item.observation;
  return label;
};

const createPhotoSection = (item) => {
  const wrapper = document.createElement("div");
  wrapper.className = "item__photo";

  const helper = document.createElement("span");
  helper.className = "helper";
  helper.textContent = "Recomendado anexar foto";

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.dataset.id = item.id;
  input.className = "photo-input";

  const preview = document.createElement("img");
  preview.className = "photo-preview";
  preview.alt = "Preview da foto";
  preview.src = item.photo || "";
  preview.style.display = item.photo ? "block" : "none";

  wrapper.appendChild(helper);
  wrapper.appendChild(input);
  wrapper.appendChild(preview);

  wrapper.dataset.visible =
    item.status === "Danificado" || item.status === "Não possuo";

  if (wrapper.dataset.visible !== "true") wrapper.style.display = "none";

  return wrapper;
};

const renderChecklist = () => {
  checklistContainer.innerHTML = "";

  if (currentChecklist.length === 0) {
    const empty = document.createElement("p");
    empty.className = "helper";
    empty.textContent =
      "Sem EPIs obrigatórios para esta função. Marque visita operacional se necessário.";
    checklistContainer.appendChild(empty);
  }

  currentChecklist.forEach((item) => {
    const card = document.createElement("div");
    card.className = "item";

    const emoji = itemEmojis.find((entry) => item.name.includes(entry.keyword));
    const title = document.createElement("div");
    title.className = "item__title";
    title.textContent = `${emoji ? emoji.emoji + " " : ""}${item.name}`;

    card.appendChild(title);
    card.appendChild(createStatusSelect(item));
    card.appendChild(createObservation(item));
    card.appendChild(createPhotoSection(item));

    checklistContainer.appendChild(card);
  });

  updateProgress();
};

// =========================
// 6) ASSINATURA
// =========================
const signatureMatches = (signature, name) => {
  const normalizedSignature = normalizeText(signature);
  const normalizedName = normalizeText(name);

  const signatureWords = normalizedSignature.split(" ").filter(Boolean);
  const nameWords = normalizedName.split(" ").filter(Boolean);

  if (signatureWords.length < 2 || nameWords.length === 0) return false;

  const firstNameMatches = signatureWords.includes(nameWords[0]);
  const lastNameMatches =
    nameWords.length > 1
      ? signatureWords.includes(nameWords[nameWords.length - 1])
      : true;

  const allWordsPresent = nameWords.every((word) => signatureWords.includes(word));

  return (firstNameMatches && lastNameMatches) || allWordsPresent;
};

const updateSignatureHelper = (message, isError = false) => {
  signatureHelper.textContent = message;
  signatureHelper.style.color = isError ? "var(--danger)" : "var(--muted)";
};

const updateSignatureValidation = () => {
  if (!currentUser) return false;
  const signatureValue = signatureInput.value.trim();
  const confirmation = truthConfirm.checked;

  if (!signatureValue) {
    updateSignatureHelper("Informe sua assinatura para finalizar.", true);
    return false;
  }

  if (!signatureMatches(signatureValue, currentUser.name)) {
    updateSignatureHelper("A assinatura precisa corresponder ao nome do trabalhador.", true);
    return false;
  }

  if (!confirmation) {
    updateSignatureHelper("Confirme a declaração de verdade.", true);
    return false;
  }

  updateSignatureHelper("Assinatura validada.");
  return true;
};

// =========================
// 7) INPUTS -> STATE
// =========================
const updateChecklistFromInputs = () => {
  document.querySelectorAll(".status-select").forEach((select) => {
    const item = currentChecklist.find((entry) => entry.id === select.dataset.id);
    if (item) item.status = select.value;
  });

  document.querySelectorAll(".observation-input").forEach((input) => {
    const item = currentChecklist.find((entry) => entry.id === input.dataset.id);
    if (item) item.observation = input.value;
  });

  document.querySelectorAll(".photo-input").forEach((input) => {
    const item = currentChecklist.find((entry) => entry.id === input.dataset.id);
    if (!item) return;

    const photoSection = input.closest(".item__photo");
    if (item.status === "Danificado" || item.status === "Não possuo") {
      photoSection.style.display = "flex";
    } else {
      photoSection.style.display = "none";
    }
  });

  updateProgress();
};

const readPhotoFile = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });

// =========================
// 8) STORAGE
// =========================
const getStoredRecords = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const saveRecords = (records) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

const buildRecord = () => {
  const date = new Date();
  const okItems = currentChecklist.filter((item) => item.status === "OK");
  const issueItems = currentChecklist.filter(
    (item) => item.status === "Não possuo" || item.status === "Danificado"
  );

  return {
    id: `${Date.now()}`,
    name: currentUser.name,
    workerId: currentUser.id,
    role: getCanonicalRoleKey(currentUser.role),
    sector: currentUser.sector,
    shift: currentUser.shift,
    visitOperational: currentUser.visitOperational,
    dateISO: date.toISOString(),
    dateLabel: date.toLocaleString("pt-BR"),
    signature: signatureInput.value.trim(),
    checklist: currentChecklist,
    okItems,
    issueItems,
    statusGeneral: issueItems.length > 0 ? "PENDÊNCIA" : "OK",
  };
};

// =========================
// 9) SUMMARY / HISTORY / MODAL
// =========================
const renderSummary = (record) => {
  summaryContent.innerHTML = `
    <div class="summary-block">
      <h3>Dados do trabalhador</h3>
      <p><strong>Nome:</strong> ${record.name}</p>
      <p><strong>Matrícula/ID:</strong> ${record.workerId || "-"}</p>
      <p><strong>Função:</strong> ${record.role}</p>
      <p><strong>Setor:</strong> ${record.sector}</p>
      <p><strong>Turno:</strong> ${record.shift}</p>
      <p><strong>Data/Hora:</strong> ${record.dateLabel}</p>
    </div>
    <div class="summary-block">
      <h3>Itens OK</h3>
      <ul>
        ${record.okItems.length ? record.okItems.map((item) => `<li>${item.name}</li>`).join("") : "<li>Nenhum item marcado como OK.</li>"}
      </ul>
    </div>
    <div class="summary-block">
      <h3>Itens com problema</h3>
      <ul>
        ${record.issueItems.length ? record.issueItems.map((item) => `<li>${item.name} - ${item.status}${item.observation ? ` (Obs: ${item.observation})` : ""}</li>`).join("") : "<li>Sem pendências.</li>"}
      </ul>
    </div>
  `;

  if (record.issueItems.some((item) => item.photo)) {
    const photoBlock = document.createElement("div");
    photoBlock.className = "summary-block";
    photoBlock.innerHTML = "<h3>Fotos anexadas</h3>";

    const grid = document.createElement("div");
    grid.className = "photo-grid";

    record.issueItems.forEach((item) => {
      if (!item.photo) return;
      const link = document.createElement("a");
      link.href = item.photo;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.innerHTML = `<img class="photo-preview" src="${item.photo}" alt="Foto do item ${item.name}" />
        <span>${item.name}</span>`;
      grid.appendChild(link);
    });

    photoBlock.appendChild(grid);
    summaryContent.appendChild(photoBlock);
  }
};

const renderHistory = (records) => {
  historyList.innerHTML = "";

  if (records.length === 0) {
    historyList.innerHTML = '<p class="helper">Nenhum check-in encontrado.</p>';
    return;
  }

  records.forEach((record) => {
    const item = document.createElement("div");
    item.className = "history__item";

    const statusClass =
      record.statusGeneral === "OK" ? "status-pill--ok" : "status-pill--warn";

    item.innerHTML = `
      <div>
        <strong>${record.name}</strong> · ${record.role} · ${record.sector}
      </div>
      <div class="helper">${record.dateLabel}</div>
      <span class="status-pill ${statusClass}">${record.statusGeneral}</span>
      <div class="actions">
        <button class="btn btn--ghost" type="button" data-action="details" data-id="${record.id}">Ver detalhes</button>
      </div>
    `;
    historyList.appendChild(item);
  });
};

const renderModalDetails = (record) => {
  modalBody.innerHTML = `
    <h2>Detalhes do check-in</h2>
    <p><strong>Nome:</strong> ${record.name}</p>
    <p><strong>Matrícula/ID:</strong> ${record.workerId || "-"}</p>
    <p><strong>Função:</strong> ${record.role}</p>
    <p><strong>Setor:</strong> ${record.sector}</p>
    <p><strong>Turno:</strong> ${record.shift}</p>
    <p><strong>Data/Hora:</strong> ${record.dateLabel}</p>
    <p><strong>Status geral:</strong> ${record.statusGeneral}</p>

    <div class="summary-block">
      <h3>Itens OK</h3>
      <ul>
        ${record.okItems.length ? record.okItems.map((item) => `<li>${item.name}</li>`).join("") : "<li>Nenhum item OK.</li>"}
      </ul>
    </div>

    <div class="summary-block">
      <h3>Itens com problema</h3>
      <ul>
        ${record.issueItems.length ? record.issueItems.map((item) => `<li>${item.name} - ${item.status}${item.observation ? ` (Obs: ${item.observation})` : ""}</li>`).join("") : "<li>Sem pendências.</li>"}
      </ul>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
};

const applyFilters = () => {
  const nameValue = normalizeText(filterName.value);
  const startValue = filterStart.value ? new Date(filterStart.value) : null;
  const endValue = filterEnd.value ? new Date(filterEnd.value) : null;

  const records = getStoredRecords().filter((record) => {
    const matchesName = nameValue
      ? normalizeText(record.name).includes(nameValue)
      : true;

    const recordDate = new Date(record.dateISO);

    const matchesStart = startValue ? recordDate >= startValue : true;
    const matchesEnd = endValue
      ? recordDate <= new Date(endValue.setHours(23, 59, 59, 999))
      : true;

    return matchesName && matchesStart && matchesEnd;
  });

  renderHistory(records);
};

const resetChecklistForm = () => {
  signatureInput.value = "";
  truthConfirm.checked = false;
  signatureHelper.textContent = "";
};

// =========================
// 10) EVENTOS DO CHECKLIST
// =========================
const handleStatusChange = (event) => {
  if (!event.target.classList.contains("status-select")) return;
  updateChecklistFromInputs();

  const item = currentChecklist.find((entry) => entry.id === event.target.dataset.id);
  const card = event.target.closest(".item");
  const photoSection = card.querySelector(".item__photo");

  if (item && (item.status === "Danificado" || item.status === "Não possuo")) {
    photoSection.style.display = "flex";
  } else {
    photoSection.style.display = "none";
  }
};

const handleObservationChange = (event) => {
  if (!event.target.classList.contains("observation-input")) return;
  updateChecklistFromInputs();
};

const handlePhotoChange = async (event) => {
  if (!event.target.classList.contains("photo-input")) return;
  const file = event.target.files[0];
  if (!file) return;

  const photoData = await readPhotoFile(file);
  const item = currentChecklist.find((entry) => entry.id === event.target.dataset.id);

  if (item) {
    item.photo = photoData;
    const preview = event.target.parentElement.querySelector(".photo-preview");
    preview.src = photoData;
    preview.style.display = "block";
  }
};

// =========================
// 11) FINALIZAR
// =========================
const handleFinish = () => {
  updateChecklistFromInputs();

  const unanswered = currentChecklist.some((item) => !item.status);
  if (unanswered) {
    alert("Responda todos os itens do checklist antes de finalizar.");
    return;
  }

  if (!updateSignatureValidation()) return;

  const record = buildRecord();
  const records = getStoredRecords();
  records.unshift(record);
  saveRecords(records);

  renderSummary(record);
  renderHistory(records);
  showView("summary");
};

// =========================
// 12) START CHECK-IN
// =========================
const startCheckin = () => {
  currentUser = {
    name: workerName.value.trim(),
    id: workerId.value.trim(),
    role: workerRole.value,     // mantém valor do select
    sector: workerSector.value,
    shift: workerShift.value,
    visitOperational: adminVisit.checked,
  };

  buildChecklist();

  workerSummary.textContent = `${currentUser.name} · ${getCanonicalRoleKey(currentUser.role)} · ${currentUser.sector} · ${currentUser.shift}`;

  resetChecklistForm();
  renderChecklist();
  showView("checklist");
};

// =========================
// 13) SETOR DINÂMICO POR FUNÇÃO
// =========================
const updateSectorByRole = () => {
  const roleRaw = workerRole.value;
  const roleKey = getCanonicalRoleKey(roleRaw);

  // regra do administrativo (mostrar checkbox)
  adminVisitWrapper.style.display = roleKey === "Administrativo" ? "flex" : "none";
  if (roleKey !== "Administrativo") adminVisit.checked = false;

  // popula setores
  workerSector.innerHTML = `<option value="" disabled selected>Selecione</option>`;
  const sectors = SECTORS_BY_ROLE[roleKey] || DEFAULT_SECTORS;

  sectors.forEach((sector) => {
    const opt = document.createElement("option");
    opt.value = sector;
    opt.textContent = sector;
    workerSector.appendChild(opt);
  });
};

// =========================
// 14) DEMO
// =========================
const addDemoRecords = () => {
  const demoRecords = [
    {
      id: `demo-${Date.now()}`,
      name: "Carlos Pereira",
      workerId: "1020",
      role: "Soldador",
      sector: "Produção",
      shift: "Manhã",
      visitOperational: false,
      dateISO: new Date().toISOString(),
      dateLabel: new Date().toLocaleString("pt-BR"),
      signature: "Carlos Pereira",
      checklist: ROLE_EPI_MAP.Soldador.map((item, index) => ({
        id: `Soldador-${index}`,
        name: item,
        status: "OK",
        observation: "",
        photo: "",
      })),
    },
  ];

  demoRecords.forEach((record) => {
    record.okItems = record.checklist.filter((item) => item.status === "OK");
    record.issueItems = record.checklist.filter(
      (item) => item.status === "Não possuo" || item.status === "Danificado"
    );
    record.statusGeneral = record.issueItems.length > 0 ? "PENDÊNCIA" : "OK";
  });

  const records = getStoredRecords();
  saveRecords([...demoRecords, ...records]);
  renderHistory(getStoredRecords());
  alert("Registros de demonstração adicionados ao histórico.");
};

// =========================
// 15) LISTENERS
// =========================
loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  startCheckin();
});

workerRole.addEventListener("change", updateSectorByRole);

checklistContainer.addEventListener("change", handleStatusChange);
checklistContainer.addEventListener("input", handleObservationChange);
checklistContainer.addEventListener("change", handlePhotoChange);

signatureInput.addEventListener("input", updateSignatureValidation);
truthConfirm.addEventListener("change", updateSignatureValidation);

finishButton.addEventListener("click", handleFinish);

newCheckinButton.addEventListener("click", () => showView("login"));
changeRoleButton.addEventListener("click", () => showView("login"));

demoButton.addEventListener("click", addDemoRecords);

applyFiltersButton.addEventListener("click", applyFilters);

clearHistoryButton.addEventListener("click", () => {
  if (!confirm("Tem certeza que deseja limpar todo o histórico?")) return;
  const confirmation = prompt("Digite LIMPAR para confirmar a exclusão definitiva do histórico.");
  if (confirmation !== "LIMPAR") {
    alert("Confirmação incorreta. Histórico preservado.");
    return;
  }
  saveRecords([]);
  renderHistory([]);
});

historyList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.action === "details") {
    const record = getStoredRecords().find((entry) => entry.id === button.dataset.id);
    if (record) {
      currentRecordForPrint = record;
      renderModalDetails(record);
    }
  }
});

// modal fechar
if (modalClose) {
  modalClose.addEventListener("click", () => {
    modal.classList.add("hidden");
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  });
}
if (modal) {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.add("hidden");
      modal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });
}

// imprimir
if (printRecordButton) {
  printRecordButton.addEventListener("click", () => {
    window.print();
  });
}

// ESC fecha modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal && modal.style.display === "flex") {
    modal.classList.add("hidden");
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
});

// Navegação por data-view
Array.from(document.querySelectorAll("[data-view]")).forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.view;
    showView(target === "history" ? "history" : "login");
    if (target === "history") renderHistory(getStoredRecords());
  });
});

// =========================
// 16) INIT
// =========================
updateSectorByRole();
renderHistory(getStoredRecords());
showView("login");



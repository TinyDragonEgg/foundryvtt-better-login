const MODULE_ID = "better-login-screen";
const PWD_KEY = `${MODULE_ID}.passwords`;

console.log(`${MODULE_ID} | script loaded`);

Hooks.on("renderJoinGameForm", (_app, html) => {
  console.log(`${MODULE_ID} | renderJoinGameForm fired`, html);
});

function loadPasswords() {
  try {
    return JSON.parse(localStorage.getItem(PWD_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function storePassword(userId, password) {
  const map = loadPasswords();
  if (password) {
    map[userId] = password;
  } else {
    delete map[userId];
  }
  localStorage.setItem(PWD_KEY, JSON.stringify(map));
}

Hooks.on("renderJoinGameForm", (_app, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  patchLoginForm(root);
});

function patchLoginForm(root) {
  const select = root.querySelector("select[name='userid']");
  if (!select) return;

  const options = [...select.options].filter(o => o.value);
  if (options.length === 0) return;

  select.hidden = true;

  const saved = loadPasswords();
  const users = game.data?.users ?? [];

  // --- User card grid ---
  const grid = document.createElement("div");
  grid.className = "bls-grid";

  for (const opt of options) {
    const userData = users.find(u => u._id === opt.value);
    const color = userData?.color ?? "#888888";
    const avatar = userData?.avatar || null;

    const card = document.createElement("button");
    card.type = "button";
    card.className = "bls-card";
    card.dataset.userid = opt.value;
    card.style.setProperty("--bls-color", color);

    if (avatar) {
      card.innerHTML = `
        <img class="bls-avatar" src="${avatar}" alt="${opt.text}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <span class="bls-avatar bls-initial" style="display:none">${opt.text[0].toUpperCase()}</span>
        <span class="bls-name">${opt.text}</span>
      `;
    } else {
      card.innerHTML = `
        <span class="bls-avatar bls-initial">${opt.text[0].toUpperCase()}</span>
        <span class="bls-name">${opt.text}</span>
      `;
    }

    if (opt.selected) card.classList.add("bls-selected");

    card.addEventListener("click", () => selectUser(root, grid, select, opt, saved));
    grid.appendChild(card);
  }

  select.parentNode.insertBefore(grid, select.nextSibling);

  // --- Remember-me checkbox ---
  const pwdInput = root.querySelector("input[name='password']");
  const pwdGroup = pwdInput?.closest(".form-group, .form-fields, .form-group-stacked");
  if (pwdGroup) {
    const rememberWrap = document.createElement("div");
    rememberWrap.className = "form-group bls-remember-wrap";
    rememberWrap.innerHTML = `
      <label class="bls-remember-label">
        <input type="checkbox" class="bls-remember">
        Remember password on this browser
      </label>
    `;
    pwdGroup.after(rememberWrap);
  }

  // Pre-fill if current user already has a saved password
  const currentUserId = select.value;
  if (currentUserId && saved[currentUserId] && pwdInput) {
    pwdInput.value = saved[currentUserId];
    const cb = root.querySelector(".bls-remember");
    if (cb) cb.checked = true;
  }

  // --- Password show/hide toggle ---
  if (pwdInput) {
    const eyeBtn = document.createElement("button");
    eyeBtn.type = "button";
    eyeBtn.className = "bls-eye-btn";
    eyeBtn.title = "Show / hide password";
    eyeBtn.innerHTML = '<i class="fas fa-eye"></i>';
    eyeBtn.addEventListener("click", () => {
      const visible = pwdInput.type === "text";
      pwdInput.type = visible ? "password" : "text";
      eyeBtn.innerHTML = visible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
    pwdInput.classList.add("bls-pwd-input");
    pwdInput.after(eyeBtn);
  }

  // --- Save / clear password on submit ---
  const form = root.tagName === "FORM" ? root : root.querySelector("form");
  if (form) {
    form.addEventListener("submit", () => {
      const userId = select.value;
      const pwd = pwdInput?.value ?? "";
      const remember = root.querySelector(".bls-remember")?.checked ?? false;
      storePassword(userId, remember ? pwd : "");
    }, { capture: true });
  }
}

function selectUser(root, grid, select, opt, saved) {
  grid.querySelectorAll(".bls-card").forEach(c => c.classList.remove("bls-selected"));
  grid.querySelector(`[data-userid="${opt.value}"]`)?.classList.add("bls-selected");
  select.value = opt.value;

  const pwdInput = root.querySelector("input[name='password']");
  const rememberCb = root.querySelector(".bls-remember");
  if (!pwdInput) return;

  const savedPwd = saved[opt.value] ?? "";
  pwdInput.value = savedPwd;
  if (rememberCb) rememberCb.checked = !!savedPwd;
  pwdInput.focus();
}

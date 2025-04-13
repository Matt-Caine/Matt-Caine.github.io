let activeContracts = [];

function generateRandomContract() {
  const resource =
    RESOURCE_TYPES[Math.floor(Math.random() * RESOURCE_TYPES.length)];
  const destination =
    SYSTEM_NAMES[Math.floor(Math.random() * SYSTEM_NAMES.length)];
  const amount = Math.floor(Math.random() * 100) + 50;
  const baseReward = RESOURCE_DATA[resource].base * amount;
  const reward = Math.floor(baseReward * (1.4 + Math.random() * 0.8));
  const duration = 180000 + Math.floor(Math.random() * 300000); // 3–8 minutes

  const contract = {
    id: `CON-${Date.now().toString().slice(-5)}`,
    resource,
    amount,
    destination,
    reward,
    timeLimit: duration,
    expiresAt: Date.now() + duration,
    status: "available",
    issuer: Math.random() < 0.3 ? getRandomCorporation() : "ΛTLΛS | ΞQUINOX™",
  };

  activeContracts.push(contract);
  renderContracts();
}

function renderContracts() {
  const container = document.getElementById("contractsContainer");
  container.innerHTML = "";

  const available = activeContracts.filter((c) => c.status === "available");

  if (available.length > 0) {
    available.forEach((contract, i) => {
      const card = document.createElement("div");
      card.className = "contract-card";

      const minutes = Math.floor(contract.timeLimit / 60000);
      const canDeliver = player.location === contract.destination;

      card.innerHTML = `
                <h6>Deliver ${contract.amount}${UNIT} ${contract.resource}</h6>
                <p>To: ${contract.destination}</p>
                <small>Reward: <span class="text-success">${contract.reward.toFixed(
                  2
                )}ᶜ</span></small><br>
                <small>Time Limit: <span>${minutes} minute${
        minutes !== 1 ? "s" : ""
      }</span></small>
                <div class="contract-card-buttons mt-2">
                    <button class="btn btn-success btn-sm" onclick="acceptContract(${i})">Accept</button>
                    <button class="btn btn-danger btn-sm" onclick="declineContract(${i})">Decline</button>
                </div>
            `;
      container.appendChild(card);
    });
  } else {
    container.innerHTML = `<p class="text-muted small">No contracts available.</p>`;
  }
}

function acceptContract(index) {
  const contract = activeContracts[index];
  if (!contract || contract.status !== "available") return;
  contract.status = "accepted";
  contract.issuedAt = Date.now();
  renderContracts();
  renderActiveContracts();
}

function declineContract(index) {
  activeContracts.splice(index, 1);
  renderContracts();
}

function checkContractExpirations() {
  const now = Date.now();
  activeContracts.forEach((contract) => {
    if (
      contract.status === "accepted" &&
      now > contract.issuedAt + contract.timeLimit
    ) {
      contract.status = "failed";
      log(`Contract ${contract.id} failed.`);
    }
  });
  renderContracts();
}

function tryFulfillContracts() {
  activeContracts.forEach((c) => {
    if (c.status !== "accepted") return;
    if (player.location !== c.destination) return;

    const invAmount =
      player.inventory[c.resource]?.reduce((sum, [q]) => sum + q, 0) || 0;
    if (invAmount >= c.amount) {
      let toRemove = c.amount;
      const batches = player.inventory[c.resource];
      for (let i = 0; i < batches.length && toRemove > 0; i++) {
        const [qty, price] = batches[i];
        const take = Math.min(qty, toRemove);
        batches[i][0] -= take;
        toRemove -= take;
      }
      player.inventory[c.resource] = batches.filter(([q]) => q > 0);

      player.credits += c.reward;
      c.status = "completed";
      flash("credits");

      log(
        `Contract ${c.id} completed: Delivered ${c.amount}${UNIT} of ${c.resource} to ${c.destination}. +${c.reward}ᶜ`
      );
      logMarket(
        `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> completed <span class="text-info">${
          c.id
        }</span>: Delivered <strong>${c.amount}${UNIT}</strong> of <strong>${
          c.resource
        }</strong> to <strong>${
          c.destination
        }</strong> — <span class="text-success">+${c.reward.toFixed(2)}ᶜ</span>`
      );

      updateUI();
    }
  });
}

function renderActiveContracts() {
  const container = document.getElementById("activeContractsContainer");
  if (!container) return;

  container.innerHTML = "";

  const now = Date.now();
  const active = activeContracts.filter((c) => c.status === "accepted");

  if (active.length === 0) {
    container.innerHTML =
      "<div class='text-muted small'>No active contracts.</div>";
    return;
  }

  active.forEach((contract) => {
    const remaining = Math.max(0, contract.issuedAt + contract.timeLimit - now);
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const countdown = `${mins}m ${secs}s`;

    const canDeliver =
      player.location === contract.destination &&
      (player.inventory[contract.resource]?.reduce((sum, [q]) => sum + q, 0) ||
        0) >= contract.amount;

    const card = document.createElement("div");
    card.className = "contract-card";
    card.innerHTML = `
            <h6>Deliver ${contract.amount}${UNIT} ${contract.resource}</h6>
            <p>To: ${contract.destination}</p>
            <small>Reward: <span class="text-success">${contract.reward.toFixed(
              2
            )}ᶜ</span></small><br>
            <small>Time Left: <span class="${
              remaining < 60000 ? "text-danger" : ""
            }">${countdown}</span></small>
            <div class="contract-card-buttons mt-2">
                <button class="btn btn-success btn-sm" ${
                  canDeliver
                    ? `onclick="deliverContract('${contract.id}')"`
                    : 'disabled title="Wrong location or insufficient resources."'
                }>
                    Deliver
                </button>
            </div>
        `;
    container.appendChild(card);
  });
}

function acceptContract(index) {
  const contract = activeContracts[index];
  if (!contract || contract.status !== "available") return;
  contract.status = "accepted";
  contract.issuedAt = Date.now();
  renderContracts();
  renderActiveContracts();
}

function declineContract(index) {
  activeContracts.splice(index, 1);
  renderContracts();
}

function checkContractExpirations() {
  const now = Date.now();
  activeContracts.forEach((contract) => {
    if (
      contract.status === "accepted" &&
      now > contract.issuedAt + contract.timeLimit
    ) {
      contract.status = "failed";
      log(`Contract ${contract.id} failed.`);
    }
  });
  renderContracts();
}

function tryFulfillContracts() {
  activeContracts.forEach((c) => {
    if (c.status !== "accepted") return;
    if (player.location !== c.destination) return;

    const invAmount =
      player.inventory[c.resource]?.reduce((sum, [q]) => sum + q, 0) || 0;
    if (invAmount >= c.amount) {
      let toRemove = c.amount;
      const batches = player.inventory[c.resource];
      for (let i = 0; i < batches.length && toRemove > 0; i++) {
        const [qty, price] = batches[i];
        const take = Math.min(qty, toRemove);
        batches[i][0] -= take;
        toRemove -= take;
      }
      player.inventory[c.resource] = batches.filter(([q]) => q > 0);

      player.credits += c.reward;
      c.status = "completed";
      flash("credits");

      log(
        `Contract ${c.id} completed: Delivered ${c.amount}${UNIT} of ${c.resource} to ${c.destination}. +${c.reward}ᶜ`
      );
      logMarket(
        `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> completed <span class="text-info">${
          c.id
        }</span>: Delivered <strong>${c.amount}${UNIT}</strong> of <strong>${
          c.resource
        }</strong> to <strong>${
          c.destination
        }</strong> — <span class="text-success">+${c.reward.toFixed(2)}ᶜ</span>`
      );

      updateUI();
    }
  });
}

function renderActiveContracts() {
  const container = document.getElementById("activeContractsContainer");
  if (!container) return;

  container.innerHTML = "";

  const now = Date.now();
  const active = activeContracts.filter((c) => c.status === "accepted");

  if (active.length === 0) {
    container.innerHTML =
      "<div class='text-muted small'>No active contracts.</div>";
    return;
  }

  active.forEach((contract) => {
    const remaining = Math.max(0, contract.issuedAt + contract.timeLimit - now);
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    const countdown = `${mins}m ${secs}s`;

    const canDeliver =
      player.location === contract.destination &&
      (player.inventory[contract.resource]?.reduce((sum, [q]) => sum + q, 0) ||
        0) >= contract.amount;

    const card = document.createElement("div");
    card.className = "contract-card";
    card.innerHTML = `
            <h6>Deliver ${contract.amount}${UNIT} ${contract.resource}</h6>
            <p>To: ${contract.destination}</p>
            <small>Reward: <span class="text-success">${contract.reward.toFixed(
              2
            )}ᶜ</span></small><br>
            <small>Time Left: <span class="${
              remaining < 60000 ? "text-danger" : ""
            }">${countdown}</span></small>
            <div class="contract-card-buttons mt-2">
                <button class="btn btn-success btn-sm" ${
                  canDeliver
                    ? `onclick="deliverContract('${contract.id}')"`
                    : 'disabled title="Wrong location or insufficient resources."'
                }>
                    Deliver
                </button>
            </div>
        `;
    container.appendChild(card);
  });
}

function tryFulfillContracts() {
  activeContracts.forEach((c) => {
    if (c.status !== "accepted") return;
    if (player.location !== c.destination) return;

    const invAmount =
      player.inventory[c.resource]?.reduce((sum, [q]) => sum + q, 0) || 0;
    if (invAmount >= c.amount) {
      // Remove resources
      let toRemove = c.amount;
      const batches = player.inventory[c.resource];
      for (let i = 0; i < batches.length && toRemove > 0; i++) {
        const [qty, price] = batches[i];
        const take = Math.min(qty, toRemove);
        batches[i][0] -= take;
        toRemove -= take;
      }
      player.inventory[c.resource] = batches.filter(([q]) => q > 0);

      player.credits += c.reward;
      c.status = "completed";
      flash("credits");

      log(
        `Contract ${c.id} completed: Delivered ${c.amount}${UNIT} of ${c.resource} to ${c.destination}. +${c.reward}ᶜ`
      );
      logMarket(
        `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> completed <span class="text-info">${
          c.id
        }</span>: Delivered <strong>${c.amount}${UNIT}</strong> of <strong>${
          c.resource
        }</strong> to <strong>${
          c.destination
        }</strong> — <span class="text-success">+${c.reward.toFixed(2)}ᶜ</span>`
      );

      updateUI();
    }
  });
}

function acceptContract(index) {
  const contract = activeContracts[index];
  if (!contract || contract.status !== "available") return;
  contract.status = "accepted";
  contract.issuedAt = Date.now();
  renderContracts();
  renderActiveContracts(); // ✅ also update the top list
}

function declineContract(index) {
  activeContracts.splice(index, 1);
  renderContracts();
}

function checkContractExpirations() {
  const now = Date.now();
  activeContracts.forEach((contract) => {
    if (contract.status === "active" && contract.expiresAt <= now) {
      contract.status = "expired";
      log(`Contract ${contract.id} failed.`);
    }
  });
  renderContracts();
}

function tryFulfillContracts() {
  activeContracts.forEach((c) => {
    if (c.status !== "active") return;
    if (player.location !== c.destination) return;

    const invAmount =
      player.inventory[c.resource]?.reduce((sum, [q]) => sum + q, 0) || 0;
    if (invAmount >= c.amount) {
      // Remove resources
      let toRemove = c.amount;
      const batches = player.inventory[c.resource];
      for (let i = 0; i < batches.length && toRemove > 0; i++) {
        const [qty, price] = batches[i];
        const take = Math.min(qty, toRemove);
        batches[i][0] -= take;
        toRemove -= take;
      }
      player.inventory[c.resource] = batches.filter(([q]) => q > 0);

      player.credits += c.reward;
      c.status = "completed";
      flash("credits");

      log(
        `Contract ${c.id} completed: Delivered ${c.amount}${UNIT} of ${c.resource} to ${c.destination}. +${c.reward}ᶜ`
      );
      logMarket(
        `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> completed <span class="text-info">${
          c.id
        }</span>: Delivered <strong>${c.amount}${UNIT}</strong> of <strong>${
          c.resource
        }</strong> to <strong>${
          c.destination
        }</strong> — <span class="text-success">+${c.reward.toFixed(2)}ᶜ</span>`
      );

      updateUI();
    }
  });
}

function renderActiveContracts() {
  const container = document.getElementById("activeContractsContainer");
  if (!container) return;

  container.innerHTML = ""; // Clear existing

  const now = Date.now();
  const active = activeContracts.filter((c) => c.status === "accepted");

  if (active.length === 0) {
    container.innerHTML =
      "<div class='text-muted small'>No active contracts.</div>";
    return;
  }

  active.forEach((contract) => {
    const remaining = Math.max(0, contract.issuedAt + contract.timeLimit - now);
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);

    const countdown = `${mins}m ${secs}s`;

    const card = document.createElement("div");
    card.className = "contract-card";
    card.innerHTML = `
      <h6>Deliver ${contract.amount} ${contract.resource}</h6>
      <p>To: ${contract.destination}</p>
      <small>Reward: <span class="text-success">${
        contract.reward
      }ᶜ</span></small><br>
      <small>Time Left: <span class="${
        remaining < 60000 ? "text-danger" : ""
      }">${countdown}</span></small>
        <div class="contract-card-buttons mt-2">
        <button class="btn btn-success btn-sm" onclick="deliverContract('${
          contract.id
        }')">Deliver</button>
        </div>
      
    `;
    container.appendChild(card);
  });
}

function checkContracts() {
  const now = Date.now();
  activeContracts.forEach((contract) => {
    if (
      contract.status === "accepted" &&
      now > contract.issuedAt + contract.timeLimit
    ) {
      contract.status = "failed";
      logMarket(
        `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> contract ${contract.id} <span class="text-danger">FAILED</span>.`
      );
    }
  });

  renderActiveContracts(); // Optional: refresh active contracts UI
}

function deliverContract(contractId) {
  const contract = activeContracts.find((c) => c.id === contractId);
  if (!contract || contract.status !== "accepted") return;

  if (player.location !== contract.destination) {
    flash("location", "Must be at destination to deliver.");
    return;
  }

  const invAmount =
    player.inventory[contract.resource]?.reduce((sum, [q]) => sum + q, 0) || 0;
  if (invAmount < contract.amount) {
    flash("inventory", "Not enough materials to deliver.");
    return;
  }

  // Fulfill contract
  let toRemove = contract.amount;
  const batches = player.inventory[contract.resource];
  for (let i = 0; i < batches.length && toRemove > 0; i++) {
    const [qty, price] = batches[i];
    const take = Math.min(qty, toRemove);
    batches[i][0] -= take;
    toRemove -= take;
  }
  player.inventory[contract.resource] = batches.filter(([q]) => q > 0);

  player.credits += contract.reward;
  contract.status = "completed";
  flash("credits");

  log(
    `Contract ${contract.id} completed: Delivered ${contract.amount}${UNIT} of ${contract.resource} to ${contract.destination}. +${contract.reward}ᶜ`
  );
  logMarket(
    `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> completed <span class="text-info">${
      contract.id
    }</span>: Delivered <strong>${contract.amount}${UNIT}</strong> of <strong>${
      contract.resource
    }</strong> to <strong>${
      contract.destination
    }</strong> — <span class="text-success">+${contract.reward.toFixed(
      2
    )}ᶜ</span>`
  );

  renderActiveContracts();
  updateUI();
}

function fulfillContract(contractId) {
  const contract = activeContracts.find((c) => c.id === contractId);
  if (!contract || contract.status !== "accepted") return;

  const invAmount =
    player.inventory[contract.resource]?.reduce((sum, [q]) => sum + q, 0) || 0;
  if (player.location !== contract.destination || invAmount < contract.amount)
    return;

  let toRemove = contract.amount;
  const batches = player.inventory[contract.resource];
  for (let i = 0; i < batches.length && toRemove > 0; i++) {
    const [qty] = batches[i];
    const take = Math.min(qty, toRemove);
    batches[i][0] -= take;
    toRemove -= take;
  }
  player.inventory[contract.resource] = batches.filter(([q]) => q > 0);

  player.credits += contract.reward;
  contract.status = "completed";
  flash("credits");

  log(
    `Contract ${contract.id} completed: Delivered ${contract.amount}${UNIT} of ${contract.resource} to ${contract.destination}. +${contract.reward}ᶜ`
  );
  logMarket(
    `<span class="text-warning">ΛTLΛS | ΞQUINOX™</span> completed <span class="text-info">${
      contract.id
    }</span>: Delivered <strong>${contract.amount}${UNIT}</strong> of <strong>${
      contract.resource
    }</strong> to <strong>${
      contract.destination
    }</strong> — <span class="text-success">+${contract.reward.toFixed(
      2
    )}ᶜ</span>`
  );

  updateUI();
  renderActiveContracts(); // refresh UI
}

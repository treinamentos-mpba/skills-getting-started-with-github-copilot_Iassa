document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const totalActivities = document.getElementById("total-activities");
  const totalSpots = document.getElementById("total-spots");

  const baseOption = "<option value=\"\">-- Selecione uma atividade --</option>";

  function setMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();
      const entries = Object.entries(activities);
      const spotsAvailable = entries.reduce((total, [, details]) => {
        return total + Math.max(details.max_participants - details.participants.length, 0);
      }, 0);

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = baseOption;

      totalActivities.textContent = String(entries.length);
      totalSpots.textContent = String(spotsAvailable);

      // Populate activities list
      entries.forEach(([name, details]) => {
        const activityCard = document.createElement("div");

        const spotsLeft = details.max_participants - details.participants.length;
        const isSoldOut = spotsLeft <= 0;
        const fillPercentage = Math.round((details.participants.length / details.max_participants) * 100);

        activityCard.className = `activity-card ${isSoldOut ? "sold-out" : ""}`.trim();

        activityCard.innerHTML = `
          <div class="activity-head">
            <h4>${name}</h4>
            <span class="availability-tag ${isSoldOut ? "" : "open"}">
              ${isSoldOut ? "Lotado" : `${spotsLeft} vagas`}
            </span>
          </div>
          <p>${details.description}</p>
          <p><strong>Horário:</strong> ${details.schedule}</p>
          <div class="capacity">
            <p class="capacity-label"><strong>Ocupação:</strong> ${details.participants.length}/${details.max_participants}</p>
            <div class="capacity-track">
              <span class="capacity-fill" style="width: ${fillPercentage}%"></span>
            </div>
          </div>
          <div class="participants">
            <div class="participants-heading">
              <strong>Participantes</strong>
              <span>${details.participants.length} inscritos</span>
            </div>
            <ul class="participants-list"></ul>
          </div>
        `;

        const participantsList = activityCard.querySelector(".participants-list");
        if (details.participants.length === 0) {
          const emptyItem = document.createElement("li");
          emptyItem.className = "participants-empty";
          emptyItem.textContent = "Ainda não há participantes inscritos.";
          participantsList.appendChild(emptyItem);
        } else {
          details.participants.forEach((participant) => {
            const participantItem = document.createElement("li");
            participantItem.className = "participant-item";

            const participantEmail = document.createElement("span");
            participantEmail.textContent = participant;

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "participant-remove";
            removeButton.setAttribute("aria-label", `Remover ${participant} de ${name}`);
            removeButton.title = "Cancelar inscrição deste participante";
            removeButton.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="m19 6-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            `;
            removeButton.addEventListener("click", async () => {
              removeButton.disabled = true;
              try {
                const response = await fetch(
                  `/activities/${encodeURIComponent(name)}/participants?email=${encodeURIComponent(participant)}`,
                  { method: "DELETE" }
                );
                const result = await response.json();

                if (!response.ok) {
                  throw new Error(result.detail || "Não foi possível cancelar a inscrição.");
                }

                setMessage(`Inscrição de ${participant} cancelada.`, "success");
                await fetchActivities();
              } catch (error) {
                setMessage(error.message || "Falha ao cancelar inscrição. Tente novamente.", "error");
                removeButton.disabled = false;
              }
            });

            participantItem.append(participantEmail, removeButton);
            participantsList.appendChild(participantItem);
          });
        }

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = `${name}${isSoldOut ? " (lotado)" : ""}`;
        option.disabled = isSoldOut;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Falha ao carregar atividades. Tente novamente em instantes.</p>";
      totalActivities.textContent = "-";
      totalSpots.textContent = "-";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        setMessage(result.detail || "Ocorreu um erro na inscrição.", "error");
      }
    } catch (error) {
      setMessage("Falha ao concluir inscrição. Tente novamente.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

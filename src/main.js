import "./styles.css";

const subscribers = [
  "candidate@example.ru",
  "recruiter@example.ru",
  "career.news@example.ru",
];

const form = document.querySelector("#subscribeForm");
const emailInput = document.querySelector("#emailInput");
const emailError = document.querySelector("#emailError");
const subscribersList = document.querySelector("#subscribersList");
const tabsCount = document.querySelector("#tabsCount");
const themeButton = document.querySelector("#themeButton");

let workerPort = null;
let heartbeatTimerId = null;

function isValidEmail(email) {
  const atIndex = email.indexOf("@");
  const dotIndex = email.indexOf(".", atIndex + 1);

  return atIndex > 0 && dotIndex > atIndex + 1 && dotIndex < email.length - 1;
}

function renderSubscribers() {
  subscribersList.replaceChildren();

  subscribers.forEach((email) => {
    const item = document.createElement("li");
    item.textContent = email;
    subscribersList.append(item);
  });
}

function showError(message) {
  emailError.textContent = message;
  emailError.classList.add("is-visible");
}

function hideError() {
  emailError.classList.remove("is-visible");
  emailError.textContent = "";
}

function addSubscriber(email) {
  const normalizedEmail = email.toLowerCase();
  const hasDuplicate = subscribers.some(
    (subscriber) => subscriber.toLowerCase() === normalizedEmail,
  );

  if (!hasDuplicate) {
    subscribers.push(email);
    renderSubscribers();
  }
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";
  themeButton.textContent = isDark ? "Светлая тема" : "Тёмная тема";
}

function sendToWorker(message) {
  if (workerPort) {
    workerPort.postMessage(message);
  }
}

function connectSharedWorker() {
  if (!("SharedWorker" in window)) {
    tabsCount.textContent = "1";
    return;
  }

  const worker = new SharedWorker(new URL("./shared-worker.js", import.meta.url), {
    type: "module",
  });

  workerPort = worker.port;
  workerPort.start();

  workerPort.addEventListener("message", (event) => {
    if (event.data.type !== "state") {
      return;
    }

    tabsCount.textContent = event.data.count;
    applyTheme(event.data.theme);
  });

  sendToWorker({ type: "connect" });
  heartbeatTimerId = window.setInterval(() => {
    sendToWorker({ type: "heartbeat" });
  }, 1000);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();

  if (!isValidEmail(email)) {
    showError("Введите корректный email: нужна @ и точка после неё.");
    return;
  }

  addSubscriber(email);
  emailInput.value = "";
  hideError();
});

emailInput.addEventListener("input", hideError);

themeButton.addEventListener("click", () => {
  const currentTheme = document.documentElement.dataset.theme || "light";
  const nextTheme = currentTheme === "dark" ? "light" : "dark";

  applyTheme(nextTheme);
  sendToWorker({ type: "setTheme", theme: nextTheme });
});

window.addEventListener("pagehide", () => {
  sendToWorker({ type: "disconnect" });

  if (heartbeatTimerId) {
    window.clearInterval(heartbeatTimerId);
  }
});

renderSubscribers();
connectSharedWorker();

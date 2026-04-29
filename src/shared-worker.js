const tabs = new Map();
let theme = "light";

function sendState() {
  tabs.forEach((tab) => {
    tab.port.postMessage({
      type: "state",
      count: tabs.size,
      theme,
    });
  });
}

function clearClosedTabs() {
  const now = Date.now();
  let changed = false;

  tabs.forEach((tab, id) => {
    if (now - tab.lastSeen > 3000) {
      tabs.delete(id);
      changed = true;
    }
  });

  if (changed) {
    sendState();
  }
}

self.addEventListener("connect", (event) => {
  const port = event.ports[0];
  const id = `${Date.now()}-${Math.random()}`;

  tabs.set(id, {
    port,
    lastSeen: Date.now(),
  });

  port.addEventListener("message", (event) => {
    const tab = tabs.get(id);

    if (tab) {
      tab.lastSeen = Date.now();
    }

    if (event.data.type === "disconnect") {
      tabs.delete(id);
      sendState();
    }

    if (event.data.type === "setTheme") {
      theme = event.data.theme === "dark" ? "dark" : "light";
      sendState();
    }

    if (event.data.type === "connect" || event.data.type === "heartbeat") {
      sendState();
    }
  });

  port.start();
  sendState();
});

setInterval(clearClosedTabs, 1000);

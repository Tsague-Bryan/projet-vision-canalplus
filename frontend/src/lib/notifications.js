let audioCtx = null;

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "default") return Notification.requestPermission();
  return Notification.permission;
};

export const playNotificationSound = () => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, audioCtx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.48);
  } catch (_) {}
};

export const notifyUser = async ({ title = "Vision Canal+", body = "Nouvelle notification" } = {}) => {
  playNotificationSound();
  if (!("Notification" in window)) return;
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return;
  if (document.visibilityState === "visible") return;
  new Notification(title, {
    body,
    icon: "/logo.png",
    badge: "/logo.png",
  });
};

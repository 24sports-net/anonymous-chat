const firebaseConfig = {
  apiKey: "AIzaSyD4-VCUGPN1XyQ1Xr-nsygATasnRrukWr4",
  authDomain: "spn-livechat.firebaseapp.com",
  databaseURL: "https://spn-livechat-default-rtdb.firebaseio.com",
  projectId: "spn-livechat",
  storageBucket: "spn-livechat.appspot.com",
  messagingSenderId: "979619554738",
  appId: "1:979619554738:web:a36c0a793988913d5670ab"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const ADMIN_NAMES = ["Admin"]; // You can replace this with admin names
const COLORS = ["#7F66FF", "#00C2D1", "#34B7F1", "#25D366", "#C4F800", "#FFD279", "#FF5C9D", "#53BDEB", "#A259FF", "#FF8A3D"];
let userColors = {};
let currentUser = null;
let replyTo = null;

const nameInput = document.getElementById("name-input");
const nameSubmitBtn = document.getElementById("name-submit-btn");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

nameSubmitBtn.onclick = () => {
  const name = nameInput.value.trim();
  if (!name) return alert("Please enter your name.");
  currentUser = { displayName: name, photoURL: "", email: name + "@anon" };
  document.getElementById("login-container").style.display = "none";
  document.getElementById("chat-container").style.display = "flex";

  const userRef = db.ref("users/" + name);
  userRef.once("value").then(snapshot => {
    if (!snapshot.exists()) {
      userRef.set({ hasJoined: true });
      db.ref("messages").push({
        type: "system",
        text: `${name} joined the chat`,
        timestamp: Date.now()
      });
    }
  });
};

sendBtn.onclick = sendMessage;
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function assignColor(email) {
  if (!userColors[email]) {
    userColors[email] = COLORS[Object.keys(userColors).length % COLORS.length];
  }
  return userColors[email];
}

function formatMessage(text) {
  return text
    .replace(/\*_([^*]+)_\*/g, '<b><i>$1</i></b>')
    .replace(/\*([^*]+)\*/g, '<b>$1</b>')
    .replace(/_([^_]+)_/g, '<i>$1</i>')
    .replace(/{([^}]+)}/g, '<span style="background:yellow;color:black;padding:2px 4px;border-radius:3px;">$1</span>')
    .replace(/~([^~]+)~/g, '<s>$1</s>')
    .replace(/`([^`]+)`/g, '<code style="background:#222;padding:2px 4px;border-radius:4px;">$1</code>')
    .replace(/@(\w+)/g, '<span style="color:#1DA1F2">@$1</span>');
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  if (/https?:\/\//i.test(text)) {
    alert("Links are not allowed");
    messageInput.value = "";
    return;
  }

  const message = {
    name: currentUser.displayName,
    email: currentUser.email,
    photo: currentUser.photoURL || "https://www.gravatar.com/avatar/?d=mp",
    text,
    timestamp: Date.now(),
    replyTo: replyTo || null
  };
  db.ref("messages").push(message);
  messageInput.value = "";
  replyTo = null;
  document.getElementById("reply-preview").style.display = "none";
}

function cancelReply() {
  replyTo = null;
  document.getElementById("reply-preview").style.display = "none";
}

function deleteMessage(key) {
  if (confirm("Are you sure you want to delete this message?")) {
    db.ref("messages/" + key).remove();
  }
}

db.ref("messages").on("value", snap => {
  chatMessages.innerHTML = "";
  const now = Date.now();
  snap.forEach(child => {
    const msg = child.val();
    const age = now - msg.timestamp;

    if (age >= 86400000) {
      db.ref("messages/" + child.key).remove();
      return;
    }

    if (msg.type === "system") {
      const msgEl = document.createElement("div");
      msgEl.className = "system-message";
      msgEl.innerHTML = `
        <div>${msg.text}</div>
        ${ADMIN_NAMES.includes(currentUser.displayName) ? `<span class="material-icons delete-btn" onclick="deleteMessage('${child.key}')">delete</span>` : ""}
      `;
      chatMessages.appendChild(msgEl);
      return;
    }

    const isSent = msg.email === currentUser.email;
    const isAdmin = ADMIN_NAMES.includes(msg.name);
    const nameColor = isAdmin ? "#FF4C4C" : assignColor(msg.email);

    const msgEl = document.createElement("div");
    msgEl.className = `message ${isSent ? "sent" : "received"}`;
    msgEl.innerHTML = `
      <img class="profile-pic" src="${msg.photo}" alt="pfp" />
      <div class="bubble">
        <div class="name" style="color:${nameColor}">
          ${msg.name}${isAdmin ? ' <span class="material-icons admin-verified">verified</span>' : ""}
        </div>
        ${msg.replyTo ? `<div class="reply-to">Replying to: ${msg.replyTo.text}</div>` : ""}
        <div>${formatMessage(msg.text)}</div>
        <div class="time">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
      </div>
      ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${child.key}')">delete</span>` : ""}
    `;

    msgEl.ondblclick = () => {
      replyTo = {
        name: msg.name,
        text: msg.text
      };
      document.getElementById("reply-to-name").innerText = msg.name;
      document.getElementById("reply-to-text").innerText = msg.text;
      document.getElementById("reply-preview").style.display = "block";
    };

    chatMessages.appendChild(msgEl);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

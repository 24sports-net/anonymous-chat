// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCiqvsaKPkx4STOfBMmLvSiXb_neAVHmyw",
  authDomain: "anonymous-chat-24spn.firebaseapp.com",
  databaseURL: "https://anonymous-chat-24spn-default-rtdb.firebaseio.com",
  projectId: "anonymous-chat-24spn",
  storageBucket: "anonymous-chat-24spn.appspot.com",
  messagingSenderId: "763513935011",
  appId: "1:763513935011:web:cccdd5c0babd6fac8ddb16"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

const ADMIN_EMAIL = "24sports.social@gmail.com";
const COLORS = ["#25D366", "#A142F4", "#3F51B5", "#00BCD4", "#00BFA5", "#FF4081", "#128C7E", "#673AB7", "#9C27B0"];
let userColors = {};
let currentUser = null;
let replyTo = null;
let isTyping = false;
let typingTimeout;

// DOM Elements
const userBtn = document.getElementById("user-btn");
const adminBtn = document.getElementById("admin-btn");
const userLogin = document.getElementById("user-login");
const adminLogin = document.getElementById("admin-login");
const roleSelection = document.getElementById("role-selection");
const loginScreen = document.getElementById("login-screen");
const chatContainer = document.getElementById("chat-container");
const googleLogin = document.getElementById("google-login");
const goBackUser = document.getElementById("go-back-user");
const goBackAdmin = document.getElementById("go-back-admin");
const enterChat = document.getElementById("enter-chat");
const usernameInput = document.getElementById("username-input");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");

// Mode Switch
userBtn.onclick = () => {
  userLogin.classList.remove("hidden");
  adminLogin.classList.add("hidden");
  userBtn.classList.add("active");
  adminBtn.classList.remove("active");
};

adminBtn.onclick = () => {
  adminLogin.classList.remove("hidden");
  userLogin.classList.add("hidden");
  adminBtn.classList.add("active");
  userBtn.classList.remove("active");
};

goBackUser.onclick = () => {
  userLogin.classList.add("hidden");
  roleSelection.classList.remove("hidden");
};

goBackAdmin.onclick = () => {
  adminLogin.classList.add("hidden");
  roleSelection.classList.remove("hidden");
};

// Enter as anonymous user
enterChat.onclick = () => {
  const name = usernameInput.value.trim();
  if (!name) return alert("Please enter a name.");
  currentUser = {
    displayName: name,
    email: null,
    uid: `anon_${Date.now()}`,
    isAdmin: false
  };
  initChat();
};

// Sign in with Google for admin
googleLogin.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(result => {
    const user = result.user;
    if (user.email !== ADMIN_EMAIL) return alert("Not authorized as admin.");
    currentUser = {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      uid: user.uid,
      isAdmin: true
    };
    initChat();
  }).catch(e => alert("Login failed."));
};

function initChat() {
  loginScreen.classList.add("hidden");
  chatContainer.classList.remove("hidden");

  const userRef = db.ref("users/" + currentUser.uid.replace(/\./g, "_"));
  userRef.once("value").then(snapshot => {
    if (!snapshot.exists()) {
      userRef.set({ joined: true });
      db.ref("messages").push({
        type: "system",
        text: `${currentUser.displayName} joined the chat`,
        timestamp: Date.now()
      });
    }
  });

  sendBtn.onclick = sendMessage;

  messageInput.addEventListener("input", () => {
    if (!isTyping) {
      isTyping = true;
      db.ref("typing/" + currentUser.uid).set(currentUser.displayName);
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(stopTyping, 3000);
    }
  });

  messageInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  db.ref("typing").on("value", snap => {
    const othersTyping = [];
    snap.forEach(child => {
      if (child.key !== currentUser.uid) othersTyping.push(child.val());
    });
    typingIndicator.style.display = othersTyping.length ? "block" : "none";
    typingIndicator.innerText = othersTyping.length === 1
      ? `${othersTyping[0]} is typing...`
      : `${othersTyping.join(", ")} are typing...`;
  });

  db.ref("messages").on("value", snap => {
    chatMessages.innerHTML = "";
    snap.forEach(child => renderMessage(child));
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function stopTyping() {
  isTyping = false;
  db.ref("typing/" + currentUser.uid).remove();
}

function assignColor(uid) {
  if (!userColors[uid]) {
    const color = COLORS[Object.keys(userColors).length % COLORS.length];
    userColors[uid] = color;
  }
  return userColors[uid];
}

function formatText(text) {
  return text
    .replace(/\*_(.*?)_\*/g, '<b><i>$1</i></b>')
    .replace(/\*(.*?)\*/g, '<b>$1</b>')
    .replace(/_(.*?)_/g, '<i>$1</i>')
    .replace(/~(.*?)~/g, '<s>$1</s>')
    .replace(/{(.*?)}/g, '<span style="background:yellow;color:black;padding:2px 4px;border-radius:4px;">$1</span>')
    .replace(/#(.*?)#/g, '<code style="background:#222;padding:2px 4px;border-radius:4px;">$1</code>')
    .replace(/@(\w+)/g, '<span style="color:#34B7F1;">@$1</span>')
    .replace(/(https?:\/\/[^\s]+)/g, match => currentUser.isAdmin ? `<a href="${match}" target="_blank" style="color:#34B7F1;">${match}</a>` : "[link blocked]");
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const message = {
    text,
    name: currentUser.displayName,
    email: currentUser.email || null,
    uid: currentUser.uid,
    photo: currentUser.photoURL || "https://www.gravatar.com/avatar?d=mp",
    timestamp: Date.now(),
    replyTo: replyTo,
    type: "chat"
  };
  db.ref("messages").push(message);
  messageInput.value = "";
  cancelReply();
}

function renderMessage(child) {
  const msg = child.val();
  const key = child.key;
  const isAdmin = msg.email === ADMIN_EMAIL;
  const isSelf = currentUser.uid === msg.uid;
  const nameColor = isAdmin ? "#FF7B00" : assignColor(msg.uid);

  if (msg.type === "system") {
    const div = document.createElement("div");
    div.className = "system-message";
    div.innerHTML = `${msg.text} ${currentUser.isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${key}')">delete</span>` : ""}`;
    chatMessages.appendChild(div);
    return;
  }

  const msgDiv = document.createElement("div");
  msgDiv.className = `message ${isSelf ? "sent" : "received"}`;
  msgDiv.innerHTML = `
    <img class="profile-pic" src="${msg.photo}" />
    <div class="bubble">
      <div class="name" style="color:${nameColor}">${msg.name}${isAdmin ? ' <span class="material-icons admin-verified">verified</span>' : ""}</div>
      ${msg.replyTo ? `<div class="reply-to" onclick="scrollToMessage('${msg.replyTo.id}')">@${msg.replyTo.name}: ${msg.replyTo.text}</div>` : ""}
      <div>${formatText(msg.text)}</div>
      <div class="time">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
    </div>
    ${currentUser.isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${key}')">delete</span>` : ""}
  `;

  msgDiv.ondblclick = () => {
    replyTo = {
      id: key,
      name: msg.name,
      text: msg.text
    };
    document.getElementById("reply-to-name").innerText = msg.name;
    document.getElementById("reply-to-text").innerText = msg.text;
    document.getElementById("reply-preview").classList.remove("hidden");
  };

  msgDiv.setAttribute("data-id", key);
  chatMessages.appendChild(msgDiv);
}

function cancelReply() {
  replyTo = null;
  document.getElementById("reply-preview").classList.add("hidden");
}

function deleteMessage(key) {
  if (confirm("Are you sure you want to delete this message?")) {
    db.ref("messages/" + key).remove();
  }
}

function scrollToMessage(id) {
  const msgEl = document.querySelector(`[data-id="${id}"]`);
  if (msgEl) msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Firebase Configuration
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

let currentUser = null;
let isAdmin = false;
let replyTo = null;
let typingTimeout;

// DOM
const roleSection = document.getElementById("role-selection");
const userBtn = document.getElementById("user-btn");
const adminBtn = document.getElementById("admin-btn");

const usernameEntry = document.getElementById("username-entry");
const usernameInput = document.getElementById("username-input");
const enterChatBtn = document.getElementById("enter-chat-btn");
const backToRoleUser = document.getElementById("back-to-role-user");

const adminLogin = document.getElementById("admin-login");
const adminLoginBtn = document.getElementById("admin-login-btn");
const backToRoleAdmin = document.getElementById("back-to-role-admin");

const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");

const replyPreview = document.getElementById("reply-preview");
const replyToName = document.getElementById("reply-to-name");
const replyToText = document.getElementById("reply-to-text");

// Role Selection
userBtn.onclick = () => {
  roleSection.style.display = "none";
  usernameEntry.style.display = "flex";
};
adminBtn.onclick = () => {
  roleSection.style.display = "none";
  adminLogin.style.display = "flex";
};
backToRoleUser.onclick = () => {
  roleSection.style.display = "flex";
  usernameEntry.style.display = "none";
};
backToRoleAdmin.onclick = () => {
  roleSection.style.display = "flex";
  adminLogin.style.display = "none";
};

// Login as Anonymous
enterChatBtn.onclick = () => {
  const name = usernameInput.value.trim();
  if (!name) return alert("Please enter your name");
  currentUser = { name, uid: `anon-${Date.now()}`, email: null };
  localStorage.setItem("anonUser", JSON.stringify(currentUser));
  showChat();
};

// Login as Admin
adminLoginBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(result => {
    const user = result.user;
    if (user.email === ADMIN_EMAIL) {
      isAdmin = true;
      currentUser = {
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        uid: user.uid
      };
      localStorage.setItem("adminUser", JSON.stringify(currentUser));
      showChat();
    } else {
      alert("Unauthorized Admin");
    }
  }).catch(console.error);
};

// Restore session after refresh
window.onload = () => {
  const stored = JSON.parse(localStorage.getItem("anonUser")) || JSON.parse(localStorage.getItem("adminUser"));
  if (stored) {
    currentUser = stored;
    isAdmin = stored.email === ADMIN_EMAIL;
    showChat();
  }
};

function showChat() {
  roleSection.style.display = "none";
  usernameEntry.style.display = "none";
  adminLogin.style.display = "none";
  chatContainer.style.display = "flex";

  // Send join message only once
  const joinedKey = `joined-${currentUser.uid}`;
  if (!localStorage.getItem(joinedKey)) {
    db.ref("messages").push({
      type: "system",
      text: `${currentUser.name} joined the chat`,
      timestamp: Date.now()
    });
    localStorage.setItem(joinedKey, true);
  }
}

// Format text
function formatText(text) {
  return text
    .replace(/\*_(.*?)_\*/g, "<b><i>$1</i></b>")
    .replace(/\*(.*?)\*/g, "<b>$1</b>")
    .replace(/_(.*?)_/g, "<i>$1</i>")
    .replace(/~(.*?)~/g, "<s>$1</s>")
    .replace(/{(.*?)}/g, '<span style="background:yellow;color:black;padding:2px 4px;border-radius:3px;">$1</span>')
    .replace(/#(.*?)#/g, '<code style="background:#333;padding:2px 4px;border-radius:4px;">$1</code>')
    .replace(/@(\w+)/g, '<span style="color:#34B7F1">@$1</span>');
}

// Send Message
sendBtn.onclick = () => sendMessage();
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  } else {
    setTyping(true);
  }
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const isLink = /https?:\/\//.test(text);
  if (isLink && !isAdmin) {
    alert("Only admins can send links.");
    messageInput.value = "";
    return;
  }

  db.ref("messages").push({
    uid: currentUser.uid,
    name: currentUser.name,
    email: currentUser.email || "",
    photo: currentUser.photo || "",
    text,
    timestamp: Date.now(),
    replyTo: replyTo || null
  });

  messageInput.value = "";
  cancelReply();
  setTyping(false);
}

// Typing status
function setTyping(state) {
  db.ref("typing").set(state ? currentUser.name : "");
  clearTimeout(typingTimeout);
  if (state) {
    typingTimeout = setTimeout(() => setTyping(false), 2000);
  }
}

db.ref("typing").on("value", snap => {
  typingIndicator.innerText = snap.val() ? `${snap.val()} is typing...` : "";
});

// Cancel reply
function cancelReply() {
  replyTo = null;
  replyPreview.style.display = "none";
}

// Assign random color
function getColor(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash += uid.charCodeAt(i);
  }
  return COLORS[hash % COLORS.length];
}

// Scroll to message by ID
function scrollToMessage(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Load Messages
db.ref("messages").on("value", snap => {
  chatMessages.innerHTML = "";
  snap.forEach(child => {
    const msg = child.val();
    const key = child.key;

    if (msg.type === "system") {
      const sysEl = document.createElement("div");
      sysEl.className = "system-message";
      sysEl.innerHTML = `
        <div>${msg.text}</div>
        ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${key}')">delete</span>` : ""}
      `;
      chatMessages.appendChild(sysEl);
      return;
    }

    const sent = msg.uid === currentUser.uid;
    const admin = msg.email === ADMIN_EMAIL;
    const nameColor = admin ? "#FF7B00" : getColor(msg.uid);

    const wrapper = document.createElement("div");
    wrapper.className = `message ${sent ? "sent" : "received"}`;
    wrapper.id = key;

    wrapper.innerHTML = `
      <img class="profile-pic" src="${msg.photo || 'https://www.gravatar.com/avatar/?d=mp'}" />
      <div class="bubble">
        <div class="name" style="color:${nameColor}">
          ${msg.name} ${admin ? `<span class="material-icons admin-verified">verified</span>` : ""}
        </div>
        ${msg.replyTo ? `<div class="reply-to" onclick="scrollToMessage('${msg.replyTo.key}')">${msg.replyTo.name}: ${msg.replyTo.text}</div>` : ""}
        <div>${formatText(msg.text)}</div>
        <div class="time">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${key}')">delete</span>` : ""}
    `;

    wrapper.ondblclick = () => {
      replyTo = { name: msg.name, text: msg.text, key };
      replyToName.innerText = msg.name;
      replyToText.innerText = msg.text;
      replyPreview.style.display = "flex";
    };

    chatMessages.appendChild(wrapper);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Delete message
function deleteMessage(key) {
  if (confirm("Are you sure you want to delete this message?")) {
    db.ref("messages/" + key).remove();
  }
}

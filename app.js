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
const auth = firebase.auth();
const db = firebase.database();

const ADMIN_EMAIL = "24sports.social@gmail.com";
const ADMIN_COLOR = "#FF7B00";
const MENTION_COLOR = "#34B7F1";
const USER_COLORS = ["#25D366", "#A142F4", "#3F51B5", "#00BCD4", "#00BFA5", "#FF4081", "#128C7E", "#673AB7", "#9C27B0"];
let userColors = {};
let currentUser = null;
let replyTo = null;
let isAdmin = false;

const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

// Show/hide forms
window.showUserForm = () => {
  document.getElementById("choice-container").style.display = "none";
  document.getElementById("user-login").style.display = "block";
};

window.showAdminLogin = () => {
  document.getElementById("choice-container").style.display = "none";
  document.getElementById("admin-login").style.display = "block";
};

window.goBack = () => {
  location.reload();
};

window.enterChat = () => {
  const name = document.getElementById("username-input").value.trim();
  if (!name) return alert("Please enter a name");
  currentUser = {
    displayName: name,
    email: null,
    photoURL: "https://www.gravatar.com/avatar/?d=mp"
  };
  localStorage.setItem("anonUserName", name);
  initChat(false);
};

document.getElementById("admin-signin-btn").onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(result => {
    const user = result.user;
    if (user.email === ADMIN_EMAIL) {
      currentUser = user;
      isAdmin = true;
      localStorage.setItem("admin", "true");
      initChat(true);
    } else {
      alert("Access denied");
      auth.signOut();
      location.reload();
    }
  });
};

function initChat(adminLogin) {
  document.getElementById("choice-container").style.display = "none";
  document.getElementById("user-login").style.display = "none";
  document.getElementById("admin-login").style.display = "none";
  document.getElementById("chat-container").style.display = "flex";

  const uid = currentUser.email ? currentUser.email.replace(/\./g, "_") : localStorage.getItem("anonUserName");
  const userRef = db.ref("users/" + uid);
  userRef.once("value").then(snap => {
    if (!snap.exists()) {
      userRef.set({ hasJoined: true });
      db.ref("messages").push({
        type: "system",
        text: `${currentUser.displayName} joined the chat`,
        timestamp: Date.now()
      });
    }
  });

  loadMessages();
}

function assignColor(name) {
  if (!userColors[name]) {
    userColors[name] = USER_COLORS[Object.keys(userColors).length % USER_COLORS.length];
  }
  return userColors[name];
}

function formatMessage(text) {
  return text
    .replace(/\*_(.*?)_\*/g, "<b><i>$1</i></b>")
    .replace(/\*(.*?)\*/g, "<b>$1</b>")
    .replace(/_(.*?)_/g, "<i>$1</i>")
    .replace(/\{(.*?)\}/g, '<span style="background:yellow;color:black;padding:2px 4px;border-radius:3px;">$1</span>')
    .replace(/~(.*?)~/g, "<s>$1</s>")
    .replace(/#(.*?)#/g, "<code style='background:#222;padding:2px 4px;border-radius:4px;'>$1</code>")
    .replace(/@(\w+)/g, `<span style="color:${MENTION_COLOR}">@$1</span>`)
    .replace(/(https?:\/\/[^\s]+)/g, link => isAdmin ? `<a href="${link}" target="_blank" style="color:${MENTION_COLOR}">${link}</a>` : '🔗');
}

sendBtn.onclick = sendMessage;
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  if (/https?:\/\//i.test(text) && !isAdmin) {
    alert("Only admins can send links.");
    messageInput.value = "";
    return;
  }

  const message = {
    name: currentUser.displayName,
    email: currentUser.email || null,
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

function deleteMessage(key) {
  if (confirm("Are you sure you want to delete this message?")) {
    db.ref("messages/" + key).remove();
  }
}

function scrollToMessage(id) {
  const msg = document.getElementById(id);
  if (msg) {
    msg.scrollIntoView({ behavior: "smooth", block: "center" });
    msg.classList.add("highlight");
    setTimeout(() => msg.classList.remove("highlight"), 1500);
  }
}

function loadMessages() {
  db.ref("messages").on("value", snap => {
    chatMessages.innerHTML = "";
    const now = Date.now();

    snap.forEach(child => {
      const msg = child.val();
      const key = child.key;

      if (now - msg.timestamp > 86400000) {
        db.ref("messages/" + key).remove();
        return;
      }

      if (msg.type === "system") {
        const sys = document.createElement("div");
        sys.className = "system-message";
        sys.innerHTML = `
          <div>${msg.text}</div>
          ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${key}')">delete</span>` : ""}
        `;
        chatMessages.appendChild(sys);
        return;
      }

      const isSent = msg.email === currentUser.email || (!msg.email && msg.name === currentUser.displayName);
      const color = msg.email === ADMIN_EMAIL ? ADMIN_COLOR : assignColor(msg.name);

      const msgEl = document.createElement("div");
      msgEl.className = `message ${isSent ? "sent" : "received"}`;
      msgEl.id = key;

      msgEl.innerHTML = `
        <img class="profile-pic" src="${msg.photo}" />
        <div class="bubble">
          <div class="name" style="color:${color}">
            ${msg.name}${msg.email === ADMIN_EMAIL ? ' <span class="material-icons admin-verified">verified</span>' : ""}
          </div>
          ${msg.replyTo ? `<div class="reply-to" onclick="scrollToMessage('${msg.replyTo.key}')">@${msg.replyTo.name}: ${msg.replyTo.text}</div>` : ""}
          <div>${formatMessage(msg.text)}</div>
          <div class="time">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        </div>
        ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${key}')">delete</span>` : ""}
      `;

      msgEl.ondblclick = () => {
        replyTo = { name: msg.name, text: msg.text, key };
        document.getElementById("reply-preview").innerHTML = `Replying to <b>${msg.name}</b>: ${msg.text} <span class="material-icons" onclick="cancelReply()" style="cursor:pointer">close</span>`;
        document.getElementById("reply-preview").style.display = "block";
      };

      chatMessages.appendChild(msgEl);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function cancelReply() {
  replyTo = null;
  document.getElementById("reply-preview").style.display = "none";
}

// Auto-login from previous session
window.onload = () => {
  const name = localStorage.getItem("anonUserName");
  const isAdminStored = localStorage.getItem("admin");
  if (name) {
    currentUser = {
      displayName: name,
      photoURL: "https://www.gravatar.com/avatar/?d=mp"
    };
    initChat(false);
  } else if (isAdminStored === "true") {
    auth.onAuthStateChanged(user => {
      if (user && user.email === ADMIN_EMAIL) {
        currentUser = user;
        isAdmin = true;
        initChat(true);
      }
    });
  }
};

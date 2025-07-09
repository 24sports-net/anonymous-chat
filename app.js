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
const COLORS = ["#25D366", "#A142F4", "#3F51B5", "#00BCD4", "#00BFA5", "#FF4081", "#128C7E", "#673AB7", "#9C27B0"];
let currentUser = null;
let isAdmin = false;
let userColors = {};
let replyTo = null;

const userBtn = document.getElementById("user-btn");
const adminBtn = document.getElementById("admin-btn");
const userLogin = document.getElementById("user-login");
const adminLogin = document.getElementById("admin-login");
const roleSelection = document.getElementById("role-selection");

const backBtnUser = document.getElementById("back-btn-user");
const backBtnAdmin = document.getElementById("back-btn-admin");

const usernameInput = document.getElementById("username-input");
const enterChatBtn = document.getElementById("enter-chat-btn");
const googleLoginBtn = document.getElementById("google-login-btn");

const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

// Maintain session on refresh
if (sessionStorage.getItem("user")) {
  currentUser = JSON.parse(sessionStorage.getItem("user"));
  isAdmin = sessionStorage.getItem("admin") === "true";
  showChat();
}

userBtn.onclick = () => {
  userBtn.classList.add("active");
  adminBtn.classList.remove("active");
  roleSelection.style.display = "none";
  userLogin.style.display = "flex";
};

adminBtn.onclick = () => {
  adminBtn.classList.add("active");
  userBtn.classList.remove("active");
  roleSelection.style.display = "none";
  adminLogin.style.display = "flex";
};

backBtnUser.onclick = () => {
  userLogin.style.display = "none";
  roleSelection.style.display = "flex";
  userBtn.classList.remove("active");
};

backBtnAdmin.onclick = () => {
  adminLogin.style.display = "none";
  roleSelection.style.display = "flex";
  adminBtn.classList.remove("active");
};

enterChatBtn.onclick = () => {
  const name = usernameInput.value.trim();
  if (!name) return alert("Please enter your name");
  currentUser = {
    displayName: name,
    email: null,
    photoURL: "https://www.gravatar.com/avatar/?d=mp"
  };
  isAdmin = false;
  sessionStorage.setItem("user", JSON.stringify(currentUser));
  sessionStorage.setItem("admin", "false");
  showChat();
  pushJoinMessage(name);
};

googleLoginBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(result => {
    const user = result.user;
    if (user.email === ADMIN_EMAIL) {
      currentUser = user;
      isAdmin = true;
      sessionStorage.setItem("user", JSON.stringify(user));
      sessionStorage.setItem("admin", "true");
      showChat();
      pushJoinMessage(user.displayName);
    } else {
      alert("Access denied: Not an admin");
    }
  });
};

function pushJoinMessage(name) {
  const userKey = currentUser.email ? currentUser.email.replace(/[.#$[\]]/g, "_") : name;
  const userRef = db.ref("users/" + userKey);
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
}

function assignColor(name) {
  if (!userColors[name]) {
    userColors[name] = COLORS[Object.keys(userColors).length % COLORS.length];
  }
  return userColors[name];
}

function formatMessage(text) {
  return text
    .replace(/\*_(.*?)_\*/g, "<b><i>$1</i></b>")
    .replace(/\*(.*?)\*/g, "<b>$1</b>")
    .replace(/_(.*?)_/g, "<i>$1</i>")
    .replace(/{(.*?)}/g, '<span style="background:yellow;color:black;padding:2px 4px;border-radius:3px;">$1</span>')
    .replace(/~(.*?)~/g, "<s>$1</s>")
    .replace(/#(.*?)#/g, '<code style="background:#222;padding:2px 4px;border-radius:4px;">$1</code>')
    .replace(/@(\w+)/g, '<span style="color:#34B7F1;">@$1</span>');
}

function showChat() {
  document.getElementById("role-selection").style.display = "none";
  document.getElementById("user-login").style.display = "none";
  document.getElementById("admin-login").style.display = "none";
  document.getElementById("chat-container").style.display = "flex";
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

  const isLink = /https?:\/\//i.test(text);
  if (isLink && !isAdmin) {
    alert("Only admins can send links");
    messageInput.value = "";
    return;
  }

  db.ref("messages").push({
    name: currentUser.displayName,
    email: currentUser.email || "",
    photo: currentUser.photoURL || "",
    text: text,
    timestamp: Date.now(),
    replyTo: replyTo || null
  });

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
  snap.forEach(child => {
    const msg = child.val();
    const key = child.key;

    if (msg.type === "system") {
      const sys = document.createElement("div");
      sys.className = "system-message";
      sys.innerHTML = `${msg.text} ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${key}')">delete</span>` : ""}`;
      chatMessages.appendChild(sys);
      return;
    }

    const isSent = currentUser.email ? msg.email === currentUser.email : msg.name === currentUser.displayName;
    const nameColor = msg.email === ADMIN_EMAIL ? "#FF7B00" : assignColor(msg.name || "user");

    const msgEl = document.createElement("div");
    msgEl.className = `message ${isSent ? "sent" : "received"}`;
    msgEl.innerHTML = `
      <img class="profile-pic" src="${msg.photo}" />
      <div class="bubble">
        <div class="name" style="color:${nameColor}">
          ${msg.name}${msg.email === ADMIN_EMAIL ? ' <span class="material-icons admin-verified">verified</span>' : ""}
        </div>
        ${msg.replyTo ? `<div class="reply-to" onclick="scrollToMessage('${msg.replyTo.timestamp}')">@${msg.replyTo.name}: ${msg.replyTo.text}</div>` : ""}
        <div>${formatMessage(msg.text)}</div>
        <div class="time">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${key}')">delete</span>` : ""}
    `;

    msgEl.dataset.timestamp = msg.timestamp;

    msgEl.ondblclick = () => {
      replyTo = {
        name: msg.name,
        text: msg.text,
        timestamp: msg.timestamp
      };
      document.getElementById("reply-to-name").innerText = msg.name;
      document.getElementById("reply-to-text").innerText = msg.text;
      document.getElementById("reply-preview").style.display = "flex";
    };

    chatMessages.appendChild(msgEl);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
});

function scrollToMessage(timestamp) {
  const target = [...chatMessages.children].find(el => el.dataset.timestamp == timestamp);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.style.outline = "2px solid #34B7F1";
    setTimeout(() => (target.style.outline = ""), 2000);
  }
}

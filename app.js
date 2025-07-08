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
let replyTo = null;
let userColors = {};

const userBtn = document.getElementById("user-btn");
const adminBtn = document.getElementById("admin-btn");
const nameInputContainer = document.getElementById("name-input-container");
const loginContainer = document.getElementById("login-container");
const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

if (localStorage.getItem("chatUser")) {
  currentUser = JSON.parse(localStorage.getItem("chatUser"));
  document.getElementById("login-options").style.display = "none";
  chatContainer.style.display = "flex";
  loadMessages();
}

userBtn.onclick = () => {
  document.getElementById("login-options").style.display = "none";
  nameInputContainer.style.display = "flex";
};

adminBtn.onclick = () => {
  document.getElementById("login-options").style.display = "none";
  loginContainer.style.display = "flex";
};

document.getElementById("enter-chat-btn").onclick = () => {
  const name = document.getElementById("name-input").value.trim();
  if (!name) return;
  currentUser = { name, email: null, photo: null, isAdmin: false };
  localStorage.setItem("chatUser", JSON.stringify(currentUser));
  nameInputContainer.style.display = "none";
  chatContainer.style.display = "flex";
  sendJoinMessage();
  loadMessages();
};

document.getElementById("login-btn").onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
};

auth.onAuthStateChanged((user) => {
  if (user && user.email === ADMIN_EMAIL) {
    currentUser = {
      name: user.displayName,
      email: user.email,
      photo: user.photoURL,
      isAdmin: true
    };
    localStorage.setItem("chatUser", JSON.stringify(currentUser));
    loginContainer.style.display = "none";
    chatContainer.style.display = "flex";
    sendJoinMessage();
    loadMessages();
  }
});

function assignColor(name) {
  if (!userColors[name]) {
    userColors[name] = COLORS[Object.keys(userColors).length % COLORS.length];
  }
  return userColors[name];
}

function sendJoinMessage() {
  const joinKey = `joined-${currentUser.name}`;
  if (!localStorage.getItem(joinKey)) {
    db.ref("messages").push({
      type: "system",
      text: `${currentUser.name} joined the chat`,
      timestamp: Date.now()
    });
    localStorage.setItem(joinKey, "true");
  }
}

function formatMessage(text) {
  return text
    .replace(/\*_(.*?)_\*/g, '<b><i>$1</i></b>')
    .replace(/\*(.*?)\*/g, '<b>$1</b>')
    .replace(/_(.*?)_/g, '<i>$1</i>')
    .replace(/~(.*?)~/g, '<s>$1</s>')
    .replace(/#(.*?)#/g, '<code style="background:#222;padding:2px 4px;border-radius:4px;">$1</code>')
    .replace(/{(.*?)}/g, '<span style="background:yellow;color:black;padding:2px 4px;border-radius:3px;">$1</span>')
    .replace(/@(\w+)/g, '<span style="color:#34B7F1;">@$1</span>');
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  if (/https?:\/\//i.test(text) && !currentUser.isAdmin) {
    alert("Only admins can send links.");
    messageInput.value = "";
    return;
  }

  const msg = {
    name: currentUser.name,
    email: currentUser.email || "",
    photo: currentUser.photo || "https://www.gravatar.com/avatar/?d=mp",
    text,
    timestamp: Date.now(),
    replyTo: replyTo || null
  };

  db.ref("messages").push(msg);
  messageInput.value = "";
  replyTo = null;
  document.getElementById("reply-preview").style.display = "none";
}

function cancelReply() {
  replyTo = null;
  document.getElementById("reply-preview").style.display = "none";
}

function deleteMessage(key) {
  if (confirm("Delete this message?")) {
    db.ref("messages/" + key).remove();
  }
}

function loadMessages() {
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

      const isSent = msg.name === currentUser.name;
      const isAdmin = msg.email === ADMIN_EMAIL;
      const nameColor = isAdmin ? "#FF7B00" : assignColor(msg.name);

      if (msg.type === "system") {
        const sysEl = document.createElement("div");
        sysEl.className = "system-message";
        sysEl.innerHTML = `
          <div>${msg.text}</div>
          ${currentUser.isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${child.key}')">delete</span>` : ""}
        `;
        chatMessages.appendChild(sysEl);
        return;
      }

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
          <div class="time">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
        </div>
        ${currentUser.isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${child.key}')">delete</span>` : ""}
      `;

      msgEl.ondblclick = () => {
        replyTo = {
          name: msg.name,
          text: msg.text
        };
        document.getElementById("reply-to-name").innerText = msg.name;
        document.getElementById("reply-to-text").innerText = msg.text;
        document.getElementById("reply-preview").style.display = "flex";
      };

      chatMessages.appendChild(msgEl);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

sendBtn.onclick = sendMessage;
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

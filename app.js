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
let currentUser = null;
let isAdmin = false;

const loginContainer = document.getElementById("login-container");
const userBtn = document.getElementById("user-btn");
const adminBtn = document.getElementById("admin-btn");
const nameInput = document.getElementById("name-input");
const nameForm = document.getElementById("name-form");

const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

let replyTo = null;

// --- USER BUTTON ---
userBtn.onclick = () => {
  nameForm.style.display = "block";
  userBtn.style.display = "none";
  adminBtn.style.display = "none";
};

nameForm.onsubmit = (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;

  currentUser = {
    displayName: name,
    email: null,
    photoURL: null
  };
  isAdmin = false;
  enterChat(currentUser.displayName);
};

// --- ADMIN BUTTON ---
adminBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      if (result.user.email === ADMIN_EMAIL) {
        currentUser = result.user;
        isAdmin = true;
        enterChat(currentUser.displayName);
      } else {
        alert("You are not authorized as Admin.");
        auth.signOut();
      }
    })
    .catch(error => {
      console.error("Login error:", error);
    });
};

function enterChat(name) {
  loginContainer.style.display = "none";
  chatContainer.style.display = "flex";

  const safeKey = name.replaceAll(".", "_");
  const userRef = db.ref("users/" + safeKey);

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

// --- SEND MESSAGE ---
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

// --- RECEIVE MESSAGES ---
db.ref("messages").on("value", snapshot => {
  chatMessages.innerHTML = "";
  const now = Date.now();

  snapshot.forEach(child => {
    const msg = child.val();
    const age = now - msg.timestamp;

    if (age >= 86400000) {
      db.ref("messages/" + child.key).remove();
      return;
    }

    if (msg.type === "system") {
      const sys = document.createElement("div");
      sys.className = "system-message";
      sys.innerHTML = `
        <div>${msg.text}</div>
        ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${child.key}')">delete</span>` : ""}
      `;
      chatMessages.appendChild(sys);
      return;
    }

    const isSent = msg.email === currentUser?.email;
    const msgEl = document.createElement("div");
    msgEl.className = `message ${isSent ? "sent" : "received"}`;
    msgEl.innerHTML = `
      <img class="profile-pic" src="${msg.photo}" />
      <div class="bubble">
        <div class="name" style="color:${isAdminEmail(msg.email) ? '#FF4C4C' : '#00C2D1'}">
          ${msg.name}${isAdminEmail(msg.email) ? '<span class="material-icons admin-verified">verified</span>' : ''}
        </div>
        ${msg.replyTo ? `<div class="reply-to">Replying to: ${msg.replyTo.text}</div>` : ""}
        <div>${formatText(msg.text)}</div>
        <div class="time">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
      </div>
      ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${child.key}')">delete</span>` : ""}
    `;
    chatMessages.appendChild(msgEl);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
});

function formatText(text) {
  return text
    .replace(/\*_([^*]+)_\*/g, '<b><i>$1</i></b>')
    .replace(/\*([^*]+)\*/g, '<b>$1</b>')
    .replace(/_([^_]+)_/g, '<i>$1</i>')
    .replace(/~([^~]+)~/g, '<s>$1</s>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/@(\w+)/g, '<span style="color:#1DA1F2">@$1</span>');
}

function isAdminEmail(email) {
  return email === ADMIN_EMAIL;
}

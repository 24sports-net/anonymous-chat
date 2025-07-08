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
const auth = firebase.auth();
const db = firebase.database();

const ADMIN_EMAIL = "24sports.social@gmail.com";
const COLORS = ["#7F66FF", "#00C2D1", "#34B7F1", "#25D366", "#C4F800", "#FFD279", "#FF5C9D", "#53BDEB", "#A259FF", "#FF8A3D"];
let userColors = {};
let currentUser = null;

const loginContainer = document.getElementById("login-container");
const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

document.getElementById("user-login-btn").onclick = () => {
  document.getElementById("name-entry").style.display = "flex";
};

document.getElementById("enter-chat-btn").onclick = () => {
  const name = document.getElementById("display-name").value.trim();
  if (!name) return alert("Enter your name");
  currentUser = {
    displayName: name,
    email: null,
    photoURL: "https://www.gravatar.com/avatar/?d=mp"
  };
  loginContainer.style.display = "none";
  chatContainer.style.display = "flex";
  registerUserJoin(name);
};

document.getElementById("admin-login-btn").onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
};

auth.onAuthStateChanged(user => {
  if (user && user.email === ADMIN_EMAIL) {
    currentUser = user;
    loginContainer.style.display = "none";
    chatContainer.style.display = "flex";
    registerUserJoin(user.displayName);
  }
});

function assignColor(name) {
  if (!userColors[name]) {
    userColors[name] = COLORS[Object.keys(userColors).length % COLORS.length];
  }
  return userColors[name];
}

function registerUserJoin(name) {
  const userId = btoa(name);
  const userRef = db.ref("users/" + userId);
  userRef.once("value").then(snap => {
    if (!snap.exists()) {
      userRef.set({ joined: true });
      db.ref("messages").push({
        type: "system",
        text: `${name} joined the chat`,
        timestamp: Date.now()
      });
    }
  });
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
  if (isLink && currentUser.email !== ADMIN_EMAIL) {
    alert("Links not allowed");
    messageInput.value = "";
    return;
  }

  const message = {
    name: currentUser.displayName,
    email: currentUser.email || null,
    photo: currentUser.photoURL,
    text,
    timestamp: Date.now(),
    type: "chat"
  };

  db.ref("messages").push(message);
  messageInput.value = "";
}

function deleteMessage(key) {
  if (confirm("Are you sure?")) {
    db.ref("messages/" + key).remove();
  }
}

db.ref("messages").on("value", snapshot => {
  chatMessages.innerHTML = "";
  const now = Date.now();
  snapshot.forEach(child => {
    const msg = child.val();
    const isSent = msg.name === currentUser?.displayName;
    const isAdmin = msg.email === ADMIN_EMAIL;

    if (msg.type === "system") {
      const sysMsg = document.createElement("div");
      sysMsg.className = "message system";
      sysMsg.innerHTML = `
        <div class="bubble" style="background:#222;color:#ccc;">${msg.text}</div>
        ${currentUser.email === ADMIN_EMAIL ? `<span class="material-icons delete-btn" onclick="deleteMessage('${child.key}')">delete</span>` : ""}
      `;
      chatMessages.appendChild(sysMsg);
      return;
    }

    const msgEl = document.createElement("div");
    msgEl.className = `message ${isSent ? "sent" : "received"}`;
    msgEl.innerHTML = `
      <img class="profile-pic" src="${msg.photo}" alt="pfp" />
      <div class="bubble">
        <div class="name" style="color:${isAdmin ? "#FF4C4C" : assignColor(msg.name)}">
          ${msg.name}${isAdmin ? ' <span class="material-icons admin-verified">verified</span>' : ""}
        </div>
        <div>${msg.text}</div>
        <div class="time">${new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
      ${currentUser.email === ADMIN_EMAIL ? `<span class="material-icons delete-btn" onclick="deleteMessage('${child.key}')">delete</span>` : ""}
    `;
    chatMessages.appendChild(msgEl);
  });
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

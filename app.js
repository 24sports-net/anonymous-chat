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

const userBtn = document.getElementById("user-btn");
const adminBtn = document.getElementById("admin-btn");
const nameBox = document.getElementById("name-input-box");
const loginBox = document.getElementById("login-container");
const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

userBtn.onclick = () => {
  userBtn.classList.add("active");
  adminBtn.classList.remove("active");
  nameBox.style.display = "flex";
  loginBox.style.display = "none";
};

adminBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
};

document.getElementById("start-chat").onclick = () => {
  const name = document.getElementById("name-input").value.trim();
  if (!name) return alert("Enter a name");
  currentUser = { displayName: name, email: null, photoURL: "" };
  loginBox.style.display = "none";
  nameBox.style.display = "none";
  chatContainer.style.display = "flex";
  localStorage.setItem("chatUser", JSON.stringify(currentUser));
  localStorage.setItem("joined", "false");
  loadMessages();
  showJoinMessage(name);
};

auth.onAuthStateChanged(user => {
  if (user && user.email === ADMIN_EMAIL) {
    currentUser = user;
    localStorage.setItem("chatUser", JSON.stringify(user));
    loginBox.style.display = "none";
    chatContainer.style.display = "flex";
    if (!localStorage.getItem("joined")) {
      showJoinMessage(user.displayName);
      localStorage.setItem("joined", "true");
    }
    loadMessages();
  }
});

function assignColor(nameOrEmail) {
  if (!userColors[nameOrEmail]) {
    userColors[nameOrEmail] = COLORS[Object.keys(userColors).length % COLORS.length];
  }
  return userColors[nameOrEmail];
}

function showJoinMessage(name) {
  db.ref("messages").push({
    type: "system",
    text: `${name} joined the chat`,
    timestamp: Date.now()
  });
}

sendBtn.onclick = () => {
  const text = messageInput.value.trim();
  if (!text) return;
  if (/https?:\/\//i.test(text) && currentUser.email !== ADMIN_EMAIL) {
    alert("Links not allowed");
    return (messageInput.value = "");
  }

  db.ref("messages").push({
    name: currentUser.displayName,
    email: currentUser.email || "",
    photo: currentUser.photoURL || "https://www.gravatar.com/avatar/?d=mp",
    text,
    timestamp: Date.now()
  });

  messageInput.value = "";
};

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

      if (msg.type === "system") {
        const msgEl = document.createElement("div");
        msgEl.className = "system-message";
        msgEl.innerText = msg.text;
        chatMessages.appendChild(msgEl);
        return;
      }

      const isSent = msg.email === currentUser?.email;
      const isAdmin = msg.email === ADMIN_EMAIL;
      const nameColor = isAdmin ? "#FF4C4C" : assignColor(msg.email || msg.name);

      const msgEl = document.createElement("div");
      msgEl.className = `message ${isSent ? "sent" : "received"}`;
      msgEl.innerHTML = `
        <img class="profile-pic" src="${msg.photo}" alt="pfp" />
        <div class="bubble">
          <div class="name" style="color:${nameColor}">
            ${msg.name}${isAdmin ? ' <span class="material-icons admin-verified">verified</span>' : ""}
          </div>
          <div>${msg.text}</div>
          <div class="time">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        ${currentUser?.email === ADMIN_EMAIL ? `<span class="material-icons delete-btn" onclick="deleteMessage('${child.key}')">delete</span>` : ""}
      `;
      chatMessages.appendChild(msgEl);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function deleteMessage(key) {
  if (confirm("Delete this message?")) {
    db.ref("messages/" + key).remove();
  }
}

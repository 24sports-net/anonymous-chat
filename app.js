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

const COLORS = ["#7F66FF", "#00C2D1", "#34B7F1", "#25D366", "#C4F800", "#FFD279", "#FF5C9D", "#53BDEB", "#A259FF", "#FF8A3D"];
let userColors = {};

const loginChoice = document.getElementById("login-choice");
const userBtn = document.getElementById("user-btn");
const adminBtn = document.getElementById("admin-btn");
const nameInputContainer = document.getElementById("name-input-container");
const usernameInput = document.getElementById("username");
const enterChatBtn = document.getElementById("enter-chat-btn");
const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

let isAdmin = false;

userBtn.onclick = () => {
  loginChoice.style.display = "none";
  nameInputContainer.style.display = "flex";
};

adminBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(result => {
    const user = result.user;
    if (user.email === ADMIN_EMAIL) {
      currentUser = {
        name: user.displayName,
        email: user.email,
        photo: user.photoURL || "https://www.gravatar.com/avatar/?d=mp"
      };
      isAdmin = true;
      enterChat();
    } else {
      alert("Access Denied: Not an authorized admin.");
    }
  });
};

enterChatBtn.onclick = () => {
  const name = usernameInput.value.trim();
  if (!name) return alert("Please enter a name");

  currentUser = {
    name,
    email: null,
    photo: "https://www.gravatar.com/avatar/?d=mp"
  };
  isAdmin = false;
  enterChat();
};

function assignColor(name) {
  if (!userColors[name]) {
    userColors[name] = COLORS[Object.keys(userColors).length % COLORS.length];
  }
  return userColors[name];
}

function enterChat() {
  nameInputContainer.style.display = "none";
  chatContainer.style.display = "flex";

  // Show joined message only once
  const userId = currentUser.email || currentUser.name;
  db.ref("users/" + userId).once("value", snapshot => {
    if (!snapshot.exists()) {
      db.ref("users/" + userId).set({ joined: true });
      db.ref("messages").push({
        type: "system",
        text: `${currentUser.name} joined the chat`,
        timestamp: Date.now()
      });
    }
  });

  db.ref("messages").on("value", snap => {
    chatMessages.innerHTML = "";
    snap.forEach(child => {
      const msg = child.val();
      const key = child.key;

      const msgEl = document.createElement("div");

      if (msg.type === "system") {
        msgEl.className = "system-message";
        msgEl.innerHTML = `<div style="color:gray;">${msg.text}</div>
          ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${key}')">delete</span>` : ""}
        `;
        chatMessages.appendChild(msgEl);
        return;
      }

      const sent = currentUser.name === msg.name;
      const color = msg.email === ADMIN_EMAIL ? "#FF4C4C" : assignColor(msg.name);

      msgEl.className = `message ${sent ? "sent" : "received"}`;
      msgEl.innerHTML = `
        <img class="profile-pic" src="${msg.photo}" alt="pfp">
        <div class="bubble">
          <div class="name" style="color:${color}">
            ${msg.name}${msg.email === ADMIN_EMAIL ? '<span class="material-icons admin-verified">verified</span>' : ""}
          </div>
          <div>${msg.text}</div>
          <div class="time">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        </div>
        ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${key}')">delete</span>` : ""}
      `;
      chatMessages.appendChild(msgEl);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  db.ref("messages").push({
    name: currentUser.name,
    email: currentUser.email || null,
    photo: currentUser.photo,
    text,
    timestamp: Date.now()
  });
  messageInput.value = "";
}

sendBtn.onclick = sendMessage;
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function deleteMessage(key) {
  if (confirm("Are you sure you want to delete this message?")) {
    db.ref("messages/" + key).remove();
  }
}

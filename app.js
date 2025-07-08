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
const loginBtn = document.getElementById("login-btn");
const sendBtn = document.getElementById("send-btn");
const messageInput = document.getElementById("message-input");
const chatMessages = document.getElementById("chat-messages");

function assignColor(email) {
  if (!userColors[email]) {
    userColors[email] = COLORS[Object.keys(userColors).length % COLORS.length];
  }
  return userColors[email];
}

// Restore session
window.addEventListener("load", () => {
  const storedUser = JSON.parse(localStorage.getItem("chatUser"));
  const userType = localStorage.getItem("userType");

  if (storedUser) {
    currentUser = storedUser;
    loginContainer.style.display = "none";
    chatContainer.style.display = "flex";
    
    if (!localStorage.getItem("joined")) {
      registerUserJoin(currentUser.displayName);
      localStorage.setItem("joined", "true");
    }

    // ✅ Always load messages regardless of login type
    loadMessages();
  }
});

// USER mode
document.getElementById("user-mode").onclick = () => {
  document.getElementById("user-mode").classList.add("active");
  document.getElementById("admin-mode").classList.remove("active");
  document.getElementById("name-login").style.display = "block";
  document.getElementById("login-btn").style.display = "none";
};

// ADMIN mode
document.getElementById("admin-mode").onclick = () => {
  document.getElementById("admin-mode").classList.add("active");
  document.getElementById("user-mode").classList.remove("active");
  document.getElementById("login-btn").style.display = "block";
  document.getElementById("name-login").style.display = "none";
};

// Anonymous user entry
document.getElementById("enter-chat-btn").onclick = () => {
  const name = document.getElementById("display-name").value.trim();
  if (!name) return alert("Enter your name");

  currentUser = {
    displayName: name,
    email: null,
    photoURL: "https://www.gravatar.com/avatar/?d=mp"
  };

  localStorage.setItem("chatUser", JSON.stringify(currentUser));
  localStorage.setItem("userType", "anonymous");

  loginContainer.style.display = "none";
  chatContainer.style.display = "flex";
  registerUserJoin(name);
  loadMessages();
};

// Google Sign In
loginBtn.onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider);
};

auth.onAuthStateChanged(user => {
  if (user && user.email === ADMIN_EMAIL) {
    currentUser = {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL
    };

    localStorage.setItem("chatUser", JSON.stringify(currentUser));
    localStorage.setItem("userType", "admin");

    loginContainer.style.display = "none";
    chatContainer.style.display = "flex";
    registerUserJoin(currentUser.displayName);
    loadMessages();
  }
});

// Send message
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
    alert("Links are not allowed");
    messageInput.value = "";
    return;
  }

  const message = {
    name: currentUser.displayName,
    email: currentUser.email,
    photo: currentUser.photoURL,
    text,
    timestamp: Date.now()
  };

  db.ref("messages").push(message);
  messageInput.value = "";
}

function registerUserJoin(name) {
  const joinedBefore = localStorage.getItem("joined");
  if (!joinedBefore) {
    db.ref("messages").push({
      type: "system",
      text: `${name} joined the chat`,
      timestamp: Date.now()
    });
    localStorage.setItem("joined", "true");
  }
}

function deleteMessage(key) {
  if (confirm("Are you sure you want to delete this message?")) {
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

      if (msg.type === "system") {
        const msgEl = document.createElement("div");
        msgEl.className = "system-message";
        msgEl.innerHTML = `
          <div>${msg.text}</div>
          ${currentUser.email === ADMIN_EMAIL ? `<span class="material-icons delete-btn" onclick="deleteMessage('${child.key}')">delete</span>` : ""}
        `;
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
          <div class="time">${new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        </div>
        ${currentUser.email === ADMIN_EMAIL ? `<span class="material-icons delete-btn" onclick="deleteMessage('${child.key}')">delete</span>` : ""}
      `;
      chatMessages.appendChild(msgEl);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

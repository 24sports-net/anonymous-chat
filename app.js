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
let currentUser = null;
let isAdmin = false;
let replyTo = null;
let userColors = {};
const COLORS = ["#25D366", "#A142F4", "#3F51B5", "#00BCD4", "#00BFA5", "#FF4081", "#128C7E", "#673AB7", "#9C27B0"];

const roleSelection = document.getElementById("role-selection");
const userLogin = document.getElementById("user-login");
const adminLogin = document.getElementById("admin-login");
const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const replyPreview = document.getElementById("reply-preview");
const replyToName = document.getElementById("reply-to-name");
const replyToText = document.getElementById("reply-to-text");
const typingIndicator = document.getElementById("typing-indicator");

document.getElementById("user-btn").onclick = () => {
  roleSelection.style.display = "none";
  userLogin.style.display = "block";
};
document.getElementById("admin-btn").onclick = () => {
  roleSelection.style.display = "none";
  adminLogin.style.display = "block";
};
document.querySelectorAll(".go-back").forEach(btn => {
  btn.onclick = () => {
    userLogin.style.display = "none";
    adminLogin.style.display = "none";
    roleSelection.style.display = "flex";
  };
});

document.getElementById("enter-chat").onclick = () => {
  const name = document.getElementById("username").value.trim();
  if (!name) return alert("Enter a name");
  currentUser = { displayName: name };
  isAdmin = false;
  initChat();
};

document.getElementById("google-login").onclick = () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).then(result => {
    const email = result.user.email;
    if (email !== ADMIN_EMAIL) {
      alert("Not authorized as admin");
      auth.signOut();
    } else {
      currentUser = result.user;
      isAdmin = true;
      initChat();
    }
  });
};

function initChat() {
  userLogin.style.display = "none";
  adminLogin.style.display = "none";
  roleSelection.style.display = "none";
  chatContainer.style.display = "flex";

  if (!sessionStorage.getItem("joined")) {
    db.ref("messages").push({
      type: "system",
      text: `${currentUser.displayName} joined the chat`,
      timestamp: Date.now()
    });
    sessionStorage.setItem("joined", "true");
  }

  db.ref("typing").on("value", snap => {
    const data = snap.val();
    if (data && data.name !== currentUser.displayName) {
      typingIndicator.innerText = `${data.name} is typing...`;
    } else {
      typingIndicator.innerText = "";
    }
  });

  db.ref("messages").on("value", snap => {
    chatMessages.innerHTML = "";
    snap.forEach(child => {
      const msg = child.val();
      const key = child.key;

      if (Date.now() - msg.timestamp > 86400000) {
        db.ref("messages/" + key).remove();
        return;
      }

      if (msg.type === "system") {
        const div = document.createElement("div");
        div.className = "system-message";
        div.innerHTML = `
          ${msg.text}
          ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${key}')">delete</span>` : ""}
        `;
        chatMessages.appendChild(div);
        return;
      }

      const sent = msg.name === currentUser.displayName;
      const adminMsg = msg.email === ADMIN_EMAIL;
      const color = adminMsg ? "#FF7B00" : assignColor(msg.name);
      const msgDiv = document.createElement("div");
      msgDiv.className = `message ${sent ? "sent" : "received"}`;
      msgDiv.innerHTML = `
        <img class="profile-pic" src="${msg.photo || "https://www.gravatar.com/avatar/?d=mp"}" />
        <div class="bubble">
          <div class="name" style="color:${color}">
            ${msg.name}${adminMsg ? ' <span class="material-icons admin-verified">verified</span>' : ""}
          </div>
          ${msg.replyTo ? `<div class="reply-to" style="font-size: 12px; color: #aaa;" onclick="scrollToMsg('${msg.replyTo.key}')">↪️ ${msg.replyTo.name}</div>` : ""}
          <div>${formatMessage(msg.text)}</div>
          <div class="time">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
        ${isAdmin ? `<span class="material-icons delete-btn" onclick="deleteMessage('${key}')">delete</span>` : ""}
      `;
      msgDiv.ondblclick = () => {
        replyTo = { name: msg.name, text: msg.text, key };
        replyToName.innerText = msg.name;
        replyToText.innerText = msg.text;
        replyPreview.style.display = "flex";
      };
      chatMessages.appendChild(msgDiv);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
    .replace(/\{(.*?)\}/g, '<span style="background:yellow;color:black;padding:2px 4px;border-radius:3px;">$1</span>')
    .replace(/~(.*?)~/g, "<s>$1</s>")
    .replace(/#(.*?)#/g, '<code style="background:#222;padding:2px 4px;border-radius:4px;">$1</code>')
    .replace(/@(\w+)/g, '<span style="color:#34B7F1">@$1</span>')
    .replace(/(https?:\/\/[^\s]+)/g, isAdmin ? '<a href="$1" target="_blank" style="color:#34B7F1;">$1</a>' : '[link removed]');
}

sendBtn.onclick = sendMessage;
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  } else {
    db.ref("typing").set({ name: currentUser.displayName });
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => db.ref("typing").remove(), 2000);
  }
});

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  if (/https?:\/\//i.test(text) && !isAdmin) {
    alert("Only admin can share links.");
    messageInput.value = "";
    return;
  }

  const message = {
    name: currentUser.displayName,
    email: currentUser.email || "",
    text,
    timestamp: Date.now(),
    replyTo: replyTo ? { name: replyTo.name, key: replyTo.key } : null,
    photo: currentUser.photoURL || ""
  };
  db.ref("messages").push(message);
  messageInput.value = "";
  replyTo = null;
  replyPreview.style.display = "none";
  db.ref("typing").remove();
}

function deleteMessage(key) {
  if (confirm("Are you sure you want to delete this message?")) {
    db.ref("messages/" + key).remove();
  }
}

function cancelReply() {
  replyTo = null;
  replyPreview.style.display = "none";
}

function scrollToMsg(key) {
  const allMsgs = [...document.querySelectorAll(".message")];
  const msgEl = allMsgs.find(el => el.innerHTML.includes(`deleteMessage('${key}')`));
  if (msgEl) msgEl.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------------------------
// Supabase client
// ---------------------------
const SUPABASE_URL = "https://ffbqgczghzervntyhfvd.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_ANON_KEY_HERE";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------
// Auth helpers
// ---------------------------
async function getCurrentUser() {
  const { data: session } = await supabaseClient.auth.getSession();
  return session?.session?.user || null;
}

async function updateAuthLink() {
  const authLink = document.getElementById("auth-link");
  if (!authLink) return;
  const user = await getCurrentUser();
  if (user) {
    authLink.textContent = "Logout";
    authLink.href = "#";
    authLink.onclick = async (e) => {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.reload();
    };
  } else {
    authLink.textContent = "Login";
    authLink.href = "auth.html";
  }
}

// ---------------------------
// Challenge helpers
// ---------------------------
function updateProgressBar(progressElemId, objectives) {
  const completed = objectives.filter(o => o.done).length;
  const total = objectives.length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const bar = document.getElementById(progressElemId);
  if (bar) bar.style.width = percent + "%";
  return `${completed} / ${total} (${percent}%)`;
}

function renderObjectives(listElemId, objectives, isEditable = false, onChange) {
  const list = document.getElementById(listElemId);
  if (!list) return;
  list.innerHTML = "";

  objectives.forEach((obj, index) => {
    const li = document.createElement("li");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = obj.done;
    checkbox.disabled = !isEditable;
    checkbox.style.marginRight = "0.5rem";
    checkbox.addEventListener("change", () => {
      if (!isEditable) return;
      obj.done = checkbox.checked;
      if (onChange) onChange(index, obj.done);
    });
    li.appendChild(checkbox);
    li.appendChild(document.createTextNode(obj.text));
    list.appendChild(li);
  });
}

// ---------------------------
// Likes helpers
// ---------------------------
async function getLikeStatus(challengeId) {
  const user = await getCurrentUser();
  if (!user) return { liked: false, userId: null };
  const { data: existing } = await supabaseClient
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .maybeSingle();
  return { liked: !!existing, userId: user.id };
}

async function toggleLike(challengeId, likeBtnId, likeCountId) {
  const user = await getCurrentUser();
  if (!user) return;

  const { data: existing } = await supabaseClient
    .from("likes")
    .select("id")
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .maybeSingle();

  if (!existing) {
    await supabaseClient.from("likes").insert({
      user_id: user.id,
      challenge_id: challengeId
    });
  } else {
    await supabaseClient
      .from("likes")
      .delete()
      .eq("user_id", user.id)
      .eq("challenge_id", challengeId);
  }

  await updateLikeCount(challengeId, likeCountId);

  const btn = document.getElementById(likeBtnId);
  if (btn) {
    const status = await getLikeStatus(challengeId);
    btn.textContent = status.liked ? "💔 Unlike" : "❤️ Like";
  }
}

async function updateLikeCount(challengeId, likeCountId) {
  const { count } = await supabaseClient
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("challenge_id", challengeId);
  const span = document.getElementById(likeCountId);
  if (span) span.textContent = ` ${count} likes`;
}

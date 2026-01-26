// --- Supabase Setup ---
const SUPABASE_URL = "https://ffbqgczghzervntyhfvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmYnFnY3pnaHplcnZudHloZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzU1MTAsImV4cCI6MjA4Mzk1MTUxMH0.N8eowQR-yhK9Hd6PrvxdHR30GYWc7U2xGdzJNw4u5U4"; // replace with your anon key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Helper: Get currently logged-in user ---
async function getCurrentUser() {
  try {
    const { data } = await supabaseClient.auth.getUser();
    return data.user || null;
  } catch (err) {
    console.error("Error getting current user:", err);
    return null;
  }
}

// --- Update auth link in nav ---
async function updateAuthLink() {
  const user = await getCurrentUser();
  const link = document.getElementById("auth-link");
  if (!link) return;

  if (user) {
    link.textContent = "Profile";
    link.href = "profile.html";
  } else {
    link.textContent = "Login";
    link.href = "auth.html";
  }
}

// --- Generate a random edit key ---
function generateEditKey() {
  return Math.random().toString(36).substring(2, 15);
}

// --- Update progress bar helper ---
function updateProgressBar(progressBarId, objectives) {
  let total = 0, done = 0;

  objectives.forEach(o => {
    total++;
    if (o.done) done++;
    (o.subObjectives || []).forEach(s => { total++; if (s.done) done++; });
  });

  const percent = total ? Math.round((done / total) * 100) : 0;
  const bar = document.getElementById(progressBarId);

  if (bar) {
    bar.style.width = percent + "%";
    bar.style.backgroundColor = "#facc15";
    bar.style.height = "1rem";
    bar.style.borderRadius = "0.25rem";
  }

  return `${done} / ${total} (${percent}%)`;
}

// --- Like system ---
async function toggleLike(challengeId, btnId, countId) {
  const user = await getCurrentUser();
  if (!user) return alert("Please log in to like challenges.");

  try {
    const { data: existingLikes } = await supabaseClient
      .from("likes")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id)
      .single();

    if (existingLikes) {
      await supabaseClient.from("likes").delete().eq("id", existingLikes.id);
    } else {
      await supabaseClient.from("likes").insert({
        challenge_id: challengeId,
        user_id: user.id
      });
    }

    updateLikeCount(challengeId, countId);
  } catch (err) {
    console.error("Error toggling like:", err);
  }
}

// --- Update like count display ---
async function updateLikeCount(challengeId, countId) {
  try {
    const { data } = await supabaseClient
      .from("likes")
      .select("*", { count: "exact" })
      .eq("challenge_id", challengeId);

    const countElem = document.getElementById(countId);
    if (countElem) countElem.textContent = data?.length || 0;
  } catch (err) {
    console.error("Error updating like count:", err);
  }
}

// --- Add challenge to user's personal list ---
async function addToMyChallenges(challengeId) {
  const user = await getCurrentUser();
  if (!user) return alert("Please log in to add challenges to your account.");

  try {
    const { data: existing } = await supabaseClient
      .from("user_challenges")
      .select("*")
      .eq("user_id", user.id)
      .eq("challenge_id", challengeId)
      .single();

    if (existing) {
      return alert("You already have this challenge in your list!");
    }

    await supabaseClient.from("user_challenges").insert({
      user_id: user.id,
      challenge_id: challengeId,
      edit_key: generateEditKey()
    });

    alert("Challenge added to your list!");
  } catch (err) {
    console.error("Error adding challenge to user list:", err);
  }
}

// --- Post Comment ---
async function postComment(challengeId, content) {
  const user = await getCurrentUser();
  if (!user) return alert("Login required.");

  if (!content.trim()) return;

  try {
    await supabaseClient.from("comments").insert({
      user_id: user.id,
      challenge_id: challengeId,
      content: content.trim()
    });
  } catch (err) {
    console.error("Error posting comment:", err);
  }
}

// --- Load Comments ---
async function loadComments(challengeId, containerId) {
  try {
    const { data } = await supabaseClient
      .from("comments")
      .select("id, content, created_at, user_id")
      .eq("challenge_id", challengeId)
      .order("created_at", { ascending: true });

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";
    data.forEach(c => {
      const div = document.createElement("div");
      div.className = "comment";
      div.innerHTML = `
        <p>${c.content}</p>
        <small>${new Date(c.created_at).toLocaleString()}</small>
      `;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Error loading comments:", err);
  }
}

// --- Log activity ---
async function logActivity(userId, challengeId, action = "updated progress") {
  try {
    await supabaseClient.from("activity").insert({
      user_id: userId,
      challenge_id: challengeId,
      action
    });
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}

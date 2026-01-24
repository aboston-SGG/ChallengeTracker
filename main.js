// --- Supabase Setup ---
const SUPABASE_URL = "https://ffbqgczghzervntyhfvd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmYnFnY3pnaHplcnZudHloZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzU1MTAsImV4cCI6MjA4Mzk1MTUxMH0.N8eowQR-yhK9Hd6PrvxdHR30GYWc7U2xGdzJNw4u5U4"; // replace with anon key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Helper: Get currently logged-in user ---
async function getCurrentUser() {
  const { data } = await supabaseClient.auth.getUser();
  return data.user; // returns null if not logged in
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

// --- Generate a random edit key for user challenges ---
function generateEditKey() {
  return Math.random().toString(36).substring(2, 15);
}

// --- Update progress bar helper ---
function updateProgressBar(progressBarId, objectives) {
  const total = objectives.length;
  const done = objectives.filter(o => o.done).length;
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
  if (!user) {
    alert("Please log in to like challenges.");
    return;
  }

  // Check if user already liked this challenge
  const { data: existingLikes } = await supabaseClient
    .from("likes")
    .select("*")
    .eq("challenge_id", challengeId)
    .eq("user_id", user.id)
    .single();

  if (existingLikes) {
    // Remove like
    await supabaseClient.from("likes").delete()
      .eq("id", existingLikes.id);
  } else {
    // Add like
    await supabaseClient.from("likes").insert({
      challenge_id: challengeId,
      user_id: user.id
    });
  }

  updateLikeCount(challengeId, countId);
}

// --- Update like count display ---
async function updateLikeCount(challengeId, countId) {
  const { data } = await supabaseClient
    .from("likes")
    .select("*", { count: "exact" })
    .eq("challenge_id", challengeId);

  const countElem = document.getElementById(countId);
  if (countElem) countElem.textContent = data?.length || 0;
}

// --- Add challenge to user's personal list ---
async function addToMyChallenges(challengeId) {
  const user = await getCurrentUser();
  if (!user) {
    alert("Please log in to add challenges to your account.");
    return;
  }

  // Check if already added
  const { data: existing } = await supabaseClient
    .from("user_challenges")
    .select("*")
    .eq("user_id", user.id)
    .eq("challenge_id", challengeId)
    .single();

  if (existing) {
    alert("You already have this challenge in your list!");
    return;
  }

  // Insert
  await supabaseClient.from("user_challenges").insert({
    user_id: user.id,
    challenge_id: challengeId,
    edit_key: generateEditKey()
  });

  alert("Challenge added to your list!");
}

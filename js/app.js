// View switching
document.querySelectorAll("[data-view]").forEach(el => {
  el.addEventListener("click", () => {
    const target = el.getAttribute("data-view");
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(target).classList.add("active");
  });
});

// Community link
document.getElementById("communityLink").href = LAMMB.communityUrl;

// Buy logic
const pre = document.getElementById("prelaunch");
const live = document.getElementById("live");
const caEl = document.getElementById("ca");
const dexEl = document.getElementById("dexLinks");

document.getElementById("continueBuy").onclick = () => {
  if (LAMMB.launchMode === "live" && LAMMB.token.mint) {
    pre.classList.add("hidden");
    live.classList.remove("hidden");

    caEl.textContent = LAMMB.token.mint;
    caEl.onclick = () => navigator.clipboard.writeText(LAMMB.token.mint);

    Object.entries(LAMMB.token.dexLinks).forEach(([name, url]) => {
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.textContent = `[ ${name} ]`;
        a.style.marginRight = "16px";
        dexEl.appendChild(a);
      }
    });
  }
};

// Landing page: scroll-reveal + onboarding form
document.addEventListener("DOMContentLoaded", () => {
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in-view"));
  }

  const form = document.getElementById("onboard-form");
  if (form) {
    const dateInput = document.getElementById("onboard-date");
    dateInput.value = getExamDate();

    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const date = dateInput.value;
      const priority = form.querySelector('input[name="priority"]:checked');
      if (date) setExamDate(date);
      if (priority && priority.value !== "none") setJSON(STORE_KEYS.priority, priority.value);
      setJSON(STORE_KEYS.onboarded, true);
      window.location.href = "painel.html";
    });
  }

  const skip = document.getElementById("onboard-skip");
  if (skip) {
    skip.addEventListener("click", (ev) => {
      ev.preventDefault();
      setJSON(STORE_KEYS.onboarded, true);
      window.location.href = "painel.html";
    });
  }
});

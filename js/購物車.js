const SITE_HEADER = document.querySelector(".site-header");
const BACK_TO_TOP_BUTTON = document.querySelector(".back-to-top");
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

function UpdateBackToTopVisibility([headerEntry]) {
  BACK_TO_TOP_BUTTON.hidden = headerEntry.isIntersecting;
}

function ScrollToTop() {
  SITE_HEADER.focus({ preventScroll: true });
  window.scrollTo({
    top: 0,
    behavior: REDUCED_MOTION.matches ? "instant" : "smooth",
  });
}

const HEADER_OBSERVER = new IntersectionObserver(UpdateBackToTopVisibility);
HEADER_OBSERVER.observe(SITE_HEADER);
BACK_TO_TOP_BUTTON.addEventListener("click", ScrollToTop);

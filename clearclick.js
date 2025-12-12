function main() {
	const MotionGlobal = window.Motion;

	if (!MotionGlobal) {
		console.warn("[clearclick] Motion library not found on window.Motion");
	}

	const { animate, inView } = MotionGlobal || {};

	function hideShowNav() {
		const nav = document.querySelector(".nav");
		if (!nav) return;

		const showThreshold = 50; // Always show when within this distance from top
		const hideThreshold = 150; // Can hide only after passing this
		const revealBuffer = 50; // Scroll-up distance before revealing
		const hideBuffer = 10; // Small buffer to prevent flicker

		let lastScrollY = window.scrollY;
		let currentScrollY = window.scrollY;
		let revealDistance = 0;
		let navHidden = false;
		let ticking = false;

		// Clean up any existing trigger
		const oldTrigger = ScrollTrigger.getById("hideShowNav");
		if (oldTrigger) oldTrigger.kill();

		// rAF update loop
		function updateNav() {
			ticking = false;

			const y = currentScrollY;
			const delta = y - lastScrollY;

			// --- NAV VISIBILITY ---
			if (y <= showThreshold) {
				if (navHidden) {
					nav.classList.remove("is-hidden", "is-past-threshold");
					navHidden = false;
				}
				revealDistance = 0;
			} else if (delta > hideBuffer && y > hideThreshold && !navHidden) {
				nav.classList.add("is-hidden", "is-past-threshold");
				navHidden = true;
				revealDistance = 0;
			} else if (delta < 0 && navHidden) {
				revealDistance -= delta; // delta is negative
				if (revealDistance >= revealBuffer) {
					nav.classList.remove("is-hidden");
					navHidden = false;
					revealDistance = 0;
				}
			}

			nav.classList.toggle("is-past-threshold", y > hideThreshold);

			lastScrollY = y;
		}

		// ScrollTrigger watches scroll and schedules an update
		ScrollTrigger.create({
			id: "hideShowNav",
			trigger: document.body,
			start: "top top",
			end: "bottom bottom",
			onUpdate() {
				currentScrollY = window.scrollY;
				if (!ticking) {
					ticking = true;
					requestAnimationFrame(updateNav);
				}
			},
		});
	}

	function logoStaggers() {
		var delay = 400; // adjust as needed for a faster or slower stagger
		$(".logo-cycle_track").each(function (index) {
			const card = $(this);
			setTimeout(function () {
				card.addClass("is-anim");
			}, index * delay);
		});
	}

	function animTextFadeIn() {
		const startOpacity = 0.3;
		const textElements = document.querySelectorAll(".anim-text-fade");
		/* use GSAP split text to animate in word by word according to these specs: 

        Text Fade on Scroll
Each text block fades in word-by-word as it enters view.
Motion: opacity 0 → 1 with light stagger (~0.1–0.2s)
Timing: ~0.6–0.8s per word/line, ease-in-out
Feel: soft, calm, no movement — opacity only
Trigger: starts once at ~30–40% in viewport (no repeat)
Ref: Studio Everywhere / Releaf.bio

*/
		textElements.forEach((el) => {
			const split = new SplitText(el, { type: "words" });
			// gsap.set(split.words, { autoAlpha: startOpacity }); //
			gsap.set(el, { autoAlpha: 1 }); // ensure container is visible, revert default CSS
			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: el,
					start: "top 75%",
					end: "top 5%",
					scrub: 1,
					markers: false,
				},
			});
			tl.from(split.words, {
				autoAlpha: startOpacity,
				duration: 4,
				ease: "cubic.out",
				stagger: 0.4,
			});
		});
	}

	function initMotionCounters() {
		if (!animate || !inView) {
			console.warn("[clearclick] Motion animate/inView unavailable, skipping counters");
			return;
		}

		// Only bother if we actually have counters on this page
		const counterSelector = "[data-motion-counter='true']";
		if (!document.querySelector(counterSelector)) return;

		inView(
			counterSelector,
			(element) => {
				const target = parseFloat(element.getAttribute("data-count-target") || "0");
				if (Number.isNaN(target)) return;

				const duration = parseFloat(element.getAttribute("data-count-duration") || "1.2");
				const prefix = element.getAttribute("data-count-prefix") || "";
				const suffix = element.getAttribute("data-count-suffix") || "";
				const decimals = parseInt(element.getAttribute("data-count-decimals") || "0", 10);

				// Use Intl for formatting
				const formatter = new Intl.NumberFormat("en-GB", {
					minimumFractionDigits: decimals,
					maximumFractionDigits: decimals,
				});

				// start from existing text, stripped of junk
				const initial = parseFloat((element.textContent || "").replace(/[^\d.-]/g, ""));
				const from = Number.isFinite(initial) ? initial : 0;

				// Make sure the element starts at the "from" value
				element.textContent = `${prefix}${formatter.format(from)}${suffix}`;

				// Kick off the animation once it enters view.
				animate(from, target, {
					duration,
					ease: "spring",
					onUpdate(latest) {
						const value = decimals > 0 ? latest : Math.round(latest);
						element.textContent = `${prefix}${formatter.format(value)}${suffix}`;
					},
				});
			},
			{
				margin: "0px 0px -10% 0px", // trigger a bit earlier
			}
		);
	}

	hideShowNav();
	logoStaggers();

	// wait for fonts to load before animating text
	document.fonts.ready.then(() => {
		document.body.classList.add("fonts-loaded");
		animTextFadeIn();
		initMotionCounters();
	});
}

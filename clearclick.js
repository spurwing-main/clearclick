function main() {
	const MotionGlobal = window.Motion;

	if (!MotionGlobal) {
		console.warn("[clearclick] Motion library not found on window.Motion");
	}

	const { animate, inView, stagger } = MotionGlobal || {};

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

		// Bail if there are no counters at all
		if (!document.querySelector("[data-count-target]")) return;

		const triggers = document.querySelectorAll("[data-count-trigger='true']");
		if (!triggers.length) return;

		triggers.forEach((trigger) => {
			// All counters inside this trigger
			const elements = trigger.querySelectorAll("[data-count-target]");
			if (!elements.length) return;

			// per-group stagger value
			const baseStagger = parseFloat(trigger.getAttribute("data-count-stagger") || "0.15") || 0;

			inView(
				trigger,
				() => {
					elements.forEach((element, index) => {
						const target = parseFloat(element.getAttribute("data-count-target") || "0");
						if (Number.isNaN(target)) return;

						const duration = parseFloat(element.getAttribute("data-count-duration") || "1.2");
						const prefix = element.getAttribute("data-count-prefix") || "";
						const suffix = element.getAttribute("data-count-suffix") || "";
						const decimals = parseInt(element.getAttribute("data-count-decimals") || "0", 10);

						// Number formatting
						const formatter = new Intl.NumberFormat("en-GB", {
							minimumFractionDigits: decimals,
							maximumFractionDigits: decimals,
						});

						// Start from existing text (stripped) or 0
						const initial = parseFloat((element.textContent || "").replace(/[^\d.-]/g, ""));
						const from = Number.isFinite(initial) ? initial : 0;

						// Ensure initial text
						element.textContent = `${prefix}${formatter.format(from)}${suffix}`;

						// Animate with per-element delay
						animate(from, target, {
							duration,
							ease: "circOut",
							delay: index * baseStagger, // staggered start
							onUpdate(latest) {
								const value = decimals > 0 ? latest : Math.round(latest);
								element.textContent = `${prefix}${formatter.format(value)}${suffix}`;
							},
						});
					});
				},
				{
					margin: "0px 0px -10% 0px", // trigger a bit earlier
					once: true, // only fire once per trigger
				}
			);
		});
	}

	function latestCarousel() {
		const mq = window.matchMedia("(max-width: 991px)");

		const OPTIONS = {
			align: "start",
			containScroll: "trimSnaps",
			loop: false,
		};

		const components = document.querySelectorAll(".c-latest");
		if (!components.length) return;

		components.forEach((component) => {
			const emblaNode = component.querySelector(".latest_list-wrap.embla");
			if (!emblaNode) return;

			const viewportNode = emblaNode; // emblaNode IS the viewport in your markup
			const dotsNode = component.querySelector(".latest_dots");
			if (!dotsNode) return;

			let emblaApi = null;
			let dotNodes = [];

			function buildDots() {
				dotsNode.innerHTML = emblaApi
					.scrollSnapList()
					.map(
						(_, index) => `<button class="latest_dot" type="button" data-index="${index}"></button>`
					)
					.join("");

				dotNodes = Array.from(dotsNode.querySelectorAll(".latest_dot"));

				dotNodes.forEach((dot) => {
					dot.addEventListener("click", () => {
						emblaApi.scrollTo(Number(dot.dataset.index));
					});
				});
			}

			function updateActiveDot() {
				const selectedIndex = emblaApi.selectedScrollSnap();

				dotNodes.forEach((dot, index) => {
					dot.classList.toggle("latest_dot--selected", index === selectedIndex);
				});
			}

			function init() {
				if (emblaApi) return;

				emblaApi = EmblaCarousel(viewportNode, OPTIONS);

				emblaApi
					.on("init", buildDots)
					.on("reInit", buildDots)
					.on("init", updateActiveDot)
					.on("reInit", updateActiveDot)
					.on("select", updateActiveDot);
			}

			function destroy() {
				if (!emblaApi) return;

				emblaApi.destroy();
				emblaApi = null;

				dotsNode.innerHTML = "";
				dotNodes = [];
			}

			function breakpointCheck(e) {
				if (e.matches) {
					init(); // ≤ 991px
				} else {
					destroy(); // > 991px
				}
			}

			// Initial run per component
			breakpointCheck(mq);

			// Listen once per component
			mq.addEventListener("change", breakpointCheck);
		});
	}

	function caseStudiesCarousel() {
		const mainRoot = document.querySelector(".csc_list-wrapper.embla");
		const thumbRoot = document.querySelector(".csc_logo-slider.embla");

		if (!mainRoot || !thumbRoot) return;

		const mainViewport = mainRoot;
		const thumbViewport = thumbRoot;

		const thumbContainer = thumbRoot.querySelector(".embla__container");
		if (!thumbContainer) return;

		// --- Embla options ---
		const MAIN_OPTIONS = {
			align: "start",
			loop: false,
			duration: 12,
		};

		const THUMB_OPTIONS = {
			align: "center",
			loop: false,
			dragFree: true,
			containScroll: "keepSnaps",
			duration: 12,
		};

		// --- Init main Embla ---
		const emblaMain = EmblaCarousel(mainViewport, MAIN_OPTIONS);

		// --- Build thumb slides dynamically ---
		function buildThumbs() {
			thumbContainer.innerHTML = "";

			const mainSlides = emblaMain.slideNodes();

			mainSlides.forEach((slide, index) => {
				const logoBtn = slide.querySelector(".csc_logo");
				if (!logoBtn) return;

				// Wrap logo button in a thumb slide
				const thumbSlide = document.createElement("div");
				thumbSlide.className = "csc_logo-slide embla__slide";
				thumbSlide.dataset.index = index;

				// Move (not clone) the button
				thumbSlide.appendChild(logoBtn);

				thumbContainer.appendChild(thumbSlide);
			});
		}

		function updateThumbLayout() {
			const viewportWidth = thumbViewport.clientWidth;
			const trackWidth = thumbContainer.scrollWidth;

			const hasOverflow = trackWidth > viewportWidth + 1;

			const shouldCenter = !hasOverflow;

			thumbRoot.classList.toggle("has-overflow", hasOverflow);
			thumbRoot.classList.toggle("is-centered", shouldCenter);

			if (shouldCenter) {
				// Lock the carousel
				emblaThumb.scrollTo(0, true);
				emblaThumb.internalEngine().options.dragFree = false;
			} else {
				// Restore normal behaviour
				emblaThumb.internalEngine().options.dragFree = true;
			}
		}

		buildThumbs();

		// --- Init thumb Embla AFTER DOM is built ---
		const emblaThumb = EmblaCarousel(thumbViewport, THUMB_OPTIONS);

		const thumbSlides = emblaThumb.slideNodes();

		// --- Click thumbs → move main ---
		thumbSlides.forEach((slide, index) => {
			slide.addEventListener("click", () => {
				emblaMain.scrollTo(index);
			});
		});

		// --- Sync active state ---
		function syncThumbs() {
			const selected = emblaMain.selectedScrollSnap();

			thumbSlides.forEach((slide, i) => {
				slide.classList.toggle("is-active", i === selected);
			});

			if (!thumbRoot.classList.contains("is-centered")) {
				emblaThumb.scrollTo(selected);
			}
		}

		emblaMain.on("select", syncThumbs);
		emblaThumb.on("init", syncThumbs);

		// Initial sync
		syncThumbs();

		emblaThumb.on("init", updateThumbLayout);
		emblaThumb.on("reInit", updateThumbLayout);
		window.addEventListener("resize", updateThumbLayout);
	}

	hideShowNav();
	logoStaggers();
	latestCarousel();
	caseStudiesCarousel();

	// wait for fonts to load before animating text
	document.fonts.ready.then(() => {
		document.body.classList.add("fonts-loaded");
		animTextFadeIn();
		initMotionCounters();
	});
}

function main() {
	const MotionGlobal = window.Motion;

	if (!MotionGlobal) {
		console.warn("[clearclick] Motion library not found on window.Motion");
	}

	const { animate, inView, stagger } = MotionGlobal || {};

	function homeHeroCorners() {
		// on scroll, animate bottom corner radius of .c-home-hero from 0 to 3rem
		const hero = document.querySelector(".c-home-hero");
		if (!hero) return;
		gsap.to(
			hero,
			// {
			// 	borderBottomLeftRadius: "0rem",
			// 	borderBottomRightRadius: "0rem",
			// },
			{
				borderBottomLeftRadius: "3rem",
				borderBottomRightRadius: "3rem",
				scrollTrigger: {
					trigger: hero,
					start: "top top",
					// end should be after scrolling a fixed amount
					end: () => `+=${window.innerHeight * 0.25}`,
					scrub: 1,
					// markers: false,
					// duration: 0.01,
					ease: "power1.out",
					// toggleActions: "restart none none reverse",
				},
			}
		);
	}

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
		if (
			typeof gsap === "undefined" ||
			typeof ScrollTrigger === "undefined" ||
			typeof SplitText === "undefined"
		) {
			console.warn("[clearclick] GSAP/ScrollTrigger/SplitText missing; skipping animTextFadeIn()");
			return;
		}

		const startOpacity = 0.3;
		const els = gsap.utils.toArray(".anim-text-fade");
		let madeAnyScrollTriggers = false;

		els.forEach((el) => {
			// --- safe re-init (Swup/FS rerenders/etc.) ---
			if (el._ccTextFade) {
				el._ccTextFade.st?.kill();
				el._ccTextFade.tl?.kill();
				el._ccTextFade.split?.revert();
				if (typeof el._ccTextFade.cleanup === "function") el._ccTextFade.cleanup();
				el._ccTextFade = null;
			}

			// Ensure the block itself isn't hidden by CSS
			gsap.set(el, { autoAlpha: 1 });

			const split = new SplitText(el, { type: "words" });

			// Explicit baseline (don’t rely on from() + immediateRender quirks)
			gsap.set(split.words, { autoAlpha: startOpacity });

			const tl = gsap.timeline({ paused: true });
			tl.to(split.words, {
				autoAlpha: 1,
				duration: 0.75,
				ease: "power1.inOut",
				stagger: 0.08,
				overwrite: "auto",
				onComplete: () => gsap.set(split.words, { clearProps: "opacity,visibility" }),
			});

			const revealItem = el.classList.contains("cc-reveal-item")
				? el
				: el.closest?.(".cc-reveal-item") || null;

			// If this lives inside the cc-reveal system, do NOT add a separate ScrollTrigger.
			// Instead, listen for the reveal item's own event so timings stay in sync.
			if (revealItem) {
				const onReveal = () => tl.play(0);
				revealItem.addEventListener("cc:reveal", onReveal, { once: true });

				// If reveal already happened before fonts loaded / this init ran,
				// force the end state so text isn't stuck dim.
				if (revealItem.dataset?.ccRevealDone === "1") tl.progress(1);

				el._ccTextFade = {
					split,
					tl,
					st: null,
					cleanup: () => revealItem.removeEventListener("cc:reveal", onReveal),
				};
				return;
			}

			const st = ScrollTrigger.create({
				trigger: el,
				start: "top 65%", // ~35% into viewport (tweak)
				once: true, // kill after first run
				onEnter: () => tl.play(0),
				onRefresh(self) {
					// If we refreshed while already past the start, force final state immediately.
					if (self.progress > 0) tl.progress(1);
				},
			});

			madeAnyScrollTriggers = true;

			// Covers initial load where we're already past the trigger
			if (st.progress > 0) tl.progress(1);

			el._ccTextFade = { split, tl, st };
		});

		// Helpful if any last-moment layout shifts happen after this init
		if (madeAnyScrollTriggers) ScrollTrigger.refresh();
	}

	function initMotionCounters() {
		return;
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

			const viewportNode = emblaNode;
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

				const ClassNames = window.EmblaCarouselClassNames?.ClassNames;

				emblaApi = EmblaCarousel(viewportNode, OPTIONS, ClassNames ? [ClassNames()] : []);

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

	function approachSliderCarousel() {
		// Requires EmblaCarousel on window
		if (typeof EmblaCarousel === "undefined") {
			console.warn("[clearclick] EmblaCarousel not found, skipping approachSliderCarousel()");
			return;
		}

		// DrawSVG support (optional but requested)
		const hasDrawSVG =
			(typeof gsap !== "undefined" && gsap.plugins && gsap.plugins.DrawSVGPlugin) ||
			typeof DrawSVGPlugin !== "undefined";

		if (typeof DrawSVGPlugin !== "undefined" && (!gsap.plugins || !gsap.plugins.DrawSVGPlugin)) {
			// Safe to call even if already registered
			gsap.registerPlugin(DrawSVGPlugin);
		}

		if (!hasDrawSVG) {
			console.warn(
				"[clearclick] DrawSVGPlugin not found; .approach-card_line animations will be skipped."
			);
		}
		const components = Array.from(document.querySelectorAll(".c-approach-slider"));
		if (!components.length) return;

		const OPTIONS = {
			align: "start",
			containScroll: "keepSnaps",
			loop: false,
			dragFree: false,
		};

		components.forEach((component) => {
			if (component._ccApproachEmblaBound) return;
			component._ccApproachEmblaBound = true;

			const viewport = component.querySelector(".approach-slider_track");
			const prevBtn = component.querySelector(".controls-arrow.is-prev");
			const nextBtn = component.querySelector(".controls-arrow.is-next");

			if (!viewport) return;

			let embla = null;
			let lastSelected = 0; // ✅ shared by syncLines + onIndexChange + reInit

			function setArrowsEnabled() {
				if (!embla) return;

				const canPrev = embla.canScrollPrev();
				const canNext = embla.canScrollNext();

				if (prevBtn) prevBtn.disabled = !canPrev;
				if (nextBtn) nextBtn.disabled = !canNext;

				if (prevBtn) prevBtn.classList.toggle("is-disabled", !canPrev);
				if (nextBtn) nextBtn.classList.toggle("is-disabled", !canNext);
			}

			// --- DrawSVG line animation per active slide ---
			function getLine(slideEl) {
				return slideEl?.querySelector?.(".approach-card_line.is-2") || null;
			}

			function initLine(lineEl) {
				if (!lineEl) return;
				if (lineEl.dataset.ccLineInit === "1") return;

				lineEl.dataset.ccLineInit = "1";
				gsap.set(lineEl, {
					transformOrigin: "0% 50%",
					scaleX: 0,
				});
			}

			function setLine(lineEl, filled) {
				if (!lineEl) return;
				initLine(lineEl);
				gsap.set(lineEl, { scaleX: filled ? 1 : 0, overwrite: false });
			}

			function animateLineTo(lineEl, filled, opts = {}) {
				if (!lineEl) return;
				initLine(lineEl);

				const { duration = 0.6, ease = "power2.out" } = opts;

				gsap.killTweensOf(lineEl);

				// For filling we prefer a deterministic 0 -> 1 animation.
				// For un-filling we tween back to 0.
				if (filled) {
					gsap.fromTo(
						lineEl,
						{ scaleX: 0 },
						{
							scaleX: 1,
							duration,
							ease,
							overwrite: "auto",
						}
					);
				} else {
					gsap.to(lineEl, {
						scaleX: 0,
						duration: Math.min(0.45, duration),
						ease: "power2.inOut",
						overwrite: "auto",
					});
				}
			}

			function syncLines({ animateActive = false, animateReverse = false } = {}) {
				if (!embla) return;

				const slides = embla.slideNodes();
				const selected = embla.selectedScrollSnap();

				// Ensure all lines are initialized (prevents “last slide never animates” due to missing init)
				slides.forEach((slideEl) => initLine(getLine(slideEl)));

				// Preceding slides: end state visible
				for (let i = 0; i < selected; i++) setLine(getLine(slides[i]), true);

				// Following slides: hidden (optionally animate when reversing)
				for (let i = selected + 1; i < slides.length; i++) {
					const line = getLine(slides[i]);
					if (!line) continue;

					if (animateReverse && i <= lastSelected) animateLineTo(line, false);
					else setLine(line, false);
				}

				// Active slide: animate to visible if requested, else just ensure visible
				const activeLine = getLine(slides[selected]);
				if (activeLine) {
					if (animateActive) animateLineTo(activeLine, true);
					else setLine(activeLine, true);
				}

				lastSelected = selected;
			}

			function init() {
				if (embla) return;

				embla = EmblaCarousel(viewport, OPTIONS);

				// Wire arrows
				if (prevBtn) prevBtn.addEventListener("click", () => embla && embla.scrollPrev());
				if (nextBtn) nextBtn.addEventListener("click", () => embla && embla.scrollNext());

				embla.on("init", () => {
					setArrowsEnabled();
					// Initial state:
					// - slides before active: filled
					// - active: filled (no animation on load)
					// - after: empty
					syncLines({ animateActive: false, animateReverse: false });
				});

				embla.on("reInit", () => {
					setArrowsEnabled();
					// Re-sync without replaying everything
					lastSelected = embla.selectedScrollSnap() || 0;
					syncLines({ animateActive: false, animateReverse: false });
				});

				const onIndexChange = () => {
					if (!embla) return;

					setArrowsEnabled();

					const nextSelected = embla.selectedScrollSnap();

					// Prevent the "select + settle" double-fire from re-triggering animations
					if (nextSelected === lastSelected) return;

					const isForward = nextSelected > lastSelected;

					syncLines({
						animateActive: isForward, // ✅ only forward animates active
						animateReverse: !isForward, // ✅ only backward reverses
					});

					// lastSelected is updated inside syncLines at the end,
					// but it's fine to also update here if you prefer:
					// lastSelected = nextSelected;
				};

				embla.on("select", onIndexChange);
				embla.on("settle", onIndexChange);

				// In case init events fire before we attach handlers
				setArrowsEnabled();
				syncLines({ animateActive: false, animateReverse: false });
			}

			init();
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
			align: "center",
			loop: true,
			duration: 12,
		};

		// Thumb strip: only enable looping when it actually overflows.
		// When it does not overflow we don't initialize Embla at all (CSS centers it).
		const THUMB_OPTIONS_NO_OVERFLOW = {
			align: "center",
			loop: false,
			dragFree: true,
			containScroll: "trimSnaps",
			duration: 12,
		};
		const THUMB_OPTIONS_OVERFLOW = {
			align: "center",
			loop: true,
			dragFree: true,
			duration: 12,
		};

		function getEmblaClassNamesPlugin() {
			const g = window.EmblaCarouselClassNames;

			// UMD builds can expose different shapes
			if (!g) return null;
			if (typeof g === "function") return g;
			if (typeof g.ClassNames === "function") return g.ClassNames;
			if (typeof g.default === "function") return g.default;
			return null;
		}

		const ClassNamesPlugin = getEmblaClassNamesPlugin();
		if (!ClassNamesPlugin) {
			console.warn(
				"[clearclick] Embla class-names plugin not found for caseStudiesCarousel(). Check window.EmblaCarouselClassNames"
			);
		}

		// --- Init main Embla ---
		const emblaMain = EmblaCarousel(
			mainViewport,
			MAIN_OPTIONS,
			ClassNamesPlugin ? [ClassNamesPlugin()] : []
		);

		const mainSlides = emblaMain.slideNodes();

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

				// Clone the button so we don't mutate the main slide DOM.
				// (Moving it can cause weird layout/measure issues and makes re-init harder.)
				thumbSlide.appendChild(logoBtn.cloneNode(true));

				thumbContainer.appendChild(thumbSlide);
			});
		}

		let emblaThumb = null;
		let thumbHasOverflow = null;
		let thumbLoopEnabled = null;
		let layoutRaf = 0;
		let ro = null;

		function getThumbSlides() {
			return emblaThumb ? emblaThumb.slideNodes() : Array.from(thumbContainer.children);
		}

		function measureThumbOverflow() {
			const viewportWidth = thumbViewport.clientWidth;
			const trackWidth = thumbContainer.scrollWidth;
			// Add a small buffer for rounding/font/image load jitter.
			return trackWidth > viewportWidth + 2;
		}

		function initThumbEmblaIfNeeded({ loop } = {}) {
			const desiredLoop = !!loop;
			if (emblaThumb) {
				// If loop mode changed (overflow state flipped), rebuild.
				if (thumbLoopEnabled !== desiredLoop) {
					destroyThumbEmblaIfNeeded();
				} else {
					return;
				}
			}

			emblaThumb = EmblaCarousel(
				thumbViewport,
				desiredLoop ? THUMB_OPTIONS_OVERFLOW : THUMB_OPTIONS_NO_OVERFLOW
			);
			thumbLoopEnabled = desiredLoop;
		}

		function destroyThumbEmblaIfNeeded() {
			if (!emblaThumb) return;
			try {
				emblaThumb.destroy();
			} catch (e) {}
			emblaThumb = null;
			thumbLoopEnabled = null;
			// Ensure we don't keep an old transform around when switching to CSS centering.
			thumbContainer.style.transform = "translate3d(0px, 0px, 0px)";
		}

		function applyThumbMode() {
			const hasOverflow = measureThumbOverflow();
			thumbHasOverflow = hasOverflow;

			thumbRoot.classList.toggle("has-overflow", hasOverflow);
			thumbRoot.classList.toggle("is-centered", !hasOverflow);

			if (hasOverflow) {
				initThumbEmblaIfNeeded({ loop: true });
			} else {
				destroyThumbEmblaIfNeeded();
			}
		}

		function scheduleThumbLayout() {
			if (layoutRaf) cancelAnimationFrame(layoutRaf);
			layoutRaf = requestAnimationFrame(() => {
				layoutRaf = 0;
				applyThumbMode();
				syncThumbs();
			});
		}

		buildThumbs();

		// --- Click thumbs → move main ---
		getThumbSlides().forEach((slide) => {
			slide.addEventListener("click", () => {
				const idx = Number(slide.dataset.index);
				emblaMain.scrollTo(Number.isFinite(idx) ? idx : 0);
			});
		});

		// --- Sync active state ---
		function syncThumbs() {
			const selected = emblaMain.selectedScrollSnap();

			const slides = getThumbSlides();
			slides.forEach((slide, i) => {
				slide.classList.toggle("is-active", i === selected);
			});

			if (emblaThumb && thumbHasOverflow) {
				emblaThumb.scrollTo(selected);
			}
		}

		function updateMainSlideStates() {
			const selected = emblaMain.selectedScrollSnap();

			mainSlides.forEach((slide, i) => {
				slide.classList.remove("is-active", "is-prev", "is-next");

				if (i === selected) slide.classList.add("is-active");
				if (i === selected - 1) slide.classList.add("is-prev");
				if (i === selected + 1) slide.classList.add("is-next");
			});
		}

		emblaMain.on("select", syncThumbs);

		// Layout: images often load after init which changes scrollWidth.
		// Use ResizeObserver where possible, and always run a couple of delayed passes.
		applyThumbMode();
		syncThumbs();

		if (typeof ResizeObserver !== "undefined") {
			ro = new ResizeObserver(() => scheduleThumbLayout());
			try {
				ro.observe(thumbViewport);
				ro.observe(thumbContainer);
			} catch (e) {}
		}

		window.addEventListener("resize", scheduleThumbLayout);
		setTimeout(scheduleThumbLayout, 0);
		setTimeout(scheduleThumbLayout, 250);
		setTimeout(scheduleThumbLayout, 1000);

		emblaMain.on("init", updateMainSlideStates);
		emblaMain.on("select", updateMainSlideStates);
		emblaMain.on("reInit", updateMainSlideStates);

		// Initial run
		updateMainSlideStates();
	}

	function caseStudiesSimpleCarousel() {
		const log = (...args) => console.log("[clearclick][cscSimple]", ...args);
		const warn = (...args) => console.warn("[clearclick][cscSimple]", ...args);

		if (typeof gsap === "undefined") {
			return;
		}

		const prefersReduced =
			window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		const components = Array.from(document.querySelectorAll(".c-csc-simple"));
		if (!components.length) return;

		function getSlideMedia(slideEl) {
			return slideEl?.querySelector?.(".csc-simple-slide_media") || null;
		}

		function getSlideContentElements(slideEl) {
			if (!slideEl) return [];
			const header = slideEl.querySelector(".csc-simple-card_header");
			const quote = slideEl.querySelector(".csc-simple-card_quote");
			const author = slideEl.querySelector(".c-author");
			const stats = Array.from(slideEl.querySelectorAll(".c-csc-simple-stat"));
			return [header, quote, author, ...stats].filter(Boolean);
		}

		function setA11y(slides, activeIndex) {
			slides.forEach((slide, i) => {
				const isActive = i === activeIndex;
				slide.setAttribute("aria-hidden", isActive ? "false" : "true");
				// Stop tabbing into hidden slides (links/buttons inside)
				slide.querySelectorAll("a, button, input, textarea, select, [tabindex]").forEach((el) => {
					// Preserve author-set tabindex if you have any
					if (!el._ccPrevTabindex) el._ccPrevTabindex = el.getAttribute("tabindex");
					if (isActive) {
						if (el._ccPrevTabindex === null) el.removeAttribute("tabindex");
						else el.setAttribute("tabindex", el._ccPrevTabindex);
					} else {
						el.setAttribute("tabindex", "-1");
					}
				});
			});
		}

		components.forEach((component, idx) => {
			// --- safe re-init cleanup ---
			if (component._ccCscSimpleAbort) {
				component._ccCscSimpleAbort.abort();
				component._ccCscSimpleAbort = null;
			}
			if (component._ccCscSimpleTl) {
				component._ccCscSimpleTl.kill();
				component._ccCscSimpleTl = null;
			}

			const abort = new AbortController();
			component._ccCscSimpleAbort = abort;

			component.classList.add("cc-ready");

			const viewport = component.querySelector(".csc-simple_list-wrapper");
			if (!viewport) {
				return;
			}

			const container = viewport.querySelector(".csc-simple_list");
			if (!container) {
				return;
			}

			const slides = Array.from(container.querySelectorAll(".c-csc-simple-slide"));
			if (!slides.length) return;

			// Controls
			const prevBtn = component.querySelector(".csc-simple_controls .controls-arrow.is-prev");
			const nextBtn = component.querySelector(".csc-simple_controls .controls-arrow.is-next");

			// If only 1 slide, disable arrows and bail early
			if (slides.length < 2) {
				if (prevBtn) prevBtn.classList.add("is-disabled");
				if (nextBtn) nextBtn.classList.add("is-disabled");
				return;
			}

			slides.forEach((slide) => {
				if (getComputedStyle(slide).display === "none") slide.style.display = "grid";
			});

			slides.forEach((slide) => {
				slide.style.position = "relative";
				slide.style.zIndex = "0";
			});

			// --- initial state ---
			const state = component._ccCscSimpleState || { index: 0 };
			component._ccCscSimpleState = state;

			// If previous state index is out of bounds (CMS changes), clamp it
			state.index = Math.max(0, Math.min(state.index, slides.length - 1));

			// Base hide all slides
			gsap.killTweensOf(slides);
			gsap.set(slides, { autoAlpha: 0, pointerEvents: "none" });

			// Hide per-slide bits too (prevents flash during overlap)
			slides.forEach((slide, i) => {
				const media = getSlideMedia(slide);
				const content = getSlideContentElements(slide);
				if (media) gsap.set(media, { autoAlpha: i === state.index ? 1 : 0 });
				if (content.length) gsap.set(content, { autoAlpha: i === state.index ? 1 : 0, y: 0 });
			});

			// Show active wrapper
			gsap.set(slides[state.index], { autoAlpha: 1, pointerEvents: "auto", zIndex: 1 });
			setA11y(slides, state.index);

			function flushInFlightTransition() {
				const tl = component._ccCscSimpleTl;
				if (!tl) return false;

				// Force the previous transition to its end state so `state.index`
				// stays correct even when users click rapidly.
				try {
					if (typeof tl.progress === "function") tl.progress(1);
				} catch (e) {}

				try {
					tl.kill();
				} catch (e) {}

				component._ccCscSimpleTl = null;
				return true;
			}

			function goTo(nextIndex) {
				if (!Number.isFinite(nextIndex)) return;
				flushInFlightTransition();

				const fromIndex = state.index;
				const toIndex = ((nextIndex % slides.length) + slides.length) % slides.length; // wrap

				if (toIndex === fromIndex) return;

				const fromSlide = slides[fromIndex];
				const toSlide = slides[toIndex];

				const fromMedia = getSlideMedia(fromSlide);
				const toMedia = getSlideMedia(toSlide);

				const fromContent = getSlideContentElements(fromSlide);
				const toContent = getSlideContentElements(toSlide);

				// Kill any in-flight tweens for these elements
				if (fromMedia) gsap.killTweensOf(fromMedia);
				if (toMedia) gsap.killTweensOf(toMedia);
				if (fromContent.length) gsap.killTweensOf(fromContent);
				if (toContent.length) gsap.killTweensOf(toContent);

				// Reduced motion: instant switch
				if (prefersReduced) {
					// Keep stacking order deterministic
					slides.forEach((s) => (s.style.zIndex = "0"));
					toSlide.style.zIndex = "1";

					gsap.set(fromSlide, { autoAlpha: 0, pointerEvents: "none" });
					if (fromMedia) gsap.set(fromMedia, { autoAlpha: 0 });
					if (fromContent.length) gsap.set(fromContent, { autoAlpha: 0, y: 0 });

					gsap.set(toSlide, { autoAlpha: 1, pointerEvents: "auto" });
					if (toMedia) gsap.set(toMedia, { autoAlpha: 1 });
					if (toContent.length) gsap.set(toContent, { autoAlpha: 1, y: 0 });

					state.index = toIndex;
					setA11y(slides, state.index);
					return;
				}

				// Make sure the incoming slide wrapper is visible immediately (for overlap)
				// Ensure correct layering for stacked slides.
				slides.forEach((s) => (s.style.zIndex = "0"));
				fromSlide.style.zIndex = "1";
				toSlide.style.zIndex = "2";

				gsap.set(toSlide, { autoAlpha: 1, pointerEvents: "auto" });

				// Prep incoming elements
				if (toMedia) gsap.set(toMedia, { autoAlpha: 0 });
				if (toContent.length) gsap.set(toContent, { autoAlpha: 0, y: 0 });

				const tl = gsap.timeline({
					defaults: { ease: "power2.out" },
					onComplete: () => {
						// fully hide outgoing slide wrapper at the end
						gsap.set(fromSlide, { autoAlpha: 0, pointerEvents: "none" });
						fromSlide.style.zIndex = "0";
						toSlide.style.zIndex = "1";
						state.index = toIndex;
						setA11y(slides, state.index);
					},
				});

				// --- content out  ---
				if (fromContent.length) {
					tl.to(
						fromContent,
						{
							autoAlpha: 0,
							duration: 0.22,
							stagger: 0.03,
							overwrite: "auto",
						},
						0
					);
				}

				// --- media crossfade  ---
				if (fromMedia) {
					tl.to(
						fromMedia,
						{
							autoAlpha: 0,
							duration: 0.55,
							overwrite: "auto",
						},
						0
					);
				}
				if (toMedia) {
					tl.to(
						toMedia,
						{
							autoAlpha: 1,
							duration: 0.55,
							overwrite: "auto",
						},
						0.06
					);
				}

				// --- content in  ---
				if (toContent.length) {
					tl.to(
						toContent,
						{
							autoAlpha: 1,
							duration: 0.28,
							stagger: 0.06,
							overwrite: "auto",
						},
						0.18
					);
				}

				component._ccCscSimpleTl = tl;
			}

			function prev() {
				flushInFlightTransition();
				goTo(state.index - 1);
			}
			function next() {
				flushInFlightTransition();
				goTo(state.index + 1);
			}

			if (prevBtn) {
				prevBtn.addEventListener("click", prev, { signal: abort.signal });
			}
			if (nextBtn) {
				nextBtn.addEventListener("click", next, { signal: abort.signal });
			}

			// Optional: keyboard control when focused inside component
			component.addEventListener(
				"keydown",
				(e) => {
					if (e.key === "ArrowLeft") prev();
					if (e.key === "ArrowRight") next();
				},
				{ signal: abort.signal }
			);

			log("Initialized component", idx, "slides:", slides.length, "start index:", state.index);
		});
	}

	function introStatsCarousel() {
		if (typeof EmblaCarousel === "undefined") {
			console.warn("[clearclick] EmblaCarousel not found, skipping introStatsCarousel()");
			return;
		}

		// set up embla carousel based on .intro-with-stats_stats.embla, .intro-with-stats_stats-list.embla__container, .c-stat.embla__slide. No loop, no arrows, free drag
		const components = Array.from(document.querySelectorAll(".c-intro-with-stats"));
		if (!components.length) return;

		const OPTIONS = {
			align: "start",
			loop: false,
			dragFree: true,
			containScroll: "trimSnaps",
		};

		components.forEach((component) => {
			const viewport = component.querySelector(".intro-with-stats_stats.embla");
			if (!viewport) return;

			// Safe re-init (CMS rerenders)
			if (component._ccIntroStatsEmbla) {
				try {
					component._ccIntroStatsEmbla.destroy();
				} catch (e) {}
				component._ccIntroStatsEmbla = null;
			}

			const embla = EmblaCarousel(viewport, OPTIONS);
			component._ccIntroStatsEmbla = embla;
		});
	}

	function solsCarousel() {
		if (typeof EmblaCarousel === "undefined") {
			console.warn("[clearclick] EmblaCarousel not found, skipping solsCarousel()");
			return;
		}

		const components = Array.from(document.querySelectorAll(".c-sols-carousel"));
		if (!components.length) return;

		const OPTIONS = {
			align: "start",
			loop: true,
			skipSnaps: false,
			duration: 14,
		};

		components.forEach((component) => {
			const viewport = component.querySelector(".sols-carousel_list-wrap.embla");
			if (!viewport) return;

			// Safe re-init (CMS rerenders)
			if (component._ccSolsEmbla) {
				try {
					component._ccSolsEmbla.destroy();
				} catch (e) {}
				component._ccSolsEmbla = null;
			}
			if (component._ccSolsAbort) {
				component._ccSolsAbort.abort();
				component._ccSolsAbort = null;
			}

			const prevBtn = component.querySelector(".sols-carousel_controls .controls-arrow.is-prev");
			const nextBtn = component.querySelector(".sols-carousel_controls .controls-arrow.is-next");

			const embla = EmblaCarousel(viewport, OPTIONS);
			component._ccSolsEmbla = embla;

			const abort = new AbortController();
			component._ccSolsAbort = abort;

			function setArrowsEnabled() {
				if (!embla) return;
				const canPrev = embla.canScrollPrev();
				const canNext = embla.canScrollNext();

				if (prevBtn) prevBtn.disabled = !canPrev;
				if (nextBtn) nextBtn.disabled = !canNext;

				if (prevBtn) prevBtn.classList.toggle("is-disabled", !canPrev);
				if (nextBtn) nextBtn.classList.toggle("is-disabled", !canNext);
			}

			if (prevBtn) {
				prevBtn.addEventListener(
					"click",
					() => {
						embla.scrollPrev();
					},
					{ signal: abort.signal }
				);
			}
			if (nextBtn) {
				nextBtn.addEventListener(
					"click",
					() => {
						embla.scrollNext();
					},
					{ signal: abort.signal }
				);
			}

			embla.on("init", setArrowsEnabled);
			embla.on("reInit", setArrowsEnabled);
			embla.on("select", setArrowsEnabled);
			setArrowsEnabled();

			// Service list expansion changes slide heights; refresh Embla after the expand animation.
			component.addEventListener(
				"click",
				(e) => {
					if (!e.target.closest(".sol-card_services-more")) return;
					setTimeout(() => {
						try {
							embla.reInit();
						} catch (err) {}
					}, 650);
				},
				{ signal: abort.signal }
			);
		});
	}

	function orbit() {
		const component = document.querySelector(".c-process");
		if (!component) return;

		const triggerEl = component.querySelector(".process_main");

		const orbitEl = component.querySelector(".c-orbit");

		const cards = gsap.utils.toArray(".orbit-card");
		const ring = document.querySelector(".orbit_ring-progress");
		const pulse = document.querySelector(".orbit_ring-pulse");

		const track = component.querySelector(".orbit_cards");

		// kill existing ScrollTriggers on this trigger
		ScrollTrigger.getAll().forEach((st) => {
			if (st.trigger === triggerEl) st.kill();
		});
		gsap.killTweensOf([cards, ring, pulse, track]);

		ScrollTrigger.matchMedia({
			// Only run the pinned desktop orbit when the viewport is tall enough
			"(min-width: 992px) and (min-height: 640px)": () => {
				gsap.set(cards, {
					opacity: 0,
				});

				gsap.set(ring, {
					drawSVG: "0%",
					rotate: -90,
					transformOrigin: "50% 50%",
				});
				gsap.set(pulse, {
					opacity: 0,
					transformOrigin: "50% 50%",
				});

				const tl = gsap.timeline({
					scrollTrigger: {
						trigger: triggerEl,
						start: "top top",
						end: () => `+=${cards.length * window.innerHeight * 0.5}`,
						pin: true,
						anticipatePin: 1,
						scrub: 1,
					},
				});

				cards.forEach((card, i) => {
					// Card in
					tl.to(
						card,
						{
							opacity: 1,
							duration: 1.5,
							ease: "power2.out",
						},
						">"
					);

					// Ring draw
					tl.to(
						ring,
						{
							drawSVG: `${((i + 1) / cards.length) * 100}%`,
							duration: 1.5,
							ease: "none",
						},
						"<"
					);
				});

				const tlPulse = gsap.timeline({
					// little timeline for pulse that's independent of scroll and called once when main tl completes
					paused: true,
					onComplete: () => {
						gsap.set(ring, {
							scale: 1,
							opacity: 1,
							drawSVG: "0%",
						});
					},
				});

				tlPulse.to(ring, {
					scale: 1.3,
					opacity: 0,
					duration: 0.4,
					ease: "power2.out",
				});

				tl.eventCallback("onComplete", () => {
					tlPulse.restart();
				});

				return () => {
					tl.scrollTrigger?.kill();
					tl.kill();
					tlPulse.kill();
				};
			},

			// Desktop width, but short height: avoid pin/cropping and show content normally
			"(min-width: 992px) and (max-height: 639px)": () => {
				// Ensure everything is visible and not mid-animation if the user resized into this state
				gsap.killTweensOf([cards, ring, pulse, track]);
				gsap.set(cards, { opacity: 1, clearProps: "transform" });
				gsap.set(track, { clearProps: "transform" });
				gsap.set(ring, {
					rotate: -90,
					transformOrigin: "50% 50%",
					drawSVG: "100%",
					clearProps: "scale,opacity",
				});
				gsap.set(pulse, { opacity: 0, clearProps: "transform" });

				// No ScrollTrigger/pinning in this mode
				return () => {
					// leaving this mode: let other modes fully control styles
					gsap.killTweensOf([cards, ring, pulse, track]);
				};
			},

			"(max-width: 991px)": () => {
				gsap.set(cards, {
					opacity: 1,
				});
				gsap.set(ring, {
					drawSVG: "0%",
					rotate: -90,
					transformOrigin: "50% 50%",
				});
				gsap.set(pulse, {
					opacity: 0,
					transformOrigin: "50% 50%",
				});

				const getGutter = () => {
					// Optionally set via CSS: .c-orbit { --cc-orbit-gutter: 16px; }
					const raw = getComputedStyle(orbitEl).getPropertyValue("--cc-orbit-gutter");
					const g = parseFloat(raw || "");
					return Number.isFinite(g) ? g : 16; // px fallback
				};

				const getEndX = () => {
					const containerW = orbitEl.getBoundingClientRect().width;
					const overflow = track.scrollWidth - containerW;
					const g = getGutter();

					// If no overflow, just keep a left gutter and don't move
					if (overflow <= 0) return g;

					// End with a right gutter too
					return -overflow - g;
				};

				// Start with left gutter
				gsap.set(track, { x: getGutter() });

				const tl = gsap.timeline({
					scrollTrigger: {
						trigger: triggerEl,
						start: "top top",
						end: () => `+=${cards.length * window.innerHeight * 0.5}`,
						pin: true,
						anticipatePin: 1,
						scrub: 1,
						invalidateOnRefresh: true, // ✅ recalc widths/gutter on refresh/resize
					},
				});

				tl.to(track, {
					x: () => getEndX(),
					duration: 1,
					ease: "none",
				});

				tl.to(
					ring,
					{
						drawSVG: "100%",
						duration: 1,
						ease: "none",
					},
					"0"
				);

				const tlPulse = gsap.timeline({
					// little timeline for pulse that's independent of scroll and called once when main tl completes
					paused: true,
					onComplete: () => {
						gsap.set(ring, {
							scale: 1,
							opacity: 1,
							drawSVG: "0%",
						});
					},
				});

				tlPulse.to(ring, {
					scale: 1.3,
					opacity: 0,
					duration: 0.4,
					ease: "power2.out",
				});

				tl.eventCallback("onComplete", () => {
					tlPulse.restart();
				});

				return () => {
					tl.scrollTrigger?.kill();
					tl.kill();
					tlPulse.kill();
				};
			},
		});
	}

	// --------- tiny helpers ----------
	function debounce(fn, wait = 100) {
		let t;
		return (...args) => {
			clearTimeout(t);
			t = setTimeout(() => fn(...args), wait);
		};
	}

	function getPanes(tabsEl) {
		return Array.from(tabsEl.querySelectorAll(".w-tab-pane, .tabs_tab-pane"));
	}

	// --------- your existing animation builder ----------
	function buildPaneTimeline(pane) {
		const header = pane.querySelector(".tab-pane_header");
		const subtitle = pane.querySelector(".tab-pane_subtitle");
		const body = pane.querySelector(".tab-pane_body");
		const footer = pane.querySelector(".tab-pane_footer");
		const services = pane.querySelector(".tab-pane_services");
		// if (!header || !subtitle || !body || !footer || !services) return null;

		const svg = pane.querySelector("svg.svg-rings");
		if (!svg) return null;

		const ringA = svg.querySelector(".ring-a");
		const ringB = svg.querySelector(".ring-b");
		const ringC = svg.querySelector(".ring-c");
		if (!ringA || !ringB || !ringC) return null;

		// Reset state each time so replay is consistent
		setRingsInitial(svg);
		gsap.set([header, subtitle, body, footer, services], { autoAlpha: 0, y: 20 });

		const tl = gsap.timeline(
			(onComplete = () => {
				console.log("Pane animation complete");
			})
		);
		tl.to(header, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" });
		tl.to(subtitle, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.6");
		tl.to(body, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.6");
		tl.to(footer, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.6");
		tl.to(services, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.6");

		// Consistent rings animation everywhere
		addRingsToTimeline(tl, svg, "<");

		return tl;
	}

	function playPane(pane) {
		pane._tl?.kill();
		pane._tl = buildPaneTimeline(pane);
		pane._tl?.play(0);
	}

	function getTabLinks(tabsEl) {
		return Array.from(tabsEl.querySelectorAll(".w-tab-menu .w-tab-link"));
	}

	function findPaneByTabName(tabsEl, tabName) {
		if (!tabName) return null;
		// Webflow panes carry data-w-tab too
		return tabsEl.querySelector(`.w-tab-content .w-tab-pane[data-w-tab="${CSS.escape(tabName)}"]`);
	}

	function playByLink(tabsEl, linkEl) {
		if (!linkEl) return;

		const tabName = linkEl.getAttribute("data-w-tab");
		const pane = findPaneByTabName(tabsEl, tabName);
		if (pane) playPane(pane);
	}

	function initTabsForComponent(tabsEl) {
		if (!tabsEl || tabsEl._ccTabsBound) return;
		tabsEl._ccTabsBound = true;

		// play once on init: use current tab link (reliable)
		const currentLink = tabsEl.querySelector(".w-tab-menu .w-tab-link.w--current");
		if (currentLink) playByLink(tabsEl, currentLink);

		// click-based activation: use clicked link's data-w-tab (no waiting for w--tab-active)
		tabsEl.addEventListener("click", (e) => {
			const link = e.target.closest(".w-tab-menu .w-tab-link");
			if (!link || !tabsEl.contains(link)) return;
			playByLink(tabsEl, link);
		});

		// keyboard activation (Enter/Space) on focused link
		tabsEl.addEventListener("keydown", (e) => {
			if (e.key !== "Enter" && e.key !== " ") return;
			const link = e.target.closest(".w-tab-menu .w-tab-link");
			if (!link || !tabsEl.contains(link)) return;
			playByLink(tabsEl, link);
		});
	}

	// --------- mobile accordion ----------
	const mq = window.matchMedia("(max-width: 767px)");
	let mqBound = false;

	function initAccordion(component) {
		if (!component._headerClickHandlers) component._headerClickHandlers = new Map();

		const panes = getPanes(component);
		panes.forEach((pane) => {
			const header = pane.querySelector(".tab-pane_mbl-header");
			const inner = pane.querySelector(".tab-pane_inner");
			const icon = pane.querySelector(".tab-pane_accordion-icon");
			if (!header || !inner || !icon) return;

			if (header.dataset.accordionBound === "true") return;

			// Start collapsed
			gsap.set(inner, { height: 0, overflow: "hidden" });
			gsap.set(icon, { rotation: 0 });

			const tl = gsap.timeline({ paused: true });
			tl.to(inner, { height: "auto", duration: 0.5, ease: "power2.inOut" });
			tl.to(icon, { rotation: 180, duration: 0.5, ease: "power2.inOut" }, "<");
			pane._accordionTl = tl;

			const onHeaderClick = () => {
				const isOpen = pane.classList.contains("is-open");

				// close others
				panes.forEach((other) => {
					if (other === pane) return;
					other.classList.remove("is-open");
					other._accordionTl?.reverse();
				});

				if (isOpen) {
					pane.classList.remove("is-open");
					tl.reverse();
				} else {
					pane.classList.add("is-open");
					tl.play(0);
					// ALSO trigger your pane animation on open
					playPane(pane);
				}
			};

			component._headerClickHandlers.set(header, onHeaderClick);
			header.dataset.accordionBound = "true";
			header.addEventListener("click", onHeaderClick);
		});
	}

	function destroyAccordion(component) {
		const panes = getPanes(component);

		panes.forEach((pane) => {
			const header = pane.querySelector(".tab-pane_mbl-header");
			const inner = pane.querySelector(".tab-pane_inner");
			const icon = pane.querySelector(".tab-pane_accordion-icon");

			if (header && header.dataset.accordionBound === "true") {
				const handler = component._headerClickHandlers?.get(header);
				if (handler) header.removeEventListener("click", handler);
				component._headerClickHandlers?.delete(header);
				header.removeAttribute("data-accordion-bound");
			}

			pane.classList.remove("is-open");

			if (pane._accordionTl) {
				pane._accordionTl.kill();
				delete pane._accordionTl;
			}

			if (inner) {
				gsap.killTweensOf(inner);
				gsap.set(inner, { clearProps: "height,overflow" });
			}

			if (icon) {
				gsap.killTweensOf(icon);
				gsap.set(icon, { clearProps: "transform" });
			}
		});
	}

	function applyAccordionState() {
		const components = document.querySelectorAll(".c-tabs .tabs_tabs");
		if (!components.length) return;

		if (mq.matches) {
			components.forEach(initAccordion);
		} else {
			components.forEach(destroyAccordion);
		}

		if (!mqBound) {
			mqBound = true;
			mq.addEventListener("change", applyAccordionState);
		}
	}

	// --------- master init ----------
	function initAllTabs() {
		document.querySelectorAll(".c-tabs .tabs_tabs").forEach((tabsEl) => {
			initTabsForComponent(tabsEl);
		});

		applyAccordionState();
	}

	// --------- Finsweet hook: rerun init on FS render  ----------
	function hookFinsweetRenders() {
		window.FinsweetAttributes ||= [];
		window.FinsweetAttributes.push([
			"list",
			(listInstances) => {
				listInstances.forEach((inst) => {
					if (inst.__ccTabsHooked) return;
					inst.__ccTabsHooked = true;

					// v2-style hook (commonly used by FS list solutions)
					if (typeof inst.addHook === "function") {
						inst.addHook(
							"afterRender",
							debounce(() => {
								initAllTabs();
								initScrollReveals();
								caseStudiesSimpleCarousel();
								solsCarousel();
								expandSolutionServiceTags();
							}, 0)
						);
					}

					// if the instance exposes an event emitter style API, support that too
					if (typeof inst.on === "function") {
						inst.on(
							"renderitems",
							debounce(() => {
								initAllTabs();
								initScrollReveals();
								caseStudiesSimpleCarousel();
								solsCarousel();
								expandSolutionServiceTags();
							}, 0)
						);
					}
				});

				// run once when FS list is ready
				initAllTabs();
				initScrollReveals();
				caseStudiesSimpleCarousel();
				solsCarousel();
				expandSolutionServiceTags();
			},
		]);
	}

	// Apply the buildPaneTimeline “feel” to arbitrary sections on scroll.
	// Usage:
	// <section class="cc-reveal"> ... <h2 class="cc-reveal-item">...</h2> ... </section>
	function initScrollReveals() {
		if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
			console.warn("[clearclick] GSAP/ScrollTrigger not found, skipping initScrollReveals()");
			return;
		}

		const groups = Array.from(document.querySelectorAll(".cc-reveal"));
		if (!groups.length) return;

		let madeAny = false;

		groups.forEach((group) => {
			if (group._ccRevealBound) return;

			const items = Array.from(group.querySelectorAll(".cc-reveal-item"));
			if (!items.length) return; // ✅ don't bind yet

			group._ccRevealBound = true; // ✅ only bind once items exist
			madeAny = true;

			const y =
				parseFloat(group.getAttribute("data-cc-reveal-y") || "") ||
				parseFloat(getComputedStyle(group).getPropertyValue("--cc-reveal-y") || "") ||
				20;

			const duration =
				parseFloat(group.getAttribute("data-cc-reveal-duration") || "") ||
				parseFloat(getComputedStyle(group).getPropertyValue("--cc-reveal-duration") || "") ||
				0.8;

			const staggerAmt =
				parseFloat(group.getAttribute("data-cc-reveal-stagger") || "") ||
				parseFloat(getComputedStyle(group).getPropertyValue("--cc-reveal-stagger") || "") ||
				0.12;

			const start = group.getAttribute("data-cc-reveal-start") || "top 75%";
			const once = (group.getAttribute("data-cc-reveal-once") || "true") !== "false";

			// Baseline (hidden)
			gsap.set(items, { autoAlpha: 0, y });

			const ringsRoots = Array.from(group.querySelectorAll(".cc-reveal-rings"));
			ringsRoots.forEach((ringsRoot) => setRingsInitial(ringsRoot));

			function fireEventWithRetry(eventName, detail, { maxMs = 2500, intervalMs = 120 } = {}) {
				const start = performance.now();

				const fire = () => {
					window.dispatchEvent(new CustomEvent(eventName, { detail }));
				};

				// immediate + next frame
				fire();
				requestAnimationFrame(fire);

				// keep trying for a bit (covers slow React mount)
				const timer = setInterval(() => {
					fire();
					if (performance.now() - start >= maxMs) clearInterval(timer);
				}, intervalMs);
			}

			function dispatchCountUpForItem(item, group, revealDurationSec) {
				const el = item.querySelector("[data-motion-countup-event]");
				const eventName = el?.getAttribute("data-motion-countup-event")?.trim();
				if (!eventName) return;

				// Optional override per element:
				// <div data-motion-countup-event="..." data-motion-countup-delay="0.3"></div>
				const overrideDelaySec = parseFloat(el?.getAttribute("data-motion-countup-delay") || "");
				const delaySec = Number.isFinite(overrideDelaySec)
					? overrideDelaySec
					: Math.max(0, (revealDurationSec || 0) * 0.5); // default: half the reveal duration

				// Prevent duplicate timers if something re-inits quickly
				if (item._ccCountupTimeout) clearTimeout(item._ccCountupTimeout);

				item._ccCountupTimeout = setTimeout(() => {
					fireEventWithRetry(eventName, { trigger: group, item });
					item._ccCountupTimeout = null;
				}, Math.round(delaySec * 1000));
			}
			const tl = gsap.timeline({ paused: true });

			items.forEach((item, i) => {
				const t = i * staggerAmt;

				tl.to(
					item,
					{
						autoAlpha: 1,
						y: 0,
						duration,
						ease: "power2.out",
						overwrite: "auto",
						clearProps: "y",
						onStart: () => {
							// Mark + emit a per-item reveal event so other animations (e.g. animTextFadeIn)
							// can sync to the cc-reveal timing without creating extra ScrollTriggers.
							item.dataset.ccRevealDone = "1";
							try {
								item.dispatchEvent(new CustomEvent("cc:reveal", { bubbles: true }));
							} catch (e) {}

							dispatchCountUpForItem(item, group, duration); // ✅ delayed dispatch
						},
					},
					t
				);
			});

			ringsRoots.forEach((ringsRoot) => addRingsToTimeline(tl, ringsRoot, 0));

			let revealed = false;
			const reveal = () => {
				if (revealed) return;
				revealed = true;
				group._ccRevealRevealed = true;
				tl.play(0);
			};

			const st = ScrollTrigger.create({
				trigger: group,
				start,
				once, // keep your existing once behavior
				onEnter: reveal,
				// ❌ remove onEnterBack restart; it causes the “fires as you scroll up/down” effect
				onRefresh: (self) => {
					// If we're already past the start when refreshed, reveal once.
					if (self.progress > 0) reveal();
				},
			});

			if (st.progress > 0) reveal();
		});
		// ✅ helps when content/fonts/images cause layout shifts
		if (madeAny) ScrollTrigger.refresh();
	}

	function navDropdowns() {
		if (typeof gsap === "undefined") {
			console.warn("[clearclick] GSAP not found, skipping navDropdowns()");
			return;
		}

		const dropdowns = Array.from(document.querySelectorAll(".nav_dd"));
		if (!dropdowns.length) return;

		// --- DEBUG: keep one dropdown pinned open on desktop for CSS work ---
		// Enable:
		//   localStorage.setItem("ccDebugNavDd", "1")
		//   localStorage.setItem("ccDebugNavDdIndex", "0") // optional
		// Disable:
		//   localStorage.removeItem("ccDebugNavDd")
		//   localStorage.removeItem("ccDebugNavDdIndex")
		const DEBUG_PIN =
			localStorage.getItem("ccDebugNavDd") === "1" || window.__CC_DEBUG_NAV_DD === true;
		const DEBUG_INDEX = Number(localStorage.getItem("ccDebugNavDdIndex") || "0") || 0;
		const debugDd = dropdowns[DEBUG_INDEX] || null;

		// Kill previous init if this gets called more than once (e.g. Webflow/FS rerenders)
		if (navDropdowns._mm) {
			navDropdowns._mm.kill();
			navDropdowns._mm = null;
		}

		// Convenience: close all dropdowns (optionally except one)
		function closeAll(exceptEl = null) {
			dropdowns.forEach((dd) => {
				if (exceptEl && dd === exceptEl) return;

				// Don't close the pinned dropdown (desktop debug)
				if (DEBUG_PIN && dd === debugDd) return;

				dd.classList.remove("is-open", "nav_dd--debug-open");

				const data = dd._ccNavDd;
				// ✅ prefer custom close when available; fallback to reverse
				if (typeof data?.close === "function") data.close();
				else if (data?.tl) data.tl.reverse();
			});
		}

		// Helper to remove listeners we attach
		function addListener(el, type, handler, store) {
			el.addEventListener(type, handler);
			store.push(() => el.removeEventListener(type, handler));
		}

		const mm = gsap.matchMedia();
		navDropdowns._mm = mm;

		// -------------------------
		// Desktop: hover (> 991)
		// -------------------------
		mm.add("(min-width: 992px)", () => {
			const unsubs = [];

			dropdowns.forEach((dd) => {
				const list = dd.querySelector(".nav_dd-list");
				const mmPanel = dd.querySelector(".c-mm");
				const links = Array.from(dd.querySelectorAll(".mm_link"));
				const keepOpen = DEBUG_PIN && dd === debugDd;

				if (!list || !mmPanel) return;

				// kill any prior timeline
				if (dd._ccNavDd?.tl) dd._ccNavDd.tl.kill();
				if (dd._ccNavDd?._closeTween) dd._ccNavDd._closeTween.kill();

				// Closed baseline
				gsap.set(list, { display: "none" });
				gsap.set(mmPanel, { backgroundColor: "transparent" });
				if (links.length) gsap.set(links, { autoAlpha: 0 });

				const tl = gsap.timeline({
					paused: true,
					defaults: { ease: "power1.out" },
				});

				// Open: ensure list is visible, then animate bg + links
				tl.set(list, { display: "block" }, 0);
				tl.to(
					mmPanel,
					{
						backgroundColor: "#ffffff",
						duration: 0.29,
					},
					0.01
				);
				if (links.length) {
					tl.to(
						links,
						{
							autoAlpha: 1,
							duration: 0.2,
							stagger: 0.05,
						},
						0.05
					);
				}

				dd._ccNavDd = {
					tl,
					mode: "desktop",
					_closeTween: null,
					// ✅ close in a fixed duration (ignores long stagger reverse)
					close: () => {
						const data = dd._ccNavDd;
						if (!data?.tl) return;

						// Kill any in-flight close tween
						if (data._closeTween) {
							data._closeTween.kill();
							data._closeTween = null;
						}

						// If already closed, ensure display none and bail
						if (data.tl.time() === 0) {
							gsap.set(list, { display: "none" });
							data.tl.pause(0);
							return;
						}

						data._closeTween = data.tl.tweenTo(0, {
							duration: 0.18, // tweak close speed here
							ease: "power1.out",
							overwrite: "auto",
							onComplete: () => {
								gsap.set(list, { display: "none" });
								data.tl.pause(0); // ✅ ensure next hover can restart cleanly
								if (dd._ccNavDd) dd._ccNavDd._closeTween = null;
							},
						});
					},
				};

				const onEnter = () => {
					closeAll(dd);

					dd.classList.add("is-open");

					// If a fast-close tween is running, cancel it so open feels immediate
					if (dd._ccNavDd?._closeTween) {
						dd._ccNavDd._closeTween.kill();
						dd._ccNavDd._closeTween = null;
					}

					gsap.set(list, { display: "block" }); // ✅ ensure visible even if last close forced display:none
					tl.play(0); // ✅ always render from 0 (fires the 0-time set reliably)
				};

				const onLeave = () => {
					// Keep pinned dropdown open while you debug
					if (keepOpen) return;

					dd.classList.remove("is-open", "nav_dd--debug-open");
					dd._ccNavDd?.close?.();
				};

				addListener(dd, "pointerenter", onEnter, unsubs);
				addListener(dd, "pointerleave", onLeave, unsubs);

				// If debug pinned, open immediately and mark it
				if (keepOpen) {
					dd.classList.add("is-open", "nav_dd--debug-open");
					gsap.set(list, { display: "block" });
					tl.play(0);
				}
			});

			return () => {
				unsubs.forEach((fn) => fn());
				dropdowns.forEach((dd) => {
					dd.classList.remove("is-open", "nav_dd--debug-open");
					if (dd._ccNavDd?.mode === "desktop") {
						dd._ccNavDd._closeTween?.kill();
						dd._ccNavDd.tl?.kill();
						delete dd._ccNavDd;
					}
				});
			};
		});

		// -------------------------
		// Mobile: click (<= 991)
		// -------------------------
		mm.add("(max-width: 991px)", () => {
			const unsubs = [];

			dropdowns.forEach((dd) => {
				const toggle = dd.querySelector(".nav_dd-toggle") || dd;
				const list = dd.querySelector(".nav_dd-list");
				const links = Array.from(dd.querySelectorAll(".mm_link"));
				const svg = dd.querySelector(".nav_dd-toggle svg");

				if (!list) return;

				if (dd._ccNavDd?.tl) dd._ccNavDd.tl.kill();

				gsap.set(list, { height: 0, overflow: "hidden" });
				gsap.set(dd, { backgroundColor: "transparent" });
				if (svg) gsap.set(svg, { rotation: 90, transformOrigin: "50% 50%" });
				if (links.length) gsap.set(links, { autoAlpha: 0 });

				const tl = gsap.timeline({
					paused: true,
					defaults: { ease: "power2.inOut" },
				});

				tl.to(list, { height: "auto", duration: 0.5 }, 0);
				tl.to(dd, { backgroundColor: "#dadff6", duration: 0.29, ease: "power1.out" }, 0);
				if (svg) tl.to(svg, { rotation: 270, duration: 0.29, ease: "power1.out" }, 0);
				if (links.length) {
					tl.to(links, { autoAlpha: 1, duration: 0.2, stagger: 0.05, ease: "power1.out" }, 0.05);
				}

				dd._ccNavDd = {
					tl,
					mode: "mobile",
					// Mobile should behave like an accordion: reverse the timeline normally.
					close: () => {
						const data = dd._ccNavDd;
						if (!data?.tl) return;
						data.tl.timeScale(1);
						data.tl.reverse();
					},
				};

				const onClick = (e) => {
					if (toggle.tagName === "A") e.preventDefault();

					const isOpen = dd.classList.contains("is-open");

					if (isOpen) {
						dd.classList.remove("is-open");
						dd._ccNavDd?.close?.();
					} else {
						// close others
						dropdowns.forEach((other) => {
							if (other === dd) return;
							other.classList.remove("is-open");
							other._ccNavDd?.close?.();
						});

						dd.classList.add("is-open");

						tl.play(0); // ✅ deterministic open (esp. after fast close)
					}
				};

				addListener(toggle, "click", onClick, unsubs);
			});

			document.querySelectorAll(".nav_mobile-btn").forEach((btn) => {
				const onBtn = () => closeAll(); // debug pin affects desktop only, so mobile closes all
				addListener(btn, "click", onBtn, unsubs);
			});

			return () => {
				unsubs.forEach((fn) => fn());
				dropdowns.forEach((dd) => {
					dd.classList.remove("is-open");
					if (dd._ccNavDd?.mode === "mobile") {
						dd._ccNavDd.tl?.kill();
						delete dd._ccNavDd;
					}
					gsap.set(dd, { clearProps: "backgroundColor" });
					const list = dd.querySelector(".nav_dd-list");
					if (list) gsap.set(list, { clearProps: "height,overflow,display" });
					const svg = dd.querySelector(".nav_dd-toggle svg");
					if (svg) gsap.set(svg, { clearProps: "transform" });
					const links = dd.querySelectorAll(".mm_link");
					if (links.length) gsap.set(links, { clearProps: "opacity,visibility" });
					const mmPanel = dd.querySelector(".c-mm");
					if (mmPanel) gsap.set(mmPanel, { clearProps: "backgroundColor" });
				});
			};
		});
	}

	function openNav() {
		if (typeof gsap === "undefined") {
			console.warn("[clearclick] GSAP not found, skipping openNav()");
			return;
		}

		const menuWrap = document.querySelector(".nav_menu-wrap");
		const menu = document.querySelector(".nav_menu");
		const bg = document.querySelector(".nav_menu-bg");
		const list = document.querySelector(".nav_menu-list");
		const ctaWrap = document.querySelector(".nav_menu-btn-wrap");
		const buttons = Array.from(document.querySelectorAll(".nav_mobile-btn"));
		const logo = document.querySelector(".nav .logo");
		const listMask = document.querySelector(".nav_menu-list-mask");

		if (!menu || !bg || !list || !buttons.length) return;

		// Kill previous init if this gets called more than once
		if (openNav._mm) {
			openNav._mm.kill();
			openNav._mm = null;
		}

		function addListener(el, type, handler, store) {
			el.addEventListener(type, handler);
			store.push(() => el.removeEventListener(type, handler));
		}

		function setButtonIcon(btn, isOpen) {
			const svg_open = btn.querySelector(".nav_mobile-btn-svg.is-cross"); // svg when nav is open
			const svg_closed = btn.querySelector(".nav_mobile-btn-svg.is-hamburger"); // svg when nav is closed

			if (!svg_open || !svg_closed) return;

			gsap.to(svg_open, { duration: 0.2, autoAlpha: isOpen ? 1 : 0 });
			gsap.to(svg_closed, { duration: 0.2, autoAlpha: isOpen ? 0 : 1 });
		}

		const items = [
			...Array.from(list.children).filter(
				(el) => el && (el.tagName === "A" || el.tagName === "DIV")
			),
			...(ctaWrap ? [ctaWrap] : []),
		];

		let lockedScrollY = 0;

		function setOpenState(isOpen) {
			menu.classList.toggle("is-open", isOpen);
			document.documentElement.classList.toggle("nav-open", isOpen);
			document.body.classList.toggle("nav-open", isOpen);
			buttons.forEach((b) => setButtonIcon(b, isOpen));

			if (isOpen) {
				lockedScrollY = window.scrollY;
				document.body.style.position = "fixed";
				document.body.style.top = `-${lockedScrollY}px`;
				document.body.style.left = "0";
				document.body.style.right = "0";
			} else {
				document.body.style.position = "";
				document.body.style.top = "";
				document.body.style.left = "";
				document.body.style.right = "";
				window.scrollTo(0, lockedScrollY);
			}
		}

		const mm = gsap.matchMedia();
		openNav._mm = mm;

		// Mobile only
		mm.add("(max-width: 991px)", () => {
			const unsubs = [];

			// baseline (closed)
			gsap.set(menuWrap, { display: "none" });
			gsap.set(bg, { autoAlpha: 0, scaleY: 0.5, transformOrigin: "50% 0%" });
			if (items.length) gsap.set(items, { autoAlpha: 0 });
			gsap.set(listMask, { autoAlpha: 0 });

			const tl = gsap.timeline({
				paused: true,
				defaults: { ease: "power2.out" },
				onReverseComplete: () => {
					gsap.set(menuWrap, { display: "none" });
					setOpenState(false);
				},
			});

			// OPEN:
			// - menu display flex
			// - bg opacity 0 -> 1 and scaleY 0.5 -> 1
			// - stagger in immediate <a>/<div> children of .nav_menu-list + .nav_menu-btn-wrap
			tl.set(menuWrap, { display: "flex" }, 0);
			tl.to(
				bg,
				{
					autoAlpha: 1,
					scaleY: 1,
					duration: 0.35, // tweakable
					ease: "power2.out",
				},
				0
			);

			tl.to(
				logo,
				{
					color: "var(--_color---blue--dark)",
					duration: 0.2,
					ease: "power1.out",
				},
				0
			);

			if (items.length) {
				tl.to(
					items,
					{
						autoAlpha: 1,
						duration: 0.2,
						stagger: 0.05,
						ease: "power1.out",
					},
					0.05
				);
			}

			//set list mask to visible at end of animation
			tl.set(listMask, { autoAlpha: 1 }, ">");

			function open() {
				setOpenState(true);
				tl.play(0);
			}

			function close() {
				tl.reverse();
			}

			function toggle() {
				const isOpen = menu.classList.contains("is-open");
				if (isOpen) close();
				else open();
			}

			buttons.forEach((btn) => {
				const onBtnClick = (e) => {
					// if it's an <a> styled as button
					if (btn.tagName === "A") e.preventDefault();
					toggle();
				};
				addListener(btn, "click", onBtnClick, unsubs);
			});

			// Cleanup leaving mobile
			return () => {
				unsubs.forEach((fn) => fn());
				tl.kill();

				setOpenState(false);
				gsap.set(menuWrap, { clearProps: "display" });
				gsap.set(bg, { clearProps: "opacity,visibility,transform" });
				if (items.length) gsap.set(items, { clearProps: "opacity,visibility" });
				gsap.set(listMask, { clearProps: "opacity,visibility" });
				gsap.set(logo, { clearProps: "color" });
			};
		});
	}

	// --------- shared ring animation (used across site) ----------
	function getRingsFromSvg(svg) {
		if (!svg) return null;
		const ringA = svg.querySelector(".ring-a");
		const ringB = svg.querySelector(".ring-b");
		const ringC = svg.querySelector(".ring-c");
		if (!ringA || !ringB || !ringC) return null;
		return { ringA, ringB, ringC };
	}

	function setRingsInitial(svgOrRootEl) {
		const svg =
			svgOrRootEl?.tagName?.toLowerCase() === "svg"
				? svgOrRootEl
				: svgOrRootEl?.querySelector?.("svg");
		const rings = getRingsFromSvg(svg);
		if (!rings) return;

		gsap.set([rings.ringA, rings.ringB, rings.ringC], {
			opacity: 0,
			scale: 0.85,
			transformOrigin: "50% 50%",
		});
	}

	function addRingsToTimeline(tl, svgOrRootEl, position = "<") {
		const svg =
			svgOrRootEl?.tagName?.toLowerCase() === "svg"
				? svgOrRootEl
				: svgOrRootEl?.querySelector?.("svg");
		const rings = getRingsFromSvg(svg);
		if (!rings) return;

		// Match buildPaneTimeline ring feel
		tl.to(
			[rings.ringC, rings.ringB, rings.ringA],
			{
				opacity: 1,
				scale: 1,
				duration: 1,
				ease: "power2.out",
				stagger: 0.5,
				overwrite: "auto",
			},
			position
		);
	}

	// function expandSolutionServiceTags_v1() {
	// 	const tagDefaultCount = 3;

	// 	const solCards = Array.from(document.querySelectorAll(".sol-card"));
	// 	if (!solCards.length) return;

	// 	solCards.forEach((card) => {
	// 		// get tags container .sol-card_services-list
	// 		const tagsList = card.querySelector(".sol-card_services-list");
	// 		if (!tagsList) return;
	// 		// get more button in list
	// 		const moreBtn = tagsList.querySelector(".sol-card_services-more");
	// 		if (!moreBtn) return;
	// 		//get all tags in list .c-service
	// 		const tags = tagsList.querySelectorAll(".c-service");
	// 		if (tags.length <= tagDefaultCount) {
	// 			// no need to expand
	// 			moreBtn.style.display = "none";
	// 			card._tagsExpanded = true;
	// 			return;
	// 		}

	// 		//set text of button to "+X more"
	// 		const extraCount = tags.length - tagDefaultCount;
	// 		moreBtn.textContent = `+ ${extraCount} more`;

	// 		card._tagsExpanded = false;

	// 		// hide tags beyond default count
	// 		tags.forEach((tag, index) => {
	// 			if (index >= tagDefaultCount) {
	// 				gsap.set(tag, { display: "none" });
	// 			}
	// 		});

	// 		// add click listener to more button
	// 		moreBtn.addEventListener("click", onMoreClick);

	// 		function onMoreClick(e) {
	// 			e.preventDefault();

	// 			if (card._tagsExpanded) return;

	// 			const tagsList = card.querySelector(".sol-card_services-list");
	// 			if (!tagsList) return;
	// 			const moreBtn = tagsList.querySelector(".sol-card_services-more");
	// 			if (!moreBtn) return;
	// 			const tags = Array.from(tagsList.querySelectorAll(".c-service"));
	// 			const hiddenTags = tags.slice(tagDefaultCount);

	// 			// get current state of card
	// 			const collapsedState = Flip.getState([card, tagsList], {
	// 				props: "width,height",
	// 			});

	// 			gsap.set(tags, { display: "block" });
	// 			gsap.set(moreBtn, { display: "none" });
	// 			gsap.set(hiddenTags, { autoAlpha: 0 });

	// 			const tl = gsap.timeline({ defaults: { overwrite: "auto" } });

	// 			tl.add(
	// 				Flip.from(collapsedState, {
	// 					duration: 0.5,
	// 					ease: "power1.inOut",
	// 					// nested: true,
	// 				}),
	// 				0
	// 			);

	// 			tl.to(
	// 				hiddenTags,
	// 				{
	// 					autoAlpha: 1,
	// 					duration: 0.25,
	// 					ease: "power2.out",
	// 					stagger: 0.06,
	// 					clearProps: "transform", // don't clear opacity/visibility (prevents snapping back)
	// 				},
	// 				0.12
	// 			);

	// 			card._tagsExpanded = true;
	// 		}
	// 	});
	// }

	function expandSolutionServiceTags() {
		const tagDefaultCount = 3;

		if (typeof gsap === "undefined") {
			console.warn("[clearclick] GSAP not found, skipping expandSolutionServiceTags()");
			return;
		}

		const hasFlip = typeof Flip !== "undefined" && typeof Flip.getState === "function";
		const solCards = Array.from(document.querySelectorAll(".sol-card, .sols-carousel-slide"));
		if (!solCards.length) return;

		function getTagsList(card) {
			return (
				card.querySelector(".sol-card_services-list") ||
				card.querySelector(".sols-carousel-slide_services-list")
			);
		}

		function getMoreBtn(tagsList) {
			// Prefer immediate child button (per your spec), fallback to any descendant
			return (
				tagsList.querySelector(":scope > button.sol-card_services-more") ||
				tagsList.querySelector("button.sol-card_services-more, .sol-card_services-more")
			);
		}

		function getTags(tagsList) {
			return Array.from(tagsList.querySelectorAll(".c-service"));
		}

		function storeDisplay(el, fallback = "inline-flex") {
			if (!el || el.dataset.ccDisplay) return;
			const d = getComputedStyle(el).display;
			el.dataset.ccDisplay = d && d !== "none" ? d : fallback;
		}

		function showEl(el) {
			if (!el) return;
			const d = el.dataset.ccDisplay || "inline-flex";
			gsap.set(el, { display: d });
		}

		function hideEl(el) {
			if (!el) return;
			gsap.set(el, { display: "none" });
		}

		function setMoreLabel(moreBtn, tagsCount) {
			if (!moreBtn) return;
			const extraCount = Math.max(0, tagsCount - tagDefaultCount);
			moreBtn.textContent = `+ ${extraCount} more`;
		}

		function collapseCard(card) {
			const tagsList = getTagsList(card);
			if (!tagsList) return;

			const moreBtn = getMoreBtn(tagsList);
			const tags = getTags(tagsList);

			// Store displays so we can restore properly later
			tags.forEach((t) => storeDisplay(t, "inline-flex"));
			storeDisplay(moreBtn, "inline-flex");

			// Kill any in-progress animation that could fight resize sync
			gsap.killTweensOf(card);
			gsap.killTweensOf(tags);

			// If there are <= 3 tags, no expansion is needed
			if (tags.length <= tagDefaultCount) {
				tags.forEach(showEl);
				hideEl(moreBtn);
				card._tagsExpanded = true; // effectively "done"
				return;
			}

			setMoreLabel(moreBtn, tags.length);

			tags.forEach((tag, idx) => {
				if (idx < tagDefaultCount) showEl(tag);
				else hideEl(tag);
				gsap.set(tag, { clearProps: "opacity,visibility,transform" });
			});

			showEl(moreBtn);
			card._tagsExpanded = false;

			// Clear any forced height/overflow from prior FLIP/height tweens
			gsap.set(card, { clearProps: "height,overflow" });
		}

		function expandCard(card, { animate = true } = {}) {
			const tagsList = getTagsList(card);
			if (!tagsList) return;

			const moreBtn = getMoreBtn(tagsList);
			const tags = getTags(tagsList);
			if (!tags.length) return;

			// Nothing to expand
			if (tags.length <= tagDefaultCount) {
				tags.forEach(showEl);
				hideEl(moreBtn);
				card._tagsExpanded = true;
				return;
			}

			if (card._tagsExpanded) {
				// Ensure the "expanded" end-state is correct (useful after resize/re-init)
				tags.forEach((t) => {
					showEl(t);
					gsap.set(t, { clearProps: "opacity,visibility,transform" });
				});
				hideEl(moreBtn);
				gsap.set(card, { clearProps: "height,overflow" });
				return;
			}

			const hiddenTags = tags.slice(tagDefaultCount);

			// Store displays so we can restore properly later
			tags.forEach((t) => storeDisplay(t, "inline-flex"));
			storeDisplay(moreBtn, "inline-flex");

			// Capture layout state before we change display values
			let collapsedState = null;
			if (animate && hasFlip) {
				collapsedState = Flip.getState([card, tagsList, moreBtn], {
					props: "width,height,opacity,transform",
				});
			}

			// Apply final layout: show all tags, hide the more button
			tags.forEach(showEl);
			hideEl(moreBtn);

			// Prep reveal animation for the tags that were hidden
			if (hiddenTags.length) {
				gsap.set(hiddenTags, { autoAlpha: animate ? 0 : 1 });
			}

			if (!animate) {
				if (hiddenTags.length) gsap.set(hiddenTags, { clearProps: "opacity,visibility,transform" });
				card._tagsExpanded = true;
				return;
			}

			const tl = gsap.timeline({ defaults: { overwrite: "auto" } });

			if (hasFlip && collapsedState) {
				tl.add(
					Flip.from(collapsedState, {
						duration: 0.5,
						ease: "power1.inOut",
					}),
					0
				);
			} else {
				// Fallback: animate card height if Flip isn't available
				const startH = card.offsetHeight;
				gsap.set(card, { height: startH, overflow: "hidden" });

				// Force a reflow after DOM changes
				const endH = card.offsetHeight;

				tl.to(card, {
					height: endH,
					duration: 0.45,
					ease: "power1.inOut",
					onComplete: () => gsap.set(card, { clearProps: "height,overflow" }),
				});
			}

			if (hiddenTags.length) {
				tl.to(
					hiddenTags,
					{
						autoAlpha: 1,
						y: 0,
						duration: 0.25,
						ease: "power2.out",
						stagger: 0.06,
						onComplete: () => gsap.set(hiddenTags, { clearProps: "opacity,visibility,transform" }),
					},
					0.12
				);
			}

			card._tagsExpanded = true;
		}

		// Bind + initial sync
		solCards.forEach((card) => {
			const tagsList = getTagsList(card);
			if (!tagsList) return;

			const moreBtn = getMoreBtn(tagsList);
			const tags = getTags(tagsList);

			// If there isn't a more button, we can still collapse (hide >3) if desired,
			// but your requirement assumes the button exists; so just exit.
			if (!moreBtn) return;

			// Store original displays up-front
			tags.forEach((t) => storeDisplay(t, "inline-flex"));
			storeDisplay(moreBtn, "inline-flex");

			// Bind once
			if (!card._ccServicesBound) {
				card._ccServicesBound = true;

				card._ccServicesMoreClick = (e) => {
					e.preventDefault();
					expandCard(card, { animate: true });
				};

				moreBtn.addEventListener("click", card._ccServicesMoreClick);
			}

			// Initial state: collapse unless already expanded
			if (card._tagsExpanded) expandCard(card, { animate: false });
			else collapseCard(card);
		});

		// --- Resize handling (debounced) ---
		if (expandSolutionServiceTags._onResize) {
			window.removeEventListener("resize", expandSolutionServiceTags._onResize);
		}

		expandSolutionServiceTags._onResize = debounce(() => {
			solCards.forEach((card) => {
				const tagsList = getTagsList(card);
				if (!tagsList) return;

				// On resize, don't animate; just ensure correct layout for current state
				if (card._tagsExpanded) expandCard(card, { animate: false });
				else collapseCard(card);
			});
		}, 150);

		window.addEventListener("resize", expandSolutionServiceTags._onResize);
	}

	function pinSolutionCardsMobile() {
		if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
			console.warn("[clearclick] GSAP/ScrollTrigger not found, skipping pinSolutionCardsMobile()");
			return;
		}

		const wrapper =
			document.querySelector(".sol-listing_pin") || document.querySelector(".sol-listing_main");
		if (!wrapper) return;

		// Kill previous init if this gets called more than once
		if (pinSolutionCardsMobile._mm) {
			pinSolutionCardsMobile._mm.kill();
			pinSolutionCardsMobile._mm = null;
		}

		const mm = gsap.matchMedia();
		pinSolutionCardsMobile._mm = mm;

		mm.add("(max-width: 767px)", () => {
			const cards = Array.from(wrapper.querySelectorAll(".sol-card"));
			if (cards.length < 2) return;

			const triggers = [];
			const tweens = [];

			const lastCard = cards[cards.length - 1];

			// nav height + 2rem
			const getPinOffset = () => {
				const nav = document.querySelector(".nav");
				const navH = nav ? nav.getBoundingClientRect().height : 0;
				const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize || "16") || 16;
				return Math.round(navH + 2 * remPx);
			};

			const pinStart = () => `top top+=${getPinOffset()}`;

			// Layering
			cards.forEach((card, i) => {
				gsap.set(card, { zIndex: i + 1, transformOrigin: "50% 0%" });
			});

			const refresh = debounce(() => ScrollTrigger.refresh(), 120);

			// Pin all but the last card
			cards.slice(0, -1).forEach((card, i) => {
				const st = ScrollTrigger.create({
					id: `ccSolStackPin_${i}`,
					trigger: card,
					start: pinStart,
					endTrigger: lastCard,
					// release when the LAST card reaches the same offset line
					end: () => `top top+=${getPinOffset()}`,
					pin: true,
					pinSpacing: false,
					anticipatePin: 1,
					invalidateOnRefresh: true,
				});
				triggers.push(st);
			});

			// “Behind” card effect: when a new card approaches, scale + tint the previous pinned card
			cards.forEach((incoming, i) => {
				if (i === 0) return;

				const prevCard = cards[i - 1];
				const prevBg = prevCard.querySelector(".sol-card_bg");

				const tl = gsap.timeline({
					scrollTrigger: {
						trigger: incoming,
						start: "top 25%",
						toggleActions: "play none none reverse",
						invalidateOnRefresh: true,
					},
				});

				tl.to(
					prevCard,
					{
						scale: 0.85,
						duration: 0.4,
						ease: "power1.out",
						overwrite: "auto",
					},
					0
				);

				// if (prevBg) {
				// 	tl.to(
				// 		prevBg,
				// 		{
				// 			backgroundColor: "var(--_color---blue--pale)",
				// 			duration: 0.2,
				// 			ease: "linear",
				// 			overwrite: "auto",
				// 		},
				// 		0
				// 	);
				// }

				tweens.push(tl);
				triggers.push(tl.scrollTrigger);
			});

			// Service-tag expansion affects heights → refresh after the expand animation
			const onClick = (e) => {
				if (!e.target.closest(".sol-card_services-more")) return;
				setTimeout(refresh, 600);
			};
			wrapper.addEventListener("click", onClick);

			// Any height change (wrap/expand/fonts) → refresh
			let ro = null;
			if (typeof ResizeObserver !== "undefined") {
				ro = new ResizeObserver(() => refresh());
				cards.forEach((c) => ro.observe(c));
			}

			requestAnimationFrame(() => ScrollTrigger.refresh());

			return () => {
				wrapper.removeEventListener("click", onClick);
				if (ro) ro.disconnect();

				triggers.forEach((st) => st?.kill?.());
				tweens.forEach((t) => t?.kill?.());

				cards.forEach((card) => gsap.set(card, { clearProps: "zIndex,transform" }));
			};
		});
	}

	homeHeroCorners();
	hideShowNav();
	openNav();
	navDropdowns();
	logoStaggers();
	latestCarousel();
	introStatsCarousel();
	approachSliderCarousel();
	caseStudiesCarousel();
	caseStudiesSimpleCarousel();
	solsCarousel();
	orbit();
	initScrollReveals();
	expandSolutionServiceTags();
	pinSolutionCardsMobile();

	// wait for fonts to load before animating text
	document.fonts.ready.then(() => {
		document.body.classList.add("fonts-loaded");
		animTextFadeIn();
		initMotionCounters();
	});

	hookFinsweetRenders();
	initAllTabs();
}

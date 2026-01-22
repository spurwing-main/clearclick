function main() {
	function emblaCanScroll(api, direction) {
		if (!api) return false;
		const dir = direction === "prev" ? "prev" : "next";
		const key = dir === "prev" ? "canScrollPrev" : "canScrollNext";

		const maybe = api[key];
		if (typeof maybe === "function") {
			try {
				return !!maybe.call(api);
			} catch (e) {}
		} else if (typeof maybe === "boolean") {
			return maybe;
		}

		// Fallback for older/newer Embla builds: infer from selected snap + loop option.
		let count = 0;
		try {
			if (typeof api.scrollSnapList === "function") count = api.scrollSnapList().length;
		} catch (e) {}
		if (!count) {
			try {
				if (typeof api.slideNodes === "function") count = api.slideNodes().length;
			} catch (e) {}
		}
		if (count <= 1) return false;

		let loop = null;
		try {
			loop = !!api.internalEngine?.().options?.loop;
		} catch (e) {
			loop = null;
		}
		if (loop === true) return true;

		let selected = 0;
		try {
			if (typeof api.selectedScrollSnap === "function") selected = api.selectedScrollSnap();
		} catch (e) {}

		return dir === "prev" ? selected > 0 : selected < count - 1;
	}

	function anim_homeHeroCorners() {
		const hero = document.querySelector(".c-home-hero");
		if (!hero) return;
		gsap.to(
			hero,

			{
				borderBottomLeftRadius: "3rem",
				borderBottomRightRadius: "3rem",
				scrollTrigger: {
					trigger: hero,
					start: "top top",
					end: () => `+=${window.innerHeight * 0.25}`,
					scrub: 1,

					ease: "power1.out",
				},
			},
		);
	}

	function nav_hideShow() {
		const nav = document.querySelector(".nav");
		if (!nav) return;

		const debugLog = createDebugLog("nav_hideShow");

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
		const oldTrigger = ScrollTrigger.getById("nav_hideShow");
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
			id: "nav_hideShow",
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

	function anim_logoStaggers() {
		var delay = 400; // adjust as needed for a faster or slower stagger
		$(".logo-cycle_track").each(function (index) {
			const card = $(this);
			setTimeout(function () {
				card.addClass("is-anim");
			}, index * delay);
		});
	}

	function anim_textFadeIn() {
		const startOpacity = 0.3;
		const els = gsap.utils.toArray(".anim-text-fade");
		let madeAnyScrollTriggers = false;

		if (!els.length) return;

		const log = createDebugLog("anim_textFadeIn");

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

	function c_latestCarousel() {
		const mq = window.matchMedia("(max-width: 991px)");

		const OPTIONS = {
			align: "start",
			containScroll: "trimSnaps",
			loop: false,
		};

		const components = document.querySelectorAll(".c-latest");
		if (!components.length) return;

		const log = createDebugLog("c_latestCarousel");

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
						(_, index) =>
							`<button class="latest_dot" type="button" data-index="${index}"></button>`,
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

	function c_approachCarousel() {
		const log = createDebugLog("c_approachCarousel");

		// DrawSVG support (optional but requested)
		const hasDrawSVG =
			(typeof gsap !== "undefined" && gsap.plugins && gsap.plugins.DrawSVGPlugin) ||
			typeof DrawSVGPlugin !== "undefined";

		if (typeof DrawSVGPlugin !== "undefined" && (!gsap.plugins || !gsap.plugins.DrawSVGPlugin)) {
			// Safe to call even if already registered
			gsap.registerPlugin(DrawSVGPlugin);
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

				const canPrev = emblaCanScroll(embla, "prev");
				const canNext = emblaCanScroll(embla, "next");

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
						},
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

	function c_caseStudiesCarousel() {
		function debounce(fn, wait = 120) {
			let t;
			return (...args) => {
				clearTimeout(t);
				t = setTimeout(() => fn(...args), wait);
			};
		}
		const mainRoot = document.querySelector(".csc_list-wrapper.embla");
		const thumbRoot = document.querySelector(".csc_logo-slider.embla");

		if (!mainRoot || !thumbRoot) return;

		const log = createDebugLog("c_caseStudiesCarousel");

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
			// containScroll: "trimSnaps",
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
				"[clearclick] Embla class-names plugin not found for c_caseStudiesCarousel(). Check window.EmblaCarouselClassNames",
			);
		}

		// --- Init main Embla ---
		const emblaMain = EmblaCarousel(
			mainViewport,
			MAIN_OPTIONS,
			ClassNamesPlugin ? [ClassNamesPlugin()] : [],
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
				thumbSlide.className = "csc_logo-slide embla__slide u-no-select";
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

		// Optional: treat the viewport as narrower when determining overflow.
		// This lets you add “effective padding” so the strip switches to Embla
		// a bit earlier (even if it only barely fits).
		// Usage: add `data-cc-overflow-pad="24"` (pixels) on `.csc_logo-slider`.
		const overflowPadPx = (() => {
			const raw = thumbRoot.getAttribute("data-cc-overflow-pad");
			const n = raw == null ? 0 : parseFloat(raw);
			return Number.isFinite(n) ? Math.max(0, n) : 0;
		})();

		function getThumbSlides() {
			return emblaThumb ? emblaThumb.slideNodes() : Array.from(thumbContainer.children);
		}

		const HYST_PX = 8; // deadband to prevent flip-flop near threshold

		function measureThumbOverflowStable() {
			const viewportWidth = thumbViewport.getBoundingClientRect().width;

			// If hidden / not laid out yet, don't change modes based on junk numbers.
			if (viewportWidth < 2) return null;

			const effectiveViewport = Math.max(0, viewportWidth - overflowPadPx * 2);

			// Layout width of all slides (includes gaps). Not affected by transforms.
			const contentWidth = Math.ceil(thumbContainer.scrollWidth);

			// If still not measurable (can happen mid-build), bail.
			if (contentWidth < 2) return null;

			const delta = contentWidth - effectiveViewport;

			// First run: normal threshold
			if (thumbHasOverflow == null) return delta > 2;

			// Hysteresis:
			// - if currently overflow, only switch OFF once we are comfortably under
			// - if currently not overflow, only switch ON once we are comfortably over
			if (thumbHasOverflow) return delta > -HYST_PX;
			return delta > HYST_PX;
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
				desiredLoop ? THUMB_OPTIONS_OVERFLOW : THUMB_OPTIONS_NO_OVERFLOW,
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
			const hasOverflow = measureThumbOverflowStable();
			if (hasOverflow == null) return; // try again later

			// If mode didn't change, do nothing (prevents unnecessary churn)
			if (thumbHasOverflow === hasOverflow) return;

			thumbHasOverflow = hasOverflow;

			thumbRoot.classList.toggle("has-overflow", hasOverflow);
			thumbRoot.classList.toggle("is-centered", !hasOverflow);

			if (hasOverflow) {
				initThumbEmblaIfNeeded({ loop: true });
			} else {
				destroyThumbEmblaIfNeeded();
			}
		}

		const applyThumbModeDebounced = debounce(() => {
			applyThumbMode();
			syncThumbs();
		}, 120);

		function scheduleThumbLayout() {
			if (layoutRaf) cancelAnimationFrame(layoutRaf);
			layoutRaf = requestAnimationFrame(() => {
				layoutRaf = 0;

				// Cheap update every frame (classes)
				syncThumbs();

				// Expensive init/destroy only after resizing settles
				applyThumbModeDebounced();
			});
		}

		function watchThumbAssetsForLayout() {
			// `scrollWidth` can change when images/fonts finish loading without any resize.
			// ResizeObserver doesn't reliably fire for scrollWidth changes, so we also
			// listen to asset load events.
			try {
				const imgs = Array.from(thumbContainer.querySelectorAll("img"));
				imgs.forEach((img) => {
					if (img.complete) return;
					img.addEventListener("load", scheduleThumbLayout, { once: true });
					img.addEventListener("error", scheduleThumbLayout, { once: true });
				});
			} catch (e) {}

			// Fonts can also affect the strip width.
			if (document.fonts && typeof document.fonts.ready?.then === "function") {
				document.fonts.ready.then(scheduleThumbLayout).catch(() => {});
			}

			// Final catch-all once the page is fully loaded.
			window.addEventListener("load", scheduleThumbLayout, { once: true });
		}

		buildThumbs();
		watchThumbAssetsForLayout();

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
		setTimeout(scheduleThumbLayout, 2000);

		emblaMain.on("init", updateMainSlideStates);
		emblaMain.on("select", updateMainSlideStates);
		emblaMain.on("reInit", updateMainSlideStates);

		// Initial run
		updateMainSlideStates();
	}

	function c_caseStudiesSimpleCarousel() {
		const log = createDebugLog("c_caseStudiesSimpleCarousel");

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
						0,
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
						0,
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
						0.06,
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
						0.18,
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
				{ signal: abort.signal },
			);

			log("Initialized component", idx, "slides:", slides.length, "start index:", state.index);
		});
	}

	function c_introStats() {
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

	function c_solsCarousel() {
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
				const canPrev = emblaCanScroll(embla, "prev");
				const canNext = emblaCanScroll(embla, "next");

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
					{ signal: abort.signal },
				);
			}
			if (nextBtn) {
				nextBtn.addEventListener(
					"click",
					() => {
						embla.scrollNext();
					},
					{ signal: abort.signal },
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
				{ signal: abort.signal },
			);
		});
	}

	function c_orbit() {
		const component = document.querySelector(".c-process");
		if (!component) return;

		const log = createDebugLog("orbit");
		log("Initializing");

		const stickyEl = component.querySelector(".process_main");
		if (!stickyEl) return;

		// Spacer element you added (e.g. height: 400svh)
		const spacerEl = component.querySelector(".process_h");
		if (!spacerEl) {
			return;
		}

		const orbit = component.querySelector(".c-orbit");
		const track = component.querySelector(".orbit_cards");

		// Scope queries to this component (avoids collisions if multiple exist)
		const cards = gsap.utils.toArray(component.querySelectorAll(".orbit-card"));
		log("Found cards:", cards.length);
		const ring = component.querySelector(".orbit_ring-progress");
		const pulse = component.querySelector(".orbit_ring-pulse");

		// ---- safe re-init cleanup ----
		if (orbit._mm) {
			try {
				orbit._mm.kill();
			} catch (e) {}
			orbit._mm = null;
		}
		const old = ScrollTrigger.getById("ccOrbitSticky");
		if (old) old.kill();

		gsap.killTweensOf([stickyEl, ...cards, ring, pulse, track]);

		// Common baselines
		gsap.set(cards, { clearProps: "transform" });
		if (ring) {
			gsap.set(ring, {
				drawSVG: "0%",
				rotate: -90,
				transformOrigin: "50% 50%",
			});
		}
		if (pulse) gsap.set(pulse, { opacity: 0, transformOrigin: "50% 50%" });

		const mm = gsap.matchMedia();
		orbit._mm = mm;

		// Desktop tall enough: scrub the sequence while CSS sticky holds the element
		mm.add("(min-width: 992px) and (min-height: 640px)", () => {
			gsap.set(cards, { opacity: 0 });

			const tl = gsap.timeline({
				scrollTrigger: {
					id: "ccOrbitSticky",
					trigger: spacerEl,
					start: "top bottom",
					end: "bottom bottom", // full spacer scroll distance
					scrub: 1,
					invalidateOnRefresh: true,
					// markers: true,
				},
			});

			cards.forEach((card, i) => {
				// Stagger card fade-ins
				tl.to(
					card,
					{
						opacity: 1,
						duration: 1.5,
						ease: "power2.out",
					},
					">",
				);

				if (ring) {
					tl.to(
						ring,
						{
							drawSVG: `${((i + 1) / cards.length) * 100}%`,
							duration: 1.5,
							ease: "none",
						},
						"<",
					);
				}
			});

			return () => {
				tl.scrollTrigger?.kill();
				tl.kill();
			};
		});

		// Desktop short height: no sticky/pin behavior—just show end-state
		mm.add("(min-width: 992px) and (max-height: 639px)", () => {
			gsap.killTweensOf([stickyEl, ...cards, ring, pulse, track]);

			gsap.set(cards, { opacity: 1, clearProps: "transform" });
			if (track) gsap.set(track, { clearProps: "transform" });

			if (ring) {
				gsap.set(ring, {
					rotate: -90,
					transformOrigin: "50% 50%",
					drawSVG: "100%",
					clearProps: "scale,opacity",
				});
			}
			if (pulse) gsap.set(pulse, { opacity: 0, clearProps: "transform" });

			return () => gsap.killTweensOf([stickyEl, ...cards, ring, pulse, track]);
		});

		// Mobile: same idea—scrub track x + ring draw, no pinning
		mm.add("(max-width: 991px)", () => {
			gsap.set(cards, { opacity: 1 });

			const getGutter = () => {
				if (!orbit) return 16;
				const raw = getComputedStyle(orbit).getPropertyValue("--cc-orbit-gutter");
				const g = parseFloat(raw || "");
				return Number.isFinite(g) ? g : 16;
			};

			const getEndX = () => {
				if (!orbit || !track) return 0;
				const containerW = orbit.getBoundingClientRect().width;
				const overflow = track.scrollWidth - containerW;
				const g = getGutter();
				if (overflow <= 0) return g;
				return -overflow - g;
			};

			// Start with left gutter
			if (track) gsap.set(track, { x: getGutter() });

			const tl = gsap.timeline({
				scrollTrigger: {
					id: "ccOrbitSticky",
					trigger: spacerEl,
					start: "top bottom",
					end: "bottom bottom", // full spacer s
					scrub: 1,
					invalidateOnRefresh: true,
					// markers: true,
				},
			});

			if (track) {
				tl.to(track, {
					x: () => getEndX(),
					duration: 1,
					ease: "none",
				});
			}

			if (ring) {
				tl.to(
					ring,
					{
						drawSVG: "100%",
						duration: 1,
						ease: "none",
					},
					"0",
				);
			}

			return () => {
				tl.scrollTrigger?.kill();
				tl.kill();
			};
		});
	}

	function c_solutionTabs() {
		const prefersReduced =
			window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		const log = createDebugLog("solutionTabs");

		function getPanels(rootEl) {
			if (!rootEl) return [];
			return Array.from(
				rootEl.querySelectorAll(
					".c-tab-panel[data-tab-name], .c-tab-panel, .w-tab-panel, .tabs_tab-panel",
				),
			);
		}

		function buildPanelTimeline(panel, fromH, toH) {
			const header = panel.querySelector(".tab-panel_header");
			const subtitle = panel.querySelector(".tab-panel_subtitle");
			const body = panel.querySelector(".tab-panel_body");
			const footer = panel.querySelector(".tab-panel_footer");
			const services = panel.querySelector(".tab-panel_services");

			const svg = panel.querySelector("svg.svg-rings");
			if (!svg) return null;

			const ringA = svg.querySelector(".ring-a");
			const ringB = svg.querySelector(".ring-b");
			const ringC = svg.querySelector(".ring-c");
			if (!ringA || !ringB || !ringC) return null;

			// Reset state each time so replay is consistent
			rings_setRingsInitial(svg);

			const contentEls = [header, subtitle, body, footer, services].filter(Boolean);
			gsap.set(contentEls, { autoAlpha: 0, y: 20 });

			const isMobile = window.matchMedia && window.matchMedia("(max-width: 767px)").matches;

			const OVERLAP = "-=0.6";

			const tl = gsap.timeline();
			if (header) tl.to(header, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" });
			if (subtitle)
				tl.to(subtitle, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, OVERLAP);
			if (body) tl.to(body, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, OVERLAP);

			// Mobile uses the same overlap feel, but swaps the order:
			// services -> footer (instead of footer -> services)
			if (isMobile) {
				if (services)
					tl.to(services, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, OVERLAP);
				if (footer)
					tl.to(footer, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, OVERLAP);
			} else {
				if (footer)
					tl.to(footer, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, OVERLAP);
				if (services)
					tl.to(services, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, OVERLAP);
			}

			// Consistent rings animation everywhere
			rings_addRingsToTimeline(tl, svg, "<");

			return tl;
		}

		function playPanel(panel) {
			if (typeof gsap === "undefined") return;
			panel._tl?.kill();
			panel._tl = buildPanelTimeline(panel);
			panel._tl?.play(0);
		}

		function isMobile() {
			return window.matchMedia && window.matchMedia("(max-width: 767px)").matches;
		}

		// --------- mobile accordion ----------
		const mq = window.matchMedia("(max-width: 767px)");
		let mqBound = false;

		function initAccordion(component) {
			if (typeof gsap === "undefined") return;
			if (!component._headerClickHandlers) component._headerClickHandlers = new Map();

			const panels = getPanels(component);
			panels.forEach((panel) => {
				const header = panel.querySelector(".tab-panel_mbl-header");
				const inner = panel.querySelector(".tab-panel_inner");
				const icon = panel.querySelector(".tab-panel_accordion-icon");
				if (!header || !inner || !icon) return;

				if (header.dataset.accordionBound === "true") return;

				// Start collapsed
				gsap.set(inner, { height: 0, overflow: "hidden" });
				gsap.set(icon, { rotation: 0 });

				const tl = gsap.timeline({ paused: true });
				tl.to(inner, { height: "auto", duration: 0.5, ease: "power2.inOut" });
				tl.to(icon, { rotation: 180, duration: 0.5, ease: "power2.inOut" }, "<");
				panel._accordionTl = tl;

				const onHeaderClick = () => {
					const isOpen = panel.classList.contains("is-open");

					// close others
					panels.forEach((other) => {
						if (other === panel) return;
						other.classList.remove("is-open");
						other._accordionTl?.reverse();
					});

					if (isOpen) {
						panel.classList.remove("is-open");
						tl.reverse();
					} else {
						panel.classList.add("is-open");
						tl.play(0);
						// ALSO trigger your panel animation on open
						playPanel(panel);
					}
				};

				component._headerClickHandlers.set(header, onHeaderClick);
				header.dataset.accordionBound = "true";
				header.addEventListener("click", onHeaderClick);
			});
		}

		function destroyAccordion(component) {
			const panels = getPanels(component);

			panels.forEach((panel) => {
				const header = panel.querySelector(".tab-panel_mbl-header");
				const inner = panel.querySelector(".tab-panel_inner");
				const icon = panel.querySelector(".tab-panel_accordion-icon");

				if (header && header.dataset.accordionBound === "true") {
					const handler = component._headerClickHandlers?.get(header);
					if (handler) header.removeEventListener("click", handler);
					component._headerClickHandlers?.delete(header);
					header.removeAttribute("data-accordion-bound");
				}

				panel.classList.remove("is-open");

				if (panel._accordionTl) {
					panel._accordionTl.kill();
					delete panel._accordionTl;
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

		function initComponent(component, componentIndex) {
			// Safe re-init
			if (component._ccSolutionTabs?.cleanup) {
				try {
					component._ccSolutionTabs.cleanup();
				} catch (e) {}
			}

			const tabsRoot = component.querySelector(".tabs_tabs");
			const menuEl = component.querySelector(".tabs_tabs-menu");
			const contentEl = component.querySelector(".tabs_tabs-content");
			const panels = getPanels(component).filter((p) => p.matches(".c-tab-panel"));

			if (!tabsRoot || !menuEl || !contentEl || !panels.length) {
				log("skip: missing required elements", {
					componentIndex,
					tabsRoot: !!tabsRoot,
					menuEl: !!menuEl,
					contentEl: !!contentEl,
					panels: panels.length,
				});
				return;
			}

			// Build tab buttons from panel data-tab-name
			menuEl.innerHTML = "";
			menuEl.setAttribute("role", "tablist");

			const tabButtons = panels.map((panel, index) => {
				const rawName = panel.getAttribute("data-tab-name") || "";
				const label = rawName.trim() || `Tab ${index + 1}`;

				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "c-tab-link";
				btn.textContent = label;
				btn.dataset.index = String(index);
				btn.dataset.tabName = label;
				btn.setAttribute("role", "tab");
				btn.setAttribute("aria-selected", index === 0 ? "true" : "false");

				if (!panel.id) panel.id = `solution-tabs_panel_${Math.random().toString(36).slice(2)}`;
				btn.setAttribute("aria-controls", panel.id);
				btn.id = `${panel.id}__tab`;
				panel.setAttribute("role", "tabpanel");
				panel.setAttribute("aria-labelledby", btn.id);

				menuEl.appendChild(btn);
				return btn;
			});

			let activeIndex = 0;
			let heightTween = null;
			let rafHeight = 0;
			let mqBound = false;
			const mq = window.matchMedia("(max-width: 767px)");

			const setActiveTabButton = (index) => {
				tabButtons.forEach((btn, i) => {
					const isActive = i === index;
					btn.classList.toggle("is-active", isActive);
					btn.setAttribute("aria-selected", isActive ? "true" : "false");
				});
			};

			const applyDesktopVisibility = (index) => {
				panels.forEach((panel, i) => {
					const isActive = i === index;
					panel.classList.toggle("is-active", isActive);
					gsap.set(panel, { display: isActive ? "block" : "none" });
				});
			};

			const killHeightTween = () => {
				if (rafHeight) {
					cancelAnimationFrame(rafHeight);
					rafHeight = 0;
				}
				if (heightTween) {
					try {
						heightTween.kill();
					} catch (e) {}
					heightTween = null;
				}
			};

			const animateSectionHeight = ({
				el = contentEl,
				fromHeight,
				toHeight,
				duration = 0.35,
			} = {}) => {
				if (prefersReduced) {
					gsap.set(el, { clearProps: "height,overflow" });
					return;
				}

				killHeightTween();
				const from = Number.isFinite(fromHeight) ? fromHeight : el.getBoundingClientRect().height;

				gsap.set(el, { height: from, overflow: "hidden" });

				rafHeight = requestAnimationFrame(() => {
					rafHeight = 0;
					if (!Number.isFinite(toHeight) || Math.abs(toHeight - from) < 1) {
						gsap.set(el, { clearProps: "height,overflow" });
						return;
					}

					heightTween = gsap.to(el, {
						height: toHeight,
						duration,
						ease: "power2.out",
						overwrite: "auto",
						onComplete: () => {
							gsap.set(el, { clearProps: "height,overflow" });
							heightTween = null;
						},
					});
				});
			};

			const openAccordionIndex = (index) => {
				if (typeof gsap === "undefined") return;
				const target = panels[index];
				if (!target) return;

				panels.forEach((panel, i) => {
					if (panel === target) return;
					panel.classList.remove("is-open");
					panel._accordionTl?.reverse();
				});

				target.classList.add("is-open");
				target._accordionTl?.play(0);
				playPanel(target);
			};

			const showPanel = (index, { animate = true } = {}) => {
				if (!Number.isFinite(index)) return;
				if (index < 0 || index >= panels.length) return;
				if (index === activeIndex) return;

				const fromIndex = activeIndex;
				const toIndex = index;

				const fromPanel = panels[fromIndex];
				const toPanel = panels[toIndex];
				if (!fromPanel || !toPanel) return;

				const measureHeight = (el) => {
					const height = Math.ceil(el.getBoundingClientRect().height);
					return height;
				};

				// Stop any in-flight panel animation on the outgoing panel
				fromPanel?._tl?.kill?.();

				// get height of toPanel. We do this by making it absolutely positioned temporarily.
				gsap.set(toPanel, {
					position: "absolute",
					left: 0,
					top: 0,
					right: 0,
					visibility: "hidden",
					display: "block",
				});
				const toPanelH = measureHeight(toPanel);
				gsap.set(toPanel, { clearProps: "position,visibility,display,left,right,top" });

				// and measure height of fromPanel
				const fromPanelH = measureHeight(fromPanel);

				// log the heights
				log("panel heights", {
					fromIndex,
					toIndex,
					fromPanelH,
					toPanelH,
				});

				activeIndex = toIndex;
				setActiveTabButton(activeIndex);

				if (mq.matches) {
					// Mobile behavior: accordion
					openAccordionIndex(activeIndex);
					return;
				}

				// Desktop behavior: show one panel + animate section height
				// Lock the container height BEFORE switching visibility to prevent jumps
				if (animate && typeof gsap !== "undefined") {
					gsap.set(contentEl, { height: fromPanelH, overflow: "hidden" });
				}

				// if incoming panel is taller, animate the height first
				if (toPanelH > fromPanelH && animate) {
					animateSectionHeight({
						el: contentEl,
						fromHeight: fromPanelH,
						toHeight: toPanelH,
						duration: 0.35,
					});
				}

				applyDesktopVisibility(activeIndex);

				// Play incoming panel animation
				playPanel(toPanel);

				// if incoming panel is shorter, animate the height after switching panels
				if (toPanelH <= fromPanelH && animate) {
					applyDesktopVisibility(activeIndex);
					playPanel(toPanel);

					animateSectionHeight({
						el: contentEl,
						fromHeight: fromPanelH,
						toHeight: toPanelH,
						duration: 0.35,
					});
				}
			};

			const onMenuClick = (e) => {
				const btn = e.target.closest("button.c-tab-link");
				if (!btn || !menuEl.contains(btn)) return;
				const idx = parseInt(btn.dataset.index || "0", 10);
				if (!Number.isFinite(idx)) return;
				showPanel(idx, { animate: true });
			};

			const onMenuKeyDown = (e) => {
				if (e.key !== "Enter" && e.key !== " ") return;
				const btn = e.target.closest("button.c-tab-link");
				if (!btn || !menuEl.contains(btn)) return;
				e.preventDefault();
				const idx = parseInt(btn.dataset.index || "0", 10);
				if (!Number.isFinite(idx)) return;
				showPanel(idx, { animate: true });
			};

			const applyMode = () => {
				killHeightTween();
				if (typeof gsap !== "undefined") gsap.set(component, { clearProps: "height,overflow" });

				if (mq.matches) {
					// Mobile: show all panels and let accordion manage inner visibility
					panels.forEach((panel) => {
						if (typeof gsap !== "undefined") gsap.set(panel, { display: "block" });
						else panel.style.display = "block";
					});
					initAccordion(tabsRoot);
				} else {
					destroyAccordion(tabsRoot);
					applyDesktopVisibility(activeIndex);
					// Play active panel on mode switch (safe)
					playPanel(panels[activeIndex]);
				}
			};

			// Initial state
			setActiveTabButton(0);
			applyMode();

			menuEl.addEventListener("click", onMenuClick);
			menuEl.addEventListener("keydown", onMenuKeyDown);

			if (!mqBound) {
				mqBound = true;
				mq.addEventListener("change", applyMode);
			}

			component._ccSolutionTabs = {
				cleanup: () => {
					menuEl.removeEventListener("click", onMenuClick);
					menuEl.removeEventListener("keydown", onMenuKeyDown);
					try {
						mq.removeEventListener("change", applyMode);
					} catch (e) {}
					killHeightTween();
					destroyAccordion(tabsRoot);
					panels.forEach((p) => {
						p._tl?.kill?.();
						p._accordionTl?.kill?.();
					});
				},
			};
		}

		const components = Array.from(document.querySelectorAll(".c-tabs"));
		if (!components.length) return;

		components.forEach((component, index) => initComponent(component, index));
	}

	function c_simpleTabs() {
		const prefersReduced =
			window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		const components = Array.from(document.querySelectorAll(".c-simple-tabs"));
		if (!components.length) return;

		const log = createDebugLog("simpleTabs");
		log("init", {
			components: components.length,
			prefersReduced,
		});

		const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

		components.forEach((component, componentIndex) => {
			// Safe re-init (FS renders / Webflow rerenders)
			if (component._ccSimpleTabs?.cleanup) {
				log("cleanup prior instance", { componentIndex });
				try {
					component._ccSimpleTabs.cleanup();
				} catch (e) {}
			}

			const panelsWrap = component.querySelector(".simple-tabs_panels");
			const panels = gsap.utils.toArray(".simple-tabs_panel", component);
			const tabList = component.querySelector(".simple-tabs_controls .simple-tabs_tab-list");
			const tabListWrap = component.querySelector(
				".simple-tabs_controls .simple-tabs_tab-list-wrap",
			);
			const allMedia = gsap.utils.toArray(".simple-tabs_media", component);
			const allContent = gsap.utils.toArray(".simple-tabs_content", component);

			if (!panelsWrap || !panels.length || !tabList) {
				log("skip: missing required elements", {
					componentIndex,
					panelsWrap: !!panelsWrap,
					panels: panels.length,
					tabList: !!tabList,
				});
				return;
			}
			if (!tabListWrap) {
				log("skip: missing .simple-tabs_tab-list-wrap", { componentIndex });
				return;
			}

			log("component", {
				componentIndex,
				panels: panels.length,
			});

			// Ensure predictable panel visibility regardless of CSS.
			panels.forEach((p, i) => {
				gsap.set(p, { display: i === 0 ? "block" : "none" });
			});

			// Build tab buttons from panel data-tab-name
			tabList.innerHTML = "";
			tabList.setAttribute("role", "tablist");

			const tabButtons = panels.map((panel, index) => {
				const rawName = panel.getAttribute("data-tab-name") || "";
				const label = rawName.trim() || `Tab ${index + 1}`;

				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "simple-tabs_tab";
				btn.textContent = label;
				btn.setAttribute("role", "tab");
				btn.setAttribute("aria-selected", index === 0 ? "true" : "false");
				btn.dataset.index = String(index);

				// panel/tab linking (optional but nice)
				if (!panel.id) panel.id = `simple-tabs_panel_${Math.random().toString(36).slice(2)}`;
				btn.setAttribute("aria-controls", panel.id);
				panel.setAttribute("role", "tabpanel");
				panel.setAttribute("aria-labelledby", `${panel.id}__tab`);
				btn.id = `${panel.id}__tab`;

				tabList.appendChild(btn);
				return btn;
			});
			log(
				"built tabs",
				tabButtons.map((b) => b.textContent),
			);

			let activeIndex = 0;
			let isAnimating = false;
			let activeTl = null;
			let draggable = null;
			let ro = null;
			let rafMeasure = 0;

			const CLS_OVERFLOW = "has-overflow";
			const CLS_OVERFLOW_LEFT = "has-overflow-left";
			const CLS_OVERFLOW_RIGHT = "has-overflow-right";
			const EPS = 1; // px tolerance to avoid flicker at bounds

			function getBounds() {
				const viewportW = tabListWrap.getBoundingClientRect().width;
				const contentW = tabList.scrollWidth;
				const minX = Math.min(0, viewportW - contentW);
				return { minX, maxX: 0, viewportW, contentW };
			}

			function getTabListX() {
				const raw = gsap.getProperty(tabList, "x");
				if (typeof raw === "number") return raw;
				const n = parseFloat(String(raw ?? "0"));
				return Number.isFinite(n) ? n : 0;
			}

			function updateOverflowClasses() {
				const { minX, maxX, viewportW, contentW } = getBounds();
				const hasOverflow = contentW > viewportW + 2;

				tabListWrap.classList.toggle(CLS_OVERFLOW, hasOverflow);

				if (!hasOverflow) {
					tabListWrap.classList.remove(CLS_OVERFLOW_LEFT, CLS_OVERFLOW_RIGHT);
					return;
				}

				const x = getTabListX();
				const canScrollLeft = x < maxX - EPS; // not at left-most bound (x ~ 0)
				const canScrollRight = x > minX + EPS; // not at right-most bound (x ~ minX)

				tabListWrap.classList.toggle(CLS_OVERFLOW_LEFT, canScrollLeft);
				tabListWrap.classList.toggle(CLS_OVERFLOW_RIGHT, canScrollRight);
			}

			function applyDraggableIfNeeded() {
				const { minX, maxX, viewportW, contentW } = getBounds();
				const hasOverflow = contentW > viewportW + 2;
				log("overflow check", { viewportW, contentW, hasOverflow, minX, maxX });

				if (!hasOverflow) {
					if (draggable) {
						log("draggable: kill (no overflow)");
						try {
							draggable.kill();
						} catch (e) {}
						draggable = null;
					}
					gsap.set(tabList, { x: 0 });
					updateOverflowClasses();
					return;
				}

				if (typeof Draggable === "undefined") {
					// Still apply classes even if drag isn't available.
					log("draggable: missing (Draggable not loaded)");
					updateOverflowClasses();
					return;
				}

				if (!draggable) {
					log("draggable: create", { minX, maxX });
					draggable = Draggable.create(tabList, {
						type: "x",
						dragClickables: true,
						allowNativeTouchScrolling: true,
						bounds: { minX, maxX },
						onDrag: updateOverflowClasses,
						onRelease: updateOverflowClasses,
						onThrowUpdate: updateOverflowClasses,
					})?.[0];
				}

				if (draggable) {
					try {
						draggable.applyBounds({ minX, maxX });
						draggable.update();
					} catch (e) {}
				}
				updateOverflowClasses();
			}

			function scrollTabIntoView(index, { animate = true } = {}) {
				const btn = tabButtons[index];
				if (!btn) return;

				const { minX, maxX } = getBounds();
				const currentX = gsap.getProperty(tabList, "x");
				const targetX = clamp(-btn.offsetLeft, minX, maxX);
				log("scroll tab", { index, label: btn.textContent, currentX, targetX });

				if (Math.abs(targetX - currentX) < 1) return;

				if (animate && !prefersReduced) {
					gsap.to(tabList, {
						x: targetX,
						duration: 0.45,
						ease: "power2.out",
						overwrite: "auto",
						onUpdate: () => {
							draggable?.update?.();
							updateOverflowClasses();
						},
						onComplete: updateOverflowClasses,
					});
				} else {
					gsap.set(tabList, { x: targetX });
					draggable?.update?.();
					updateOverflowClasses();
				}
			}

			function setActiveTab(index) {
				tabButtons.forEach((btn, i) => {
					btn.classList.toggle("is-active", i === index);
					btn.setAttribute("aria-selected", i === index ? "true" : "false");
				});
			}

			function showPanel(index, { animate = true } = {}) {
				if (!Number.isFinite(index)) return;
				if (index < 0 || index >= panels.length) return;
				if (index === activeIndex) {
					scrollTabIntoView(index, { animate });
					return;
				}

				const fromIndex = activeIndex;
				const toIndex = index;

				const fromPanel = panels[fromIndex];
				const toPanel = panels[toIndex];
				if (!fromPanel || !toPanel) return;

				const measureHeight = (el) => {
					const height = Math.ceil(el.getBoundingClientRect().height);
					return height;
				};

				// If a timeline is mid-flight, kill it and hide the outgoing panel it was responsible for
				if (activeTl) {
					const prevOutgoing = activeTl._ccOutgoingPanel;
					try {
						activeTl.kill();
					} catch (e) {}
					activeTl = null;
					isAnimating = false;
					if (prevOutgoing) gsap.set(prevOutgoing, { display: "none" });
				}

				setActiveTab(toIndex);
				scrollTabIntoView(toIndex, { animate: true });

				const fromMedia = fromPanel.querySelector(".simple-tabs_panel-media");
				const fromContent = fromPanel.querySelector(".simple-tabs_panel-content");
				const toMedia = toPanel.querySelector(".simple-tabs_panel-media");
				const toContent = toPanel.querySelector(".simple-tabs_panel-content");

				// Keep both in layout during transition
				gsap.set(fromPanel, { display: "block" });
				// gsap.set(toPanel, { display: "block" });

				gsap.killTweensOf([fromMedia, fromContent, toMedia, toContent, panelsWrap]);

				// get height of toPanel. We do this by making it absolutely positioned temporarily.
				gsap.set(toPanel, {
					position: "absolute",
					left: 0,
					top: 0,
					right: 0,
					visibility: "hidden",
					display: "block",
				});
				const toPanelH = measureHeight(toPanel);
				gsap.set(toPanel, { clearProps: "position,visibility,display,left,right,top" });

				// and measure height of fromPanel
				const fromPanelH = measureHeight(fromPanel);

				// log the heights
				log("panel heights", {
					fromIndex,
					toIndex,
					fromPanelH,
					toPanelH,
				});

				// Reduced/instant
				if (prefersReduced || !animate) {
					gsap.set(fromPanel, { display: "none" });
					gsap.set(toPanel, { display: "block" });

					// snap wrapper height (optional)
					gsap.set(panelsWrap, { height: "auto" });

					if (toMedia) gsap.set(toMedia, { autoAlpha: 1, scale: 1, overwrite: "auto" });
					if (toContent) gsap.set(toContent, { autoAlpha: 1, y: 0, overwrite: "auto" });

					if (fromMedia) gsap.set(fromMedia, { autoAlpha: 0, scale: 0.985, overwrite: "auto" });
					if (fromContent) gsap.set(fromContent, { autoAlpha: 0, y: -12, overwrite: "auto" });

					activeIndex = toIndex;
					return;
				}

				isAnimating = true;
				activeIndex = toIndex; // important for rapid clicks

				// Prep incoming start pose
				if (toMedia) gsap.set(toMedia, { autoAlpha: 0, scale: 0.985, overwrite: "auto" });
				if (toContent) gsap.set(toContent, { autoAlpha: 0, y: -5, overwrite: "auto" });

				const outgoingPanel = fromPanel;

				activeTl = gsap.timeline({
					defaults: { ease: "power2.out", overwrite: "auto" },
					onComplete: () => {
						gsap.set(outgoingPanel, { display: "none" });
						// Return wrapper to auto so it responds to resizes/font loads
						gsap.set(panelsWrap, { height: "auto" });
						isAnimating = false;
						activeTl = null;
					},
				});
				activeTl._ccOutgoingPanel = outgoingPanel;

				// if toPanelH is greater than fromPanelH, expand first, otherwise do the rest of the anim first
				let panelHDone = false;

				if (toPanelH > fromPanelH) {
					activeTl.to(panelsWrap, { height: toPanelH, duration: 0.35 }, 0);
					panelHDone = true;
				}

				// Outgoing out
				if (fromMedia) activeTl.to(fromMedia, { autoAlpha: 0, scale: 0.985, duration: 0.28 }, 0);
				if (fromContent) activeTl.to(fromContent, { autoAlpha: 0, y: -12, duration: 0.24 }, 0);

				// Incoming in
				activeTl.set(toPanel, { display: "block" }, 0.18);
				if (toMedia) activeTl.to(toMedia, { autoAlpha: 1, scale: 1, duration: 0.55 }, 0.18);
				if (toContent) activeTl.to(toContent, { autoAlpha: 1, y: 0, duration: 0.45 }, 0.22);

				// Height tween for shrinking case
				if (toPanelH < fromPanelH && !panelHDone) {
					activeTl.to(panelsWrap, { height: toPanelH, duration: 0.35 }, 0.4);
				}
			}

			function onTabActivate(e) {
				const btn = e.target.closest(".simple-tabs_tab");
				if (!btn || !tabList.contains(btn)) return;
				const idx = parseInt(btn.dataset.index || "0", 10);
				if (!Number.isFinite(idx)) return;
				showPanel(idx, { animate: true });
			}

			function onKeyDown(e) {
				if (e.key !== "Enter" && e.key !== " ") return;
				const btn = e.target.closest(".simple-tabs_tab");
				if (!btn || !tabList.contains(btn)) return;
				e.preventDefault();
				const idx = parseInt(btn.dataset.index || "0", 10);
				if (!Number.isFinite(idx)) return;
				showPanel(idx, { animate: true });
			}

			// Initial state
			log("initial state", { activeIndex: 0 });
			setActiveTab(0);
			scrollTabIntoView(0, { animate: false });
			applyDraggableIfNeeded();
			updateOverflowClasses();

			tabList.addEventListener("click", onTabActivate);
			tabList.addEventListener("keydown", onKeyDown);

			const scheduleMeasure = () => {
				if (rafMeasure) cancelAnimationFrame(rafMeasure);
				rafMeasure = requestAnimationFrame(() => {
					rafMeasure = 0;
					log("measure", { activeIndex });
					applyDraggableIfNeeded();
					scrollTabIntoView(activeIndex, { animate: false });
					updateOverflowClasses();
				});
			};

			// React to layout changes that affect overflow
			window.addEventListener("resize", scheduleMeasure);
			window.addEventListener("load", scheduleMeasure, { once: true });
			if (document.fonts && typeof document.fonts.ready?.then === "function") {
				document.fonts.ready.then(scheduleMeasure).catch(() => {});
			}
			if (typeof ResizeObserver !== "undefined") {
				ro = new ResizeObserver(() => scheduleMeasure());
				try {
					ro.observe(tabListWrap);
				} catch (e) {}
			}

			component._ccSimpleTabs = {
				cleanup: () => {
					tabList.removeEventListener("click", onTabActivate);
					tabList.removeEventListener("keydown", onKeyDown);
					window.removeEventListener("resize", scheduleMeasure);
					if (rafMeasure) cancelAnimationFrame(rafMeasure);
					ro?.disconnect?.();
					activeTl?.kill?.();
					try {
						draggable?.kill?.();
					} catch (e) {}
					try {
						tabListWrap.classList.remove(CLS_OVERFLOW, CLS_OVERFLOW_LEFT, CLS_OVERFLOW_RIGHT);
					} catch (e) {}
				},
			};
		});
	}

	function c_circleStats({ start = "bottom bottom", once = true } = {}) {
		const log = createDebugLog("circle-stats");

		function debounceLocal(fn, wait = 120) {
			let t = null;
			return (...args) => {
				if (t) clearTimeout(t);
				t = setTimeout(() => fn(...args), wait);
			};
		}

		const components = Array.from(document.querySelectorAll(".c-circle-stats"));
		if (!components.length) return;

		if (log.enabled) log("init", { count: components.length, start, once });

		const isMobile = () => window.matchMedia && window.matchMedia("(max-width: 767px)").matches;
		const mobileNow = isMobile();
		c_circleStats._lastIsMobile = mobileNow;

		// Ensure vertical lines end at the center of the bg circle on load. This needs layout, so do immediate + next frame.
		function setCircleStatLineOffsets(root = document) {
			const comps = Array.from(root.querySelectorAll(".c-circle-stats"));
			comps.forEach((comp) => {
				const items = Array.from(comp.querySelectorAll(".circle-stat"));
				items.forEach((item, index) => {
					const line = item.querySelector(".circle-stat_line");
					const svg = item.querySelector("svg");
					if (!line || !svg) return;

					const w = svg.getBoundingClientRect().width;
					if (!Number.isFinite(w) || w <= 0) {
						if (log.enabled) log("line resizing skipped (svg width)", { index, w, item });
						return;
					}

					const halfPx = w * 0.5;
					if (isMobile()) {
						line.style.left = `${halfPx.toFixed(2)}px`;
						line.style.bottom = "";
					} else {
						line.style.bottom = `${halfPx.toFixed(2)}px`;
						line.style.left = "";
					}
				});
			});
		}
		setCircleStatLineOffsets();
		requestAnimationFrame(() => setCircleStatLineOffsets());

		// Safe re-init: only one resize listener for this init fn.
		if (c_circleStats._onResize) {
			window.removeEventListener("resize", c_circleStats._onResize);
			c_circleStats._onResize = null;
		}
		c_circleStats._onResize = debounceLocal(() => {
			const nextIsMobile = isMobile();
			if (c_circleStats._lastIsMobile !== nextIsMobile) {
				c_circleStats._lastIsMobile = nextIsMobile;
				// Layout changed enough (line switches orientation) that we should rebuild
				// the timelines with the correct axis + transform origin.
				c_circleStats({ start, once });
				return;
			}

			setCircleStatLineOffsets();
		}, 120);
		window.addEventListener("resize", c_circleStats._onResize, { passive: true });

		function clamp01(n) {
			if (!Number.isFinite(n)) return 0;
			return Math.max(0, Math.min(1, n));
		}

		function isInStartZone(el, startPct = 1) {
			const rect = el.getBoundingClientRect();
			const vh = window.innerHeight || document.documentElement.clientHeight || 0;
			if (!vh) return false;
			return rect.top <= vh * startPct && rect.bottom >= 0;
		}

		function isPastBottomBottom(el) {
			const rect = el.getBoundingClientRect();
			const vh = window.innerHeight || document.documentElement.clientHeight || 0;
			if (!vh) return false;
			return rect.bottom <= vh;
		}

		components.forEach((component) => {
			const alreadyDone = component._ccCircleStatsDone === "1";
			const isMobileComponent = mobileNow;
			const lineAxis = isMobileComponent ? "scaleX" : "scaleY";
			const lineOrigin = isMobileComponent ? "left center" : "top center";

			// --- safe re-init (FS rerenders/etc.) ---
			if (component._ccCircleStats) {
				log("re-init: killing previous", component);
				component._ccCircleStats.st?.kill?.();
				component._ccCircleStats.sts?.forEach?.((t) => t?.kill?.());
				component._ccCircleStats.tl?.kill?.();
				component._ccCircleStats = null;
			}

			const items = Array.from(component.querySelectorAll(".circle-stat"));
			if (!items.length) return;

			const startEl = items[0] || component;

			log("bind component", { component, items: items.length });

			// Tunables
			const lineDur = 0.75;
			const ringDur = 1;
			const lineToRingDelay = 0;
			const itemOffset = 0.75;
			const bodyY = 20;
			const statY = 14;
			const fadeDur = 0.5;

			// Store refs for safe re-init cleanup

			// Baselines
			items.forEach((item) => {
				const itemDone = alreadyDone || item.dataset.ccCircleStatDone === "1";
				if (alreadyDone) item.dataset.ccCircleStatDone = "1";

				const line = item.querySelector(".circle-stat_line");
				if (line) {
					gsap.set(line, {
						transformOrigin: lineOrigin,
						opacity: 1,
						scaleX: isMobileComponent ? (itemDone ? 1 : 0) : 1,
						scaleY: isMobileComponent ? 1 : itemDone ? 1 : 0,
					});
				}

				const body = item.querySelector(".circle-stat_body");
				if (body) {
					gsap.set(body, { autoAlpha: itemDone ? 1 : 0, y: itemDone ? 0 : bodyY });
				}
				const statEl = item.querySelector(".circle-stat_stat");
				if (statEl) {
					gsap.set(statEl, { autoAlpha: itemDone ? 1 : 0, y: itemDone ? 0 : statY });
				}

				const dashCirc = item.querySelector("svg > circle.circle-stat_svg-dash-circ");
				const bgCirc = item.querySelector("svg > circle.circle-stat_svg-bg");
				if (bgCirc) {
					gsap.set(bgCirc, { opacity: itemDone ? 1 : 0 });
				}
				if (dashCirc) {
					if (!itemDone || !bgCirc) {
						gsap.set(dashCirc, { attr: { r: 0.001, cy: 100 } });
					} else {
						const endRaw = parseFloat(item.getAttribute("data-stat-end-value") || "");
						const maxRaw = parseFloat(item.getAttribute("data-stat-max-value") || "");
						if (Number.isFinite(endRaw)) {
							let max = Number.isFinite(maxRaw) ? maxRaw : endRaw;
							if (max < endRaw) max = endRaw;

							const ratio = clamp01(max > 0 ? endRaw / max : 1);
							const rBg = parseFloat(bgCirc.getAttribute("r") || "0") || 0;
							const cyBg = parseFloat(bgCirc.getAttribute("cy") || "0") || 0;
							const inset = 2;
							const rMax = Math.max(0, rBg - inset);
							const rEnd = Math.sqrt(ratio) * rMax;
							const cyEnd = cyBg + (rMax - rEnd);
							gsap.set(dashCirc, { attr: { r: rEnd, cy: cyEnd } });
						}
					}
				}
			});

			if (!isMobileComponent) {
				// Desktop: single trigger, plays the whole component timeline.
				const tl = gsap.timeline({ paused: true });

				items.forEach((item, index) => {
					const itemDone = alreadyDone || item.dataset.ccCircleStatDone === "1";
					const line = item.querySelector(".circle-stat_line");
					const body = item.querySelector(".circle-stat_body");
					const statEl = item.querySelector(".circle-stat_stat");

					const dashCirc = item.querySelector("svg > circle.circle-stat_svg-dash-circ");
					const bgCirc = item.querySelector("svg > circle.circle-stat_svg-bg");
					const itemTl = gsap.timeline();

					if (itemDone) {
						tl.add(itemTl, index * itemOffset);
						return;
					}

					if (!dashCirc || !bgCirc) {
						log("missing circles", {
							index,
							hasDash: !!dashCirc,
							hasBg: !!bgCirc,
							item,
						});
					}

					// 0) Fade-ins (bg circle + body)
					if (bgCirc) {
						itemTl.to(
							bgCirc,
							{ opacity: 1, duration: fadeDur, ease: "power1.out", overwrite: "auto" },
							0,
						);
					}
					if (body) {
						itemTl.to(
							body,
							{ autoAlpha: 1, y: 0, duration: fadeDur, ease: "power1.out", overwrite: "auto" },
							0,
						);
					}
					if (statEl) {
						itemTl.to(
							statEl,
							{ autoAlpha: 1, y: 0, duration: fadeDur, ease: "power1.out", overwrite: "auto" },
							0,
						);
					}

					// 1) Line
					if (line) {
						itemTl.to(line, {
							[lineAxis]: 1,
							duration: lineDur,
							ease: "power2.out",
							overwrite: "auto",
						});
					}

					// 2) Ring (area-based scaling) + 3) Count-up trigger
					if (dashCirc && bgCirc) {
						const endRaw = parseFloat(item.getAttribute("data-stat-end-value") || "");
						const maxRaw = parseFloat(item.getAttribute("data-stat-max-value") || "");
						if (Number.isFinite(endRaw)) {
							let max = Number.isFinite(maxRaw) ? maxRaw : endRaw;
							if (max < endRaw) max = endRaw;

							const ratio = clamp01(max > 0 ? endRaw / max : 1);

							const rBg = parseFloat(bgCirc.getAttribute("r") || "0") || 0;
							const cyBg = parseFloat(bgCirc.getAttribute("cy") || "0") || 0;
							const inset = 2; // keep inside bg circle so stroke/dash doesn't crop
							const rMax = Math.max(0, rBg - inset);
							const rEnd = Math.sqrt(ratio) * rMax;
							const cyEnd = cyBg + (rMax - rEnd);

							const ringStart = line ? lineToRingDelay : 0;

							log("item calc", {
								index,
								end: endRaw,
								max,
								ratio,
								rBg,
								inset,
								rMax,
								rEnd,
								cyBg,
								cyEnd,
								ringStart,
							});

							itemTl.call(
								() => {
									try {
										item.dispatchEvent(new CustomEvent("cc:reveal", { bubbles: true }));
									} catch (e) {}

									helper_dispatchCountUp(item, component, {
										durationSec: 0.5,
										defaultDelaySec: 0,
									});
								},
								[],
								ringStart,
							);

							itemTl.to(
								dashCirc,
								{
									attr: { r: rEnd, cy: cyEnd },
									duration: ringDur,
									ease: "power2.out",
									overwrite: "auto",
								},
								ringStart,
							);
						}
					}

					// Stagger per-item timelines so each item runs line -> ring -> countup as a unit.
					tl.add(itemTl, index * itemOffset);
				});

				let revealed = false;
				const reveal = () => {
					if (revealed) return;
					revealed = true;
					component._ccCircleStatsDone = "1";
					items.forEach((it) => (it.dataset.ccCircleStatDone = "1"));
					log("reveal", { component });
					tl.play(0);
				};

				if (alreadyDone) revealed = true;

				let st = null;
				if (!alreadyDone) {
					st = ScrollTrigger.create({
						trigger: startEl,
						start,
						invalidateOnRefresh: true,
						once,
						onEnter: () => {
							log("ScrollTrigger onEnter", { component, start, startEl });
							reveal();
						},
						onRefresh: (self) => {
							if (log.enabled)
								log("ScrollTrigger onRefresh", { progress: self.progress, component, startEl });
							if (self.progress > 0 || isPastBottomBottom(startEl)) reveal();
						},
					});

					// Covers initial load where already past the trigger
					if (st.progress > 0 || isPastBottomBottom(startEl)) reveal();
				} else {
					// Already revealed once; keep end state.
					tl.progress(1);
				}

				component._ccCircleStats = { tl, st, sts: [] };
				return;
			}

			// Mobile: one ScrollTrigger per item (bottom hits bottom), play one-at-a-time.
			const sts = [];
			let playChain = Promise.resolve();

			const revealItem = (item, itemTl, index) => {
				if (!item || item.dataset.ccCircleStatDone === "1") return;
				item.dataset.ccCircleStatDone = "1";
				log("reveal item", { component, index, item });

				playChain = playChain.then(
					() =>
						new Promise((resolve) => {
							if (!itemTl || itemTl.totalDuration() === 0) {
								itemTl?.progress?.(1);
								resolve();
								return;
							}
							itemTl.eventCallback("onComplete", () => resolve());
							itemTl.play(0);
						}),
				);

				if (items.every((it) => it.dataset.ccCircleStatDone === "1")) {
					component._ccCircleStatsDone = "1";
				}
			};

			items.forEach((item, index) => {
				const itemDone = alreadyDone || item.dataset.ccCircleStatDone === "1";
				if (itemDone) return;

				const line = item.querySelector(".circle-stat_line");
				const body = item.querySelector(".circle-stat_body");
				const dashCirc = item.querySelector("svg > circle.circle-stat_svg-dash-circ");
				const bgCirc = item.querySelector("svg > circle.circle-stat_svg-bg");
				const itemTl = gsap.timeline({ paused: true });
				const statEl = item.querySelector(".circle-stat_stat");

				if (log.enabled && (!dashCirc || !bgCirc)) {
					log("missing circles", {
						index,
						hasDash: !!dashCirc,
						hasBg: !!bgCirc,
						item,
					});
				}

				// 0) Fade-ins (bg circle + body)
				if (bgCirc) {
					itemTl.to(
						bgCirc,
						{ opacity: 1, duration: fadeDur, ease: "power1.out", overwrite: "auto" },
						0,
					);
				}
				if (body) {
					itemTl.to(
						body,
						{ autoAlpha: 1, y: 0, duration: fadeDur, ease: "power1.out", overwrite: "auto" },
						0,
					);
				}
				if (statEl) {
					itemTl.to(
						statEl,
						{ autoAlpha: 1, y: 0, duration: fadeDur, ease: "power1.out", overwrite: "auto" },
						0,
					);
				}

				// 1) Line
				if (line) {
					itemTl.to(line, {
						[lineAxis]: 1,
						duration: lineDur,
						ease: "power2.out",
						overwrite: "auto",
					});
				}

				// 2) Ring (area-based scaling) + 3) Count-up trigger
				if (dashCirc && bgCirc) {
					const endRaw = parseFloat(item.getAttribute("data-stat-end-value") || "");
					const maxRaw = parseFloat(item.getAttribute("data-stat-max-value") || "");
					if (Number.isFinite(endRaw)) {
						let max = Number.isFinite(maxRaw) ? maxRaw : endRaw;
						if (max < endRaw) max = endRaw;

						const ratio = clamp01(max > 0 ? endRaw / max : 1);

						const rBg = parseFloat(bgCirc.getAttribute("r") || "0") || 0;
						const cyBg = parseFloat(bgCirc.getAttribute("cy") || "0") || 0;
						const inset = 2;
						const rMax = Math.max(0, rBg - inset);
						const rEnd = Math.sqrt(ratio) * rMax;
						const cyEnd = cyBg + (rMax - rEnd);

						const ringStart = line ? lineToRingDelay : 0;

						log("item calc", {
							index,
							end: endRaw,
							max,
							ratio,
							rBg,
							inset,
							rMax,
							rEnd,
							cyBg,
							cyEnd,
							ringStart,
						});

						itemTl.call(
							() => {
								try {
									item.dispatchEvent(new CustomEvent("cc:reveal", { bubbles: true }));
								} catch (e) {}

								helper_dispatchCountUp(item, component, {
									durationSec: 0.5,
									defaultDelaySec: 0,
								});
							},
							[],
							ringStart,
						);

						itemTl.to(
							dashCirc,
							{
								attr: { r: rEnd, cy: cyEnd },
								duration: ringDur,
								ease: "power2.out",
								overwrite: "auto",
							},
							ringStart,
						);
					}
				}

				const st = ScrollTrigger.create({
					trigger: item,
					start: "bottom bottom",
					invalidateOnRefresh: true,
					once,
					onEnter: () => {
						log("ScrollTrigger onEnter (item)", { component, index, item });
						revealItem(item, itemTl, index);
					},
					onRefresh: (self) => {
						if (log.enabled)
							log("ScrollTrigger onRefresh (item)", { progress: self.progress, component, index });
						if (self.progress > 0 || isPastBottomBottom(item)) revealItem(item, itemTl, index);
					},
				});

				sts.push(st);

				// Covers initial load where already past the trigger
				if (st.progress > 0 || isPastBottomBottom(item)) revealItem(item, itemTl, index);
			});

			component._ccCircleStats = { tl: null, st: null, sts };
		});

		ScrollTrigger.refresh();
	}

	function anim_scrollReveals() {
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
			ringsRoots.forEach((ringsRoot) => rings_setRingsInitial(ringsRoot));

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
							// Mark + emit a per-item reveal event so other animations (e.g. anim_textFadeIn)
							// can sync to the cc-reveal timing without creating extra ScrollTriggers.
							item.dataset.ccRevealDone = "1";
							try {
								item.dispatchEvent(new CustomEvent("cc:reveal", { bubbles: true }));
							} catch (e) {}

							helper_dispatchCountUp(item, group, { durationSec: duration }); // ✅ delayed dispatch
						},
					},
					t,
				);
			});

			ringsRoots.forEach((ringsRoot) => rings_addRingsToTimeline(tl, ringsRoot, 0));

			let revealed = false;
			let io = null;

			function isInRevealZone() {
				// Fallback for cases where ScrollTrigger start positions are stale due to lazy-loaded
				// content/layout shifts (common with carousels/images).
				// Matches the default start "top 75%" behavior.
				const rect = group.getBoundingClientRect();
				const vh = window.innerHeight || document.documentElement.clientHeight || 0;
				if (!vh) return false;
				return rect.top <= vh * 0.75 && rect.bottom >= 0;
			}

			const reveal = () => {
				if (revealed) return;
				revealed = true;
				group._ccRevealRevealed = true;
				if (io) {
					try {
						io.disconnect();
					} catch (e) {}
					io = null;
				}
				tl.play(0);
			};

			const st = ScrollTrigger.create({
				trigger: group,
				start,
				invalidateOnRefresh: true,
				once, // keep your existing once behavior
				onEnter: reveal,
				// ❌ remove onEnterBack restart; it causes the “fires as you scroll up/down” effect
				onRefresh: (self) => {
					// If we're already past the start when refreshed, reveal once.
					if (self.progress > 0 || isInRevealZone()) reveal();
				},
			});

			// Covers initial load where we're already past the trigger.
			// Also covers stale start positions where the section is visible but progress is 0.
			if (st.progress > 0 || isInRevealZone()) reveal();

			// Extra safety net: IntersectionObserver is resilient to layout shifts and
			// "hidden then shown" containers (tabs/filters) without needing a manual refresh.
			if (!revealed && typeof IntersectionObserver !== "undefined") {
				const rootMargin = group.getAttribute("data-cc-reveal-root-margin") || "0px 0px -25% 0px"; // approx "top 75%" start

				try {
					io = new IntersectionObserver(
						(entries) => {
							if (revealed) return;
							if (entries.some((e) => e.isIntersecting || e.intersectionRatio > 0)) reveal();
						},
						{ root: null, rootMargin, threshold: 0.01 },
					);
					io.observe(group);
				} catch (e) {
					io = null;
				}
			}
		});
		// ✅ helps when content/fonts/images cause layout shifts
		if (madeAny) ScrollTrigger.refresh();
	}

	function nav_dropdowns() {
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
		if (nav_dropdowns._mm) {
			nav_dropdowns._mm.kill();
			nav_dropdowns._mm = null;
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
		nav_dropdowns._mm = mm;

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
					0.01,
				);
				if (links.length) {
					tl.to(
						links,
						{
							autoAlpha: 1,
							duration: 0.2,
							stagger: 0.05,
						},
						0.05,
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

	function nav_open() {
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
		if (nav_open._mm) {
			nav_open._mm.kill();
			nav_open._mm = null;
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
				(el) => el && (el.tagName === "A" || el.tagName === "DIV"),
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
		nav_open._mm = mm;

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
				0,
			);

			tl.to(
				logo,
				{
					color: "var(--_color---blue--dark)",
					duration: 0.2,
					ease: "power1.out",
				},
				0,
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
					0.05,
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

	function anim_expandSolutionServiceTags() {
		const tagDefaultCount = 3;

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
					0,
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
					0.12,
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
		if (anim_expandSolutionServiceTags._onResize) {
			window.removeEventListener("resize", anim_expandSolutionServiceTags._onResize);
		}

		anim_expandSolutionServiceTags._onResize = debounce(() => {
			solCards.forEach((card) => {
				const tagsList = getTagsList(card);
				if (!tagsList) return;

				// On resize, don't animate; just ensure correct layout for current state
				if (card._tagsExpanded) expandCard(card, { animate: false });
				else collapseCard(card);
			});
		}, 150);

		window.addEventListener("resize", anim_expandSolutionServiceTags._onResize);
	}

	function c_solutionStackMbl() {
		return;
		const wrapper =
			document.querySelector(".sol-listing_pin") || document.querySelector(".sol-listing_main");
		if (!wrapper) return;

		// Kill previous init if this gets called more than once
		if (c_solutionStackMbl._mm) {
			c_solutionStackMbl._mm.kill();
			c_solutionStackMbl._mm = null;
		}

		const mm = gsap.matchMedia();
		c_solutionStackMbl._mm = mm;

		mm.add("(max-width: 767px)", () => {
			const cards = Array.from(wrapper.querySelectorAll(".sol-listing_list-item"));
			if (cards.length < 2) return;

			const DEBUG_SOL_STACK =
				localStorage.getItem("ccDebugSolStack") === "1" || window.__CC_DEBUG_SOL_STACK === true;

			// ----------------------------
			// Tuning
			// ----------------------------
			const SCALE_STEP = 0.06; // per "layer above"
			const MIN_SCALE = 0.72;

			// Background opacity (we fade the .sol-card_bg element)
			const OPACITY_STEP = 0.08; // per "layer above"
			const MIN_BG_OPACITY = 0.45;

			// Start trigger: top of card n+1 hits (pinOffset(n) + 0.75 * height(n))
			const START_FRACTION_FROM_TOP = 0.75;

			const lastCard = cards[cards.length - 1];

			const triggers = [];
			const timelines = [];

			const debounce = (fn, wait = 100) => {
				let t;
				return (...args) => {
					clearTimeout(t);
					t = setTimeout(() => fn(...args), wait);
				};
			};

			const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

			// nav height + 2rem (+ small per-card bump so pinned items don't sit on the exact same line)
			const getPinOffset = (i = 0) => {
				const nav = document.querySelector(".nav");
				const navH = nav ? nav.getBoundingClientRect().height : 0;
				const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize || "16") || 16;
				return Math.round(navH + 2 * remPx) + i * 10;
			};

			// Absolute top helper (stable for numeric start/end)
			const getScrollY = () => window.pageYOffset || document.documentElement.scrollTop || 0;

			const absTop = (el) => getScrollY() + el.getBoundingClientRect().top;

			// Stable heights (unscaled)
			let cardHeights = [];
			const calculateCardHeights = () => {
				cardHeights = cards.map((card) => card.offsetHeight);
			};
			calculateCardHeights();
			ScrollTrigger.addEventListener("refreshInit", calculateCardHeights);

			const ensure = (card) => {
				card._ccSolStack ||= {};
				return card._ccSolStack;
			};

			const getInner = (card) => {
				const s = ensure(card);
				if ("inner" in s) return s.inner;
				s.inner = card.querySelector(".sol-card") || null;
				return s.inner;
			};

			const getBg = (card) => {
				const s = ensure(card);
				if ("bg" in s) return s.bg;

				const bg = card.querySelector(".sol-card_bg");
				s.bg = bg || null;

				if (bg) {
					// Capture original inline opacity once
					if (s.origBgOpacity == null) s.origBgOpacity = bg.style.opacity || "";
					// Ensure we have a numeric base opacity to tween from
					const computed = getComputedStyle(bg).opacity;
					s.baseBgOpacity = Number.isFinite(parseFloat(computed)) ? parseFloat(computed) : 1;
				}

				return s.bg;
			};

			// Prep layering + transform origins
			cards.forEach((card, i) => {
				gsap.set(card, { zIndex: i + 1 });

				const inner = getInner(card);
				if (inner) gsap.set(inner, { transformOrigin: "50% 0%", willChange: "transform" });

				const bg = getBg(card);
				if (bg) gsap.set(bg, { willChange: "opacity" });
			});

			// ----------------------------
			// Pins (all but last)
			// ----------------------------
			cards.slice(0, -1).forEach((card, i) => {
				const st = ScrollTrigger.create({
					id: `ccSolStackPin_${i}`,
					trigger: card,
					start: () => `top top+=${getPinOffset(i)}`,
					endTrigger: lastCard,
					end: () => `top top+=${getPinOffset(i)}`, // release when LAST card reaches same offset line
					pin: true,
					pinSpacing: false,
					anticipatePin: 1,
					invalidateOnRefresh: true,
					refreshPriority: 1, // ✅ pins refresh first
					markers: DEBUG_SOL_STACK,
				});
				triggers.push(st);
			});

			// ----------------------------
			// Anim timelines (one per card except last)
			// ----------------------------
			// ✅ Key change:
			// Do NOT use nextCard as the trigger element, because nextCard gets pinned later.
			// Instead use numeric absolute start/end positions computed from element tops.
			cards.slice(0, -1).forEach((cardN, n) => {
				const nextCard = cards[n + 1];
				if (!nextCard) return;

				const inner = getInner(cardN);
				const bg = getBg(cardN);
				if (!inner && !bg) return;

				const maxLayersAbove = cards.length - 1 - n;

				const targetScale = clamp(1 - maxLayersAbove * SCALE_STEP, MIN_SCALE, 1);
				const baseOpacity = ensure(cardN).baseBgOpacity ?? 1;
				const targetOpacity = clamp(
					baseOpacity - maxLayersAbove * OPACITY_STEP,
					MIN_BG_OPACITY,
					baseOpacity,
				);

				// Ensure deterministic start state
				if (inner) gsap.set(inner, { scale: 1 });
				if (bg) gsap.set(bg, { opacity: baseOpacity });

				const tl = gsap.timeline({
					defaults: { ease: "none" },
					scrollTrigger: {
						id: `ccSolStackAnim_${n}`,
						trigger: wrapper, // ✅ stable trigger

						start: () => {
							const h = cardHeights[n] || cardN.offsetHeight || 0;
							const line = getPinOffset(n) + START_FRACTION_FROM_TOP * h;

							// When nextCard.top (viewport) == line,
							// scrollY == absTop(nextCard) - line
							const s = Math.round(absTop(nextCard) - line);
							return s;
						},

						endTrigger: lastCard,
						end: () => {
							// When lastCard.top (viewport) == getPinOffset(n),
							// scrollY == absTop(lastCard) - getPinOffset(n)
							let e = Math.round(absTop(lastCard) - getPinOffset(n));

							// Safety: never allow end <= start (kills scrub / freezes)
							const st = tl.scrollTrigger;
							const s = st ? st.start : e - 1;
							if (e <= s) e = s + 1;

							return e;
						},

						scrub: 0.4,
						invalidateOnRefresh: true,
						refreshPriority: -1, // ✅ anim triggers refresh after pins
						markers: DEBUG_SOL_STACK,
					},
				});

				if (inner) tl.to(inner, { scale: targetScale }, 0);
				if (bg) tl.to(bg, { opacity: targetOpacity }, 0);

				timelines.push(tl);
				triggers.push(tl.scrollTrigger);

				// debug hook if you want it
				if (window.clearclick) window.clearclick.timelines = timelines;
			});

			// ----------------------------
			// Refresh handling (service-tag expand / resize)
			// ----------------------------
			const refresh = debounce(() => ScrollTrigger.refresh(), 120);

			const onClick = (e) => {
				if (!e.target.closest(".sol-card_services-more")) return;
				setTimeout(refresh, 600);
			};
			wrapper.addEventListener("click", onClick);

			let ro = null;
			if (typeof ResizeObserver !== "undefined") {
				ro = new ResizeObserver(() => refresh());
				cards.forEach((c) => ro.observe(c));
			}

			// Extra-safe: refresh after full load too (images/fonts/layout shifts)
			const onLoad = () => ScrollTrigger.refresh();
			window.addEventListener("load", onLoad, { once: true });

			requestAnimationFrame(() => ScrollTrigger.refresh());

			// ----------------------------
			// Cleanup
			// ----------------------------
			return () => {
				wrapper.removeEventListener("click", onClick);
				window.removeEventListener("load", onLoad);
				if (ro) ro.disconnect();

				ScrollTrigger.removeEventListener("refreshInit", calculateCardHeights);

				triggers.forEach((st) => st?.kill?.());
				timelines.forEach((t) => t?.kill?.());

				cards.forEach((card) => {
					gsap.set(card, { clearProps: "zIndex" });

					const s = card._ccSolStack;
					if (!s) return;

					if (s.inner) gsap.set(s.inner, { clearProps: "transform,transformOrigin,willChange" });

					if (s.bg) {
						s.bg.style.opacity = s.origBgOpacity || "";
						gsap.set(s.bg, { clearProps: "willChange" });
					}

					delete card._ccSolStack;
				});
			};
		});
	}

	function c_timeline() {
		const log = createDebugLog("timeline");

		const timelineSections = Array.from(document.querySelectorAll(".c-timeline"));
		if (!timelineSections.length) {
			return;
		}
		log("Found timeline sections:", timelineSections.length);

		timelineSections.forEach((section) => {
			const items = Array.from(section.querySelectorAll(".c-timeline-item"));
			const line = section.querySelector(".timeline_line");
			if (line) {
				gsap.set(line, { scaleY: 0, transformOrigin: "top center" });
				gsap.to(line, {
					scrollTrigger: {
						trigger: items[0],
						start: "top 80%",
						endTrigger: items[items.length - 1],
						end: "bottom bottom",
						scrub: 5,
					},
					scaleY: 1,
					ease: "linear",
				});
			}

			log("Animating timeline items:", items.length);

			items.forEach((item, index) => {
				const circle = item.querySelector(".timeline-item_circle");
				const content = item.querySelector(".timeline-item_content");
				const title = item.querySelector("h3");
				const body = item.querySelector("p");

				const tl = gsap.timeline({
					scrollTrigger: {
						trigger: item,
						start: "top 80%",
						toggleActions: "play none none none",
					},
				});
				tl.from(circle, {
					scale: 0,
					opacity: 0,
					duration: 0.6,
					ease: "power1.inOut",
				});
				tl.from(
					title,
					{
						y: 10,
						opacity: 0,
						duration: 0.8,
						ease: "power1.inOut",
					},
					"<+0.25",
				);
				tl.from(
					body,
					{
						y: 8,
						opacity: 0,
						duration: 0.8,
						ease: "power1.inOut",
					},
					"<+0.05",
				);
			});
		});
	}

	function c_colStats() {
		const colStatsSections = gsap.utils.toArray(".c-stat-cols");
		if (!colStatsSections.length) return;

		const log = createDebugLog("colStats");

		colStatsSections.forEach((section) => {
			const stats = gsap.utils.toArray(".col-stat", section);
			log("Found col-stats items:", stats.length);

			const tl = gsap.timeline({
				scrollTrigger: {
					trigger: section,
					start: "top 40%",
					toggleActions: "play none none none",
				},
			});
			stats.forEach((stat, index) => {
				const number = stat.querySelector(".col-stat_stat"); // code component wrapper
				const bg = stat.querySelector(".circle-stat_svg-bg"); // bg circle
				const line1 = stat.querySelector(".col-stat_svg-side.is-1 line"); // left horizontal line
				const line2 = stat.querySelector(".col-stat_svg-side.is-2 line"); // right horizontal line
				const arcBottom = stat.querySelector(".col-stat_svg-arc.is-bottom"); // dashed arcs
				const arcTop = stat.querySelector(".col-stat_svg-arc.is-top"); // dashed arcs
				const title = stat.querySelector(".col-stat_title"); // title
				const body = stat.querySelector(".col-stat_body"); // body text

				// for first stat, don't do line1 anim, and for last stat, don't do line2 anim

				gsap.set(bg, { transformOrigin: "50% 50%" });
				// gsap.set([line1, line2, ...arcs], { drawSVG: "0%" });

				// if (index !== 0) {
				// 	tl.from(
				// 		line1,
				// 		{
				// 			x2: 0,
				// 			duration: 0.6,
				// 			ease: "power1.inOut",
				// 		},
				// 		"<",
				// 	);
				// }
				tl.from(
					arcBottom,
					{
						attr: {
							d: "M1 50 a 49 49 0 1 0 0 0",
						},
						duration: 0.8,
						ease: "power1.inOut",
					},
					">-0.1",
				);
				// tl.from(
				// 	arcTop,
				// 	{
				// 		attr: {
				// 			d: "M1 50 a 49 49 0 0 0 1 0 0",
				// 		},
				// 		duration: 0.8,
				// 		ease: "power1.inOut",
				// 	},
				// 	">-0.1",
				// );
				// if (index !== stats.length - 1) {
				// 	tl.to(
				// 		line2,
				// 		{
				// 			drawSVG: "100%",
				// 			duration: 0.6,
				// 			ease: "power1.inOut",
				// 		},
				// 		">-0.1",
				// 	);
				// }
				tl.from(
					bg,
					{
						scale: 0.9,
						opacity: 0,
						duration: 0.6,
						ease: "power1.inOut",
					},
					0,
				);
				// fire count-up event when number is revealed
				tl.add(() => {
					helper_dispatchCountUp(number, "colStatRevealed", {
						durationSec: 0.6,
						defaultDelaySec: 0.2,
					});
				}, ">-0.4");
				tl.from(
					title,
					{
						y: 10,
						opacity: 0,
						duration: 0.8,
						ease: "power1.inOut",
					},
					"<+0.25",
				);
				tl.from(
					body,
					{
						y: 8,
						opacity: 0,
						duration: 0.8,
						ease: "power1.inOut",
					},
					"<+0.05",
				);
			});
		});
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
								c_solutionTabs();
								c_simpleTabs();
								anim_scrollReveals();
								c_caseStudiesSimpleCarousel();
								c_solsCarousel();
								anim_expandSolutionServiceTags();
							}, 0),
						);
					}

					// if the instance exposes an event emitter style API, support that too
					if (typeof inst.on === "function") {
						inst.on(
							"renderitems",
							debounce(() => {
								c_solutionTabs();
								c_simpleTabs();
								anim_scrollReveals();
								c_caseStudiesSimpleCarousel();
								c_solsCarousel();
								anim_expandSolutionServiceTags();
							}, 0),
						);
					}
				});

				// run once when FS list is ready
				c_solutionTabs();
				c_simpleTabs();
				anim_scrollReveals();
				c_caseStudiesSimpleCarousel();
				c_solsCarousel();
				anim_expandSolutionServiceTags();
			},
		]);
	}

	// --------- HELPERS  ----------

	function debounce(fn, wait = 100) {
		let t;
		return (...args) => {
			clearTimeout(t);
			t = setTimeout(() => fn(...args), wait);
		};
	}

	/* DEBUG LOGGING UTILITY */
	// to enable, set localStorage key "ccDebug[Name]" to "1" with the following command:
	// localStorage.setItem("ccDebug[Name]", "1");
	function createDebugLog(prefix, defaultPrefix = "clearclick") {
		let enabled = false;
		try {
			enabled = localStorage.getItem(`ccDebug[${prefix}]`) === "1";
			// console.log("[clearclick] Debug log", prefix, "enabled:", enabled);
		} catch (e) {
			enabled = false;
		}

		const tag = prefix ? `[${prefix}]` : `[${defaultPrefix}]`;

		const log = (...args) => {
			if (!enabled) return;
			console.log(tag, ...args);
		};

		log.enabled = enabled;

		return log;
	}

	function helper_fireEventWithRetry(eventName, detail, { maxMs = 2500, intervalMs = 120 } = {}) {
		if (!eventName) return;
		const startedAt = performance.now();

		const fire = () => {
			try {
				window.dispatchEvent(new CustomEvent(eventName, { detail }));
			} catch (e) {}
		};

		// immediate + next frame
		fire();
		requestAnimationFrame(fire);

		// keep trying for a bit (covers slow mount)
		const timer = setInterval(() => {
			fire();
			if (performance.now() - startedAt >= maxMs) clearInterval(timer);
		}, intervalMs);
	}

	function helper_dispatchCountUp(
		item,
		trigger,
		{ durationSec, defaultDelaySec, maxMs = 2500, intervalMs = 120 } = {},
	) {
		if (!item) return;

		const log = createDebugLog("countup");

		// Support either:
		// - the item itself having data-motion-countup-event
		// - a child element having data-motion-countup-event
		const el = item.querySelector("[data-motion-countup-event]");
		const eventEl = item.hasAttribute?.("data-motion-countup-event") ? item : el;
		const eventName = eventEl?.getAttribute?.("data-motion-countup-event")?.trim();
		if (!eventName) return;

		if (log.enabled) {
			// eslint-disable-next-line no-console
			log("dispatch scheduled", { item, eventName });
		}

		// Optional override per element:
		// <div data-motion-countup-event="..." data-motion-countup-delay="0.3"></div>
		const overrideDelaySec = parseFloat(eventEl?.getAttribute("data-motion-countup-delay") || "");
		const delaySec = Number.isFinite(overrideDelaySec)
			? overrideDelaySec
			: Number.isFinite(defaultDelaySec)
				? defaultDelaySec
				: Math.max(0, (durationSec || 0) * 0.5);

		// Prevent duplicate timers if something re-inits quickly
		if (item._ccCountupTimeout) clearTimeout(item._ccCountupTimeout);

		item._ccCountupTimeout = setTimeout(
			() => {
				helper_fireEventWithRetry(eventName, { trigger, item }, { maxMs, intervalMs });
				item._ccCountupTimeout = null;
			},
			Math.round(Math.max(0, delaySec) * 1000),
		);
	}

	// --------- shared ring animation (used across site) ----------
	function rings_getRingsFromSvg(svg) {
		if (!svg) return null;
		const ringA = svg.querySelector(".ring-a");
		const ringB = svg.querySelector(".ring-b");
		const ringC = svg.querySelector(".ring-c");
		if (!ringA || !ringB || !ringC) return null;
		return { ringA, ringB, ringC };
	}

	function rings_setRingsInitial(svgOrRootEl) {
		const svg =
			svgOrRootEl?.tagName?.toLowerCase() === "svg"
				? svgOrRootEl
				: svgOrRootEl?.querySelector?.("svg");
		const rings = rings_getRingsFromSvg(svg);
		if (!rings) return;

		gsap.set([rings.ringA, rings.ringB, rings.ringC], {
			opacity: 0,
			scale: 0.85,
			transformOrigin: "50% 50%",
		});
	}

	function rings_addRingsToTimeline(tl, svgOrRootEl, position = "<") {
		const svg =
			svgOrRootEl?.tagName?.toLowerCase() === "svg"
				? svgOrRootEl
				: svgOrRootEl?.querySelector?.("svg");
		const rings = rings_getRingsFromSvg(svg);
		if (!rings) return;

		// Match buildPanelTimeline ring feel
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
			position,
		);
	}

	/* general catch for GSAP */
	if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
		console.warn("[clearclick] GSAP/ScrollTrigger not found");
		return;
	}
	/* general catch for Embla */
	if (typeof EmblaCarousel === "undefined") {
		console.warn("[clearclick] EmblaCarousel not found");
		return;
	}

	anim_homeHeroCorners();
	nav_hideShow();
	nav_open();
	nav_dropdowns();
	anim_logoStaggers();
	c_latestCarousel();
	c_introStats();
	c_approachCarousel();
	c_caseStudiesCarousel();
	c_caseStudiesSimpleCarousel();
	c_solsCarousel();
	c_orbit();
	c_timeline();

	anim_scrollReveals();
	anim_expandSolutionServiceTags();
	c_solutionStackMbl();

	// wait for fonts to load before animating text
	document.fonts.ready.then(() => {
		document.body.classList.add("fonts-loaded");
		anim_textFadeIn();
		c_circleStats();
		c_colStats();
	});

	hookFinsweetRenders();
	c_solutionTabs();
	c_simpleTabs();
}

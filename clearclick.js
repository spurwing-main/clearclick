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
			"(min-width: 992px) and (min-height: 960px)": () => {
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
			"(min-width: 992px) and (max-height: 959px)": () => {
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

				const getMaxX = () => {
					const trackRect = track.getBoundingClientRect();
					const containerRect = orbitEl.getBoundingClientRect();
					const overflow = track.scrollWidth - containerRect.width;
					return overflow > 0 ? -overflow : 0;
				};

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

				tl.to(track, {
					x: () => getMaxX(),
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
		if (!header || !subtitle || !body || !footer || !services) return null;

		const svg = pane.querySelector(".tab-services_graphic");
		if (!svg) return null;

		const ringA = svg.querySelector(".tab-services-ring-a");
		const ringB = svg.querySelector(".tab-services-ring-b");
		const ringC = svg.querySelector(".tab-services-ring-c");
		if (!ringA || !ringB || !ringC) return null;

		// Reset state each time so replay is consistent
		gsap.set([ringA, ringB, ringC], { opacity: 0, scale: 0.85 });
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
		tl.to(
			[ringC, ringB, ringA],
			{
				opacity: 1,
				scale: 1,
				duration: 1,
				ease: "power2.out",
				stagger: 0.5,
				overwrite: "auto",
			},
			"<"
		);
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
							debounce(() => initAllTabs(), 0)
						);
					}

					// if the instance exposes an event emitter style API, support that too
					if (typeof inst.on === "function") {
						inst.on(
							"renderitems",
							debounce(() => initAllTabs(), 0)
						);
					}
				});

				// run once when FS list is ready
				initAllTabs();
			},
		]);
	}

	hideShowNav();
	logoStaggers();
	latestCarousel();
	caseStudiesCarousel();
	orbit();

	// wait for fonts to load before animating text
	document.fonts.ready.then(() => {
		document.body.classList.add("fonts-loaded");
		animTextFadeIn();
		initMotionCounters();
	});

	hookFinsweetRenders();
	initAllTabs();
}

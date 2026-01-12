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
					end: "bottom 50%",
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
		emblaThumb.on("init", syncThumbs);

		// Initial sync
		syncThumbs();

		emblaThumb.on("init", updateThumbLayout);
		emblaThumb.on("reInit", updateThumbLayout);
		window.addEventListener("resize", updateThumbLayout);

		emblaMain.on("init", updateMainSlideStates);
		emblaMain.on("select", updateMainSlideStates);
		emblaMain.on("reInit", updateMainSlideStates);

		// Initial run
		updateMainSlideStates();
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
							}, 0)
						);
					}
				});

				// run once when FS list is ready
				initAllTabs();
				initScrollReveals();
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

			function dispatchCountUpForItem(item, group) {
				const el = item.querySelector("[data-motion-countup-event]");
				const eventName = el?.getAttribute("data-motion-countup-event")?.trim();
				if (!eventName) return;

				fireEventWithRetry(eventName, { trigger: group, item });
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
						onStart: () => dispatchCountUpForItem(item, group),
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
				if (data?.tl) data.tl.reverse();
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

				// Closed baseline
				gsap.set(list, { display: "none" });
				gsap.set(mmPanel, { backgroundColor: "transparent" });
				if (links.length) gsap.set(links, { autoAlpha: 0 });

				const tl = gsap.timeline({
					paused: true,
					defaults: { ease: "power1.out" },
					onReverseComplete: () => {
						gsap.set(list, { display: "none" });
					},
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

				dd._ccNavDd = { tl, mode: "desktop" };

				const onEnter = () => {
					closeAll(dd);
					dd.classList.add("is-open");
					tl.play(0);
				};

				const onLeave = () => {
					// Keep pinned dropdown open while you debug
					if (keepOpen) return;

					dd.classList.remove("is-open", "nav_dd--debug-open");
					tl.reverse();
				};

				addListener(dd, "pointerenter", onEnter, unsubs);
				addListener(dd, "pointerleave", onLeave, unsubs);

				// If debug pinned, open immediately and mark it
				if (keepOpen) {
					dd.classList.add("is-open", "nav_dd--debug-open");
					tl.play(0);
				}
			});

			return () => {
				unsubs.forEach((fn) => fn());
				dropdowns.forEach((dd) => {
					dd.classList.remove("is-open", "nav_dd--debug-open");
					if (dd._ccNavDd?.mode === "desktop") {
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

				dd._ccNavDd = { tl, mode: "mobile" };

				const onClick = (e) => {
					if (toggle.tagName === "A") e.preventDefault();

					const isOpen = dd.classList.contains("is-open");

					if (isOpen) {
						dd.classList.remove("is-open");
						tl.reverse();
					} else {
						// mobile stays normal (no debug pin here)
						dropdowns.forEach((other) => {
							if (other === dd) return;
							other.classList.remove("is-open");
							other._ccNavDd?.tl?.reverse();
						});

						dd.classList.add("is-open");
						tl.play(0);
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
		const solCards = Array.from(document.querySelectorAll(".sol-card"));
		if (!solCards.length) return;

		function getTagsList(card) {
			return card.querySelector(".sol-card_services-list");
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
	caseStudiesCarousel();
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

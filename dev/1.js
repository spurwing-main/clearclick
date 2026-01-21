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

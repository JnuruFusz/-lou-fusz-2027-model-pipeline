/**
 * Orbital Product Carousel
 * Standalone prototype — HTML / CSS / vanilla JS
 *
 * Stage map:
 * 1 Positioning  2 Rotation  3 Drag/touch/wheel
 * 4 Depth        5 Snap      6 Inertia
 * 7 Active info  8 Responsive 9 Polish
 */

(() => {
  "use strict";

  // ---------------------------------------------------------------------------
  // Configuration — tune these to change the feel
  // ---------------------------------------------------------------------------
  const CONFIG = {
    /** Orbit radius as a fraction of the stage's shorter side */
    radius: 0.38,

    /** How much horizontal drag (px) maps into radians */
    dragSensitivity: 0.0055,

    /** How much wheel/trackpad delta maps into radians */
    wheelSensitivity: 0.0018,

    /**
     * How quickly rotation eases toward the snap target (0–1 per frame at 60fps).
     * Lower = softer cinematic settle. Higher = snappier.
     */
    snapStrength: 0.08,

    /**
     * Multiplier applied to residual drag velocity on release (0–1).
     * Keep low for controlled, premium feel.
     */
    inertia: 0.55,

    /** Base visual scale of an item at the front (depth = 1) */
    productScale: 1.05,

    /** Smallest scale allowed at the back of the orbit */
    minimumScale: 0.42,

    /** Lowest opacity for back-facing products */
    minimumOpacity: 0.28,

    /**
     * Continuous auto-rotation in radians per second.
     * 0 disables. Pauses while dragging / hovering (desktop).
     */
    autoRotateSpeed: 0.12,

    /** Vertical squash of the circle → ellipse (1 = perfect circle) */
    verticalScale: 0.42,

    /** Velocity damping each frame after release, before snap engages */
    inertiaDamping: 0.94,

    /** Below this |velocity| (radians / frame @60fps), inertia ends and snap takes over */
    snapVelocityThreshold: 0.0012,

    /** Max |velocity| after release — prevents wild spins */
    maxReleaseVelocity: 0.05,

    /** Pointer travel (px) before a gesture counts as a drag, not a click */
    clickDragThreshold: 8,
  };

  // ---------------------------------------------------------------------------
  // Placeholder product data — later replaced by Shopify Liquid product data
  // ---------------------------------------------------------------------------
  const PRODUCTS = [
    {
      id: "hoodie-ash",
      name: "Ash Oversized Hoodie",
      price: "$128",
      url: "#hoodie-ash",
      image: "assets/product-hoodie.png",
    },
    {
      id: "tee-signal",
      name: "Signal Heavy Tee",
      price: "$58",
      url: "#tee-signal",
      image: "assets/product-tee.png",
    },
    {
      id: "pants-line",
      name: "Line Cropped Pants",
      price: "$148",
      url: "#pants-line",
      image: "assets/product-pants.png",
    },
    {
      id: "jacket-shell",
      name: "Shell Utility Jacket",
      price: "$248",
      url: "#jacket-shell",
      image: "assets/product-jacket.png",
    },
    {
      id: "cap-field",
      name: "Field Soft Cap",
      price: "$42",
      url: "#cap-field",
      image: "assets/product-cap.png",
    },
  ];

  // ---------------------------------------------------------------------------
  // Math helpers
  // ---------------------------------------------------------------------------

  /** Wrap any angle into [-π, π] so distance comparisons stay stable. */
  function normalizeAngle(angle) {
    const tau = Math.PI * 2;
    return ((((angle + Math.PI) % tau) + tau) % tau) - Math.PI;
  }

  /**
   * Angular spacing between evenly distributed products.
   * With 5 items: step = 2π / 5 ≈ 72°.
   */
  function angleStep(count) {
    return (Math.PI * 2) / count;
  }

  /**
   * World angle for product `index` given current carousel rotation.
   * θ = 0 places the product at the front (bottom of the ellipse).
   */
  function productAngle(index, rotation, count) {
    return rotation + index * angleStep(count);
  }

  /**
   * Convert polar angle → cartesian offset from stage center.
   *
   *   x = sin(θ) * radius
   *   y = cos(θ) * radius * verticalScale
   *
   * At θ = 0:    x = 0,  y = +R·v  → front / bottom (CSS +Y is down)
   * At θ = π:    x = 0,  y = -R·v  → back / top
   * At θ = ±π/2: left / right extremes
   */
  function polarToCartesian(theta, radius, verticalScale) {
    return {
      x: Math.sin(theta) * radius,
      y: Math.cos(theta) * radius * verticalScale,
    };
  }

  /**
   * Depth in [0, 1]. Uses cos(θ):
   *   front (θ ≈ 0) → 1
   *   back  (θ ≈ π) → 0
   * Soft power keeps mid-orbit falloff gradual (no hard state jumps).
   */
  function depthFromAngle(theta) {
    const linear = (Math.cos(theta) + 1) / 2;
    return Math.pow(linear, 0.85);
  }

  function scaleFromDepth(depth, productScale, minimumScale) {
    return minimumScale + (productScale - minimumScale) * depth;
  }

  function opacityFromDepth(depth, minimumOpacity) {
    return minimumOpacity + (1 - minimumOpacity) * depth;
  }

  function zIndexFromDepth(depth) {
    return Math.round(depth * 1000);
  }

  /**
   * Find the product whose current angle is closest to the front (θ = 0).
   * Returns the index and the rotation that would place that product at front.
   */
  function nearestProduct(rotation, count) {
    let bestIndex = 0;
    let bestDelta = Infinity;

    for (let i = 0; i < count; i += 1) {
      const theta = normalizeAngle(productAngle(i, rotation, count));
      // Front is θ = 0, so the smallest |θ| wins.
      if (Math.abs(theta) < Math.abs(bestDelta)) {
        bestDelta = theta;
        bestIndex = i;
      }
    }

    // Subtracting the product's current θ brings it to 0.
    return {
      index: bestIndex,
      targetRotation: rotation - bestDelta,
    };
  }

  // ---------------------------------------------------------------------------
  // DOM bootstrap
  // ---------------------------------------------------------------------------
  const orbit = document.getElementById("orbit");
  const stage = document.getElementById("orbitStage");
  const ring = document.getElementById("orbitRing");
  const activeName = document.getElementById("activeName");
  const activePrice = document.getElementById("activePrice");
  const activeCta = document.getElementById("activeCta");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = PRODUCTS.length;

  /** @type {HTMLButtonElement[]} */
  const items = PRODUCTS.map((product, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "orbit__item";
    btn.dataset.index = String(index);
    btn.dataset.id = product.id;
    btn.setAttribute("aria-label", `${product.name}, ${product.price}`);
    btn.innerHTML = `
      <span class="orbit__item-media">
        <img src="${product.image}" alt="" draggable="false" />
      </span>
    `;
    ring.appendChild(btn);
    return btn;
  });

  // ---------------------------------------------------------------------------
  // Runtime state
  // ---------------------------------------------------------------------------
  const state = {
    rotation: 0,
    velocity: 0,
    targetRotation: null,
    activeIndex: 0,
    dragging: false,
    pointerId: null,
    lastX: 0,
    dragDistance: 0,
    suppressClick: false,
    hovered: false,
    radiusPx: 0,
    itemSize: 180,
    frame: 0,
  };

  // ---------------------------------------------------------------------------
  // Layout / responsive radius — Stage 8
  // ---------------------------------------------------------------------------
  function measure() {
    const rect = stage.getBoundingClientRect();
    const shortSide = Math.min(rect.width, rect.height);
    let radiusFactor = CONFIG.radius;

    if (rect.width <= 640) radiusFactor = CONFIG.radius * 0.92;
    else if (rect.width <= 900) radiusFactor = CONFIG.radius * 0.96;

    state.radiusPx = shortSide * radiusFactor;

    if (rect.width <= 640) state.itemSize = 140;
    else if (rect.width <= 900) state.itemSize = 170;
    else state.itemSize = 210;

    items.forEach((el) => {
      el.style.setProperty("--item-size", `${state.itemSize}px`);
    });
  }

  // ---------------------------------------------------------------------------
  // Render — Stages 1 + 4
  // ---------------------------------------------------------------------------
  function render() {
    items.forEach((el, index) => {
      const theta = productAngle(index, state.rotation, count);
      const { x, y } = polarToCartesian(theta, state.radiusPx, CONFIG.verticalScale);
      const depth = depthFromAngle(theta);
      const scale = scaleFromDepth(depth, CONFIG.productScale, CONFIG.minimumScale);
      const opacity = opacityFromDepth(depth, CONFIG.minimumOpacity);
      const z = zIndexFromDepth(depth);
      const isActive = index === state.activeIndex;

      el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${scale})`;
      el.style.opacity = String(opacity);
      el.style.zIndex = String(z);
      el.classList.toggle("is-active", isActive);
      el.setAttribute("aria-current", isActive ? "true" : "false");
      el.tabIndex = isActive ? 0 : -1;
    });
  }

  // ---------------------------------------------------------------------------
  // Active product panel — Stage 7
  // ---------------------------------------------------------------------------
  function setActive(index, { updateTarget = false } = {}) {
    const next = ((index % count) + count) % count;
    state.activeIndex = next;

    const product = PRODUCTS[next];
    activeName.textContent = product.name;
    activePrice.textContent = product.price;
    activeCta.href = product.url;
    activeCta.setAttribute("aria-label", `View ${product.name}`);

    if (updateTarget) {
      // Rotate so this product's angle becomes 0 (front).
      const current = normalizeAngle(productAngle(next, state.rotation, count));
      state.targetRotation = state.rotation - current;
      state.velocity = 0;
    }
  }

  function syncActiveFromRotation() {
    const { index } = nearestProduct(state.rotation, count);
    if (index !== state.activeIndex) {
      setActive(index);
    }
  }

  function beginSnap() {
    state.targetRotation = nearestProduct(state.rotation, count).targetRotation;
    state.velocity = 0;
  }

  // ---------------------------------------------------------------------------
  // Animation loop — Stages 2, 5, 6 + auto-rotate
  // ---------------------------------------------------------------------------
  let lastFrameTime = performance.now();

  function tick(now) {
    const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;
    const frameScale = dt * 60;

    if (!state.dragging) {
      const spinning = Math.abs(state.velocity) > CONFIG.snapVelocityThreshold;

      if (spinning) {
        // Controlled inertia after release
        state.rotation += state.velocity * frameScale;
        state.velocity *= Math.pow(CONFIG.inertiaDamping, frameScale);

        if (Math.abs(state.velocity) <= CONFIG.snapVelocityThreshold) {
          beginSnap();
        }
      } else if (state.targetRotation != null) {
        // Ease toward snap / click / arrow target
        const delta = state.targetRotation - state.rotation;

        if (Math.abs(delta) < 0.0005) {
          state.rotation = state.targetRotation;
          state.targetRotation = null;
          state.velocity = 0;
        } else {
          const strength = reduceMotion
            ? 1
            : 1 - Math.pow(1 - CONFIG.snapStrength, frameScale);
          state.rotation += delta * strength;
        }
      } else if (
        !reduceMotion &&
        CONFIG.autoRotateSpeed !== 0 &&
        !state.hovered
      ) {
        // Idle glide — no snap while coasting
        state.rotation += CONFIG.autoRotateSpeed * dt;
      } else {
        // Hovering or auto-rotate off: settle on nearest product
        beginSnap();
      }
    }

    syncActiveFromRotation();
    render();
    state.frame = requestAnimationFrame(tick);
  }

  // ---------------------------------------------------------------------------
  // Pointer / touch drag — Stage 3
  // ---------------------------------------------------------------------------
  function onPointerDown(event) {
    if (event.button != null && event.button !== 0) return;
    if (event.target.closest(".orbit__nav") || event.target.closest(".orbit__active-cta")) {
      return;
    }

    state.dragging = true;
    state.pointerId = event.pointerId;
    state.lastX = event.clientX;
    state.dragDistance = 0;
    state.suppressClick = false;
    state.velocity = 0;
    state.targetRotation = null;
    orbit.classList.add("is-dragging");

    try {
      orbit.setPointerCapture(event.pointerId);
    } catch (_) {
      /* ignore */
    }
  }

  function onPointerMove(event) {
    if (!state.dragging || event.pointerId !== state.pointerId) return;

    const dx = event.clientX - state.lastX;
    state.dragDistance += Math.abs(dx);

    // Wait until movement clears the click threshold so tiny jitter
    // does not steal click-to-focus or start a micro-drag.
    if (state.dragDistance <= CONFIG.clickDragThreshold) {
      state.lastX = event.clientX;
      return;
    }

    state.suppressClick = true;

    // Dragging right rotates products clockwise around the orbit.
    const delta = dx * CONFIG.dragSensitivity;
    state.rotation += delta;

    // Store per-frame angular velocity for inertia on release.
    state.velocity = delta;
    state.lastX = event.clientX;
  }

  function endDrag(event) {
    if (!state.dragging) return;
    if (event && state.pointerId != null && event.pointerId !== state.pointerId) return;

    const wasClick = state.dragDistance <= CONFIG.clickDragThreshold;
    const clientX = event && event.clientX != null ? event.clientX : state.lastX;
    const clientY = event && event.clientY != null ? event.clientY : null;

    state.dragging = false;
    state.pointerId = null;
    orbit.classList.remove("is-dragging");

    // Click / tap on a product: focus that item (pointer capture can
    // swallow the subsequent click event in some browsers).
    if (wasClick && clientY != null) {
      const hit = document
        .elementFromPoint(clientX, clientY)
        ?.closest(".orbit__item");

      if (hit) {
        const index = Number(hit.dataset.index);
        setActive(index, { updateTarget: true });
        state.suppressClick = true;
        return;
      }

      beginSnap();
      return;
    }

    state.velocity *= CONFIG.inertia;
    state.velocity = Math.max(
      -CONFIG.maxReleaseVelocity,
      Math.min(CONFIG.maxReleaseVelocity, state.velocity)
    );

    if (Math.abs(state.velocity) <= CONFIG.snapVelocityThreshold) {
      beginSnap();
    } else {
      state.targetRotation = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Wheel / trackpad — Stage 3
  // ---------------------------------------------------------------------------
  function onWheel(event) {
    event.preventDefault();
    state.targetRotation = null;

    const delta = event.deltaY * CONFIG.wheelSensitivity;
    state.rotation += delta;
    state.velocity = Math.max(
      -CONFIG.maxReleaseVelocity,
      Math.min(CONFIG.maxReleaseVelocity, delta * CONFIG.inertia)
    );

    if (Math.abs(state.velocity) <= CONFIG.snapVelocityThreshold) {
      beginSnap();
    }
  }

  // ---------------------------------------------------------------------------
  // Click product / arrows
  // ---------------------------------------------------------------------------
  function onItemClick(event) {
    // Selection is handled in pointerup when we owned the gesture.
    // Keep this as a keyboard / fallback path.
    if (state.suppressClick) {
      state.suppressClick = false;
      event.preventDefault();
      return;
    }

    const index = Number(event.currentTarget.dataset.index);
    setActive(index, { updateTarget: true });
  }

  function goBy(direction) {
    const next = state.activeIndex + direction;
    setActive(next, { updateTarget: true });
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  function bind() {
    orbit.addEventListener("pointerdown", onPointerDown);
    orbit.addEventListener("pointermove", onPointerMove);
    orbit.addEventListener("pointerup", endDrag);
    orbit.addEventListener("pointercancel", endDrag);

    orbit.addEventListener("wheel", onWheel, { passive: false });

    orbit.addEventListener("mouseenter", () => {
      state.hovered = true;
    });
    orbit.addEventListener("mouseleave", () => {
      state.hovered = false;
      if (state.dragging) endDrag();
    });

    items.forEach((el) => {
      el.addEventListener("click", onItemClick);
    });

    prevBtn.addEventListener("click", () => goBy(-1));
    nextBtn.addEventListener("click", () => goBy(1));

    window.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goBy(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goBy(1);
      }
    });

    window.addEventListener("resize", () => {
      measure();
      render();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        beginSnap();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Boot
  // ---------------------------------------------------------------------------
  function init() {
    measure();
    setActive(0);
    state.rotation = 0;
    render();
    bind();
    lastFrameTime = performance.now();
    state.frame = requestAnimationFrame(tick);
  }

  init();

  // Expose for console tuning / future Shopify wiring
  window.OrbitalCarousel = {
    CONFIG,
    PRODUCTS,
    getState: () => ({ ...state }),
    goTo: (index) => setActive(index, { updateTarget: true }),
  };
})();

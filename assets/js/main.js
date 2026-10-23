/* FKTD theme — interactions & animations (no dependencies) */
(function () {
	'use strict';

	var d = document, w = window, root = d.documentElement;
	var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var cfg = w.FKTD || {};
	function $$(s, ctx) { return Array.prototype.slice.call((ctx || d).querySelectorAll(s)); }

	/* ---------- Header state + scroll progress ---------- */
	var header = d.querySelector('.site-header');
	var bar = d.querySelector('.progress__bar');
	var floatBtn = d.querySelector('.js-float');
	var footer = d.querySelector('.site-footer');
	var ticking = false;
	function onScroll() {
		var y = w.scrollY || w.pageYOffset;
		if (header) header.classList.toggle('is-scrolled', y > 12);
		if (bar) {
			var h = root.scrollHeight - w.innerHeight;
			bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(y / h, 1) : 0) + ')';
		}
		if (floatBtn) {
			var nearFooter = footer && footer.getBoundingClientRect().top < w.innerHeight - 40;
			floatBtn.classList.toggle('is-visible', y > 700 && !nearFooter);
		}
		timeline();
		ticking = false;
	}
	w.addEventListener('scroll', function () {
		if (!ticking) { w.requestAnimationFrame(onScroll); ticking = true; }
	}, { passive: true });

	/* ---------- Desktop dropdowns (touch / keyboard) ---------- */
	$$('.nav .has-dd > .nav-link').forEach(function (a) {
		a.addEventListener('click', function (e) {
			var li = a.parentNode;
			// On touch devices first tap opens the panel.
			if (w.matchMedia('(hover: none)').matches && !li.classList.contains('is-open')) {
				e.preventDefault();
				$$('.nav .has-dd.is-open').forEach(function (x) { x.classList.remove('is-open'); });
				li.classList.add('is-open');
				a.setAttribute('aria-expanded', 'true');
			}
		});
	});
	d.addEventListener('click', function (e) {
		if (!e.target.closest('.nav')) {
			$$('.nav .has-dd.is-open').forEach(function (x) { x.classList.remove('is-open'); });
		}
	});
	d.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') {
			$$('.has-dd.is-open').forEach(function (x) { x.classList.remove('is-open'); });
			closeDrawer();
		}
	});

	/* ---------- Mobile drawer ---------- */
	var burger = d.querySelector('.js-burger');
	var drawer = d.getElementById('drawer');
	function openDrawer() {
		root.classList.add('drawer-open'); d.body.classList.add('drawer-open');
		if (burger) burger.setAttribute('aria-expanded', 'true');
		if (drawer) drawer.setAttribute('aria-hidden', 'false');
	}
	function closeDrawer() {
		root.classList.remove('drawer-open'); d.body.classList.remove('drawer-open');
		if (burger) burger.setAttribute('aria-expanded', 'false');
		if (drawer) drawer.setAttribute('aria-hidden', 'true');
	}
	if (burger) burger.addEventListener('click', function () {
		d.body.classList.contains('drawer-open') ? closeDrawer() : openDrawer();
	});
	$$('.js-drawer-close').forEach(function (el) { el.addEventListener('click', closeDrawer); });
	$$('.drawer-menu .has-dd > .nav-link').forEach(function (a) {
		a.addEventListener('click', function (e) {
			e.preventDefault();
			a.parentNode.classList.toggle('is-open');
		});
	});
	$$('.drawer a').forEach(function (a) {
		if (!a.parentNode.classList.contains('has-dd')) a.addEventListener('click', closeDrawer);
	});

	/* ---------- Counters ---------- */
	function fmt(n, dec, lang) {
		var s = n.toFixed(dec);
		var parts = s.split('.');
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'en' ? ',' : ' ');
		return parts.join(lang === 'en' ? '.' : ',');
	}
	function count(el) {
		var target = parseFloat(el.getAttribute('data-count'));
		if (isNaN(target)) return;
		var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
		var pre = el.getAttribute('data-prefix') || '';
		var suf = el.getAttribute('data-suffix') || '';
		var lang = cfg.lang || 'ru';
		if (reduce) { el.textContent = pre + fmt(target, dec, lang) + suf; return; }
		var dur = 1800, t0 = null;
		function step(t) {
			if (!t0) t0 = t;
			var p = Math.min((t - t0) / dur, 1);
			var e = 1 - Math.pow(1 - p, 4);
			el.textContent = pre + fmt(target * e, dec, lang) + suf;
			if (p < 1) w.requestAnimationFrame(step);
		}
		w.requestAnimationFrame(step);
	}

	/* ---------- Reveal on scroll ---------- */
	var revealSel = '[data-reveal], .js-hv, .route, .bars, .tl-item, [data-count]';
	if ('IntersectionObserver' in w) {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (en) {
				if (!en.isIntersecting) return;
				var el = en.target;
				el.classList.add('is-in');
				if (el.hasAttribute('data-count')) count(el);
				io.unobserve(el);
			});
		}, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
		$$(revealSel).forEach(function (el) { io.observe(el); });
	} else {
		$$(revealSel).forEach(function (el) { el.classList.add('is-in'); });
	}

	/* ---------- Timeline progress ---------- */
	var tls = $$('.timeline');
	function timeline() {
		tls.forEach(function (tl) {
			var r = tl.getBoundingClientRect();
			var p = (w.innerHeight * 0.7 - r.top) / r.height;
			tl.style.setProperty('--tl', Math.max(0, Math.min(1, p)) * 100 + '%');
		});
	}

	/* ---------- Auto table of contents for inner pages ---------- */
	$$('.js-page-layout').forEach(function (layout) {
		var secs = $$('.sec[id][data-title]', layout);
		var toc = layout.querySelector('.js-toc');
		if (!toc || secs.length < 2) return;
		var list = toc.querySelector('.toc__list');
		secs.forEach(function (s) {
			var a = d.createElement('a');
			a.href = '#' + s.id;
			a.textContent = s.getAttribute('data-title');
			list.appendChild(a);
		});
		toc.hidden = false;
		layout.classList.add('has-toc');
		var links = $$('a', list);
		if ('IntersectionObserver' in w) {
			var spy = new IntersectionObserver(function (entries) {
				entries.forEach(function (en) {
					if (en.isIntersecting) {
						links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
					}
				});
			}, { rootMargin: '-35% 0px -60% 0px' });
			secs.forEach(function (s) { spy.observe(s); });
		}
		links[0].classList.add('is-active');
	});

	/* ---------- Tabs ---------- */
	$$('[data-tabs]').forEach(function (box) {
		var btns = $$('.tabs__btn', box);
		var panels = $$('.tabs__panel', box);
		btns.forEach(function (b, i) {
			b.setAttribute('role', 'tab');
			b.addEventListener('click', function () {
				btns.forEach(function (x) { x.classList.remove('is-active'); x.setAttribute('aria-selected', 'false'); });
				panels.forEach(function (p) { p.classList.remove('is-active'); });
				b.classList.add('is-active'); b.setAttribute('aria-selected', 'true');
				if (panels[i]) {
					panels[i].classList.add('is-active');
					$$('[data-reveal]', panels[i]).forEach(function (el) { el.classList.add('is-in'); });
				}
			});
		});
	});

	/* ---------- Map (Leaflet) ---------- */
	function initMaps() {
		if (typeof w.L === 'undefined') return;
		var m = cfg.map || {};
		$$('.js-map').forEach(function (el) {
			if (el._map) return;
			var lat = m.lat || 40.3864, lng = m.lng || 71.7864;
			var map = w.L.map(el, { center: [lat, lng], zoom: m.zoom || 8, scrollWheelZoom: false, zoomControl: true, attributionControl: true });
			el._map = map;
			w.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
				attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 19
			}).addTo(map);
			function icon(cls, s) { return w.L.divIcon({ className: '', html: '<div class="' + cls + '"></div>', iconSize: [s, s], iconAnchor: [s / 2, s / 2], popupAnchor: [0, -s / 2] }); }
			w.L.polyline([[41.2995, 69.2401], [41.0, 70.1], [40.75, 70.9], [40.55, 71.35], [lat, lng], [40.78, 72.34], [40.53, 72.8]], { color: '#0b1f33', weight: 2.5, opacity: .75, dashArray: '6 6' })
				.addTo(map).bindPopup(m.rail || '');
			w.L.marker([lat, lng], { icon: icon('fk-marker', 18) }).addTo(map).bindPopup('<strong>' + (m.popup || 'FKTD') + '</strong>').openPopup();
			w.L.marker([40.27, 72.07], { icon: icon('fk-marker fk-marker--sm', 12) }).addTo(map).bindPopup(m.kg || '');
			w.L.marker([40.28, 69.62], { icon: icon('fk-marker fk-marker--sm', 12) }).addTo(map).bindPopup(m.tj || '');
			w.L.marker([41.2995, 69.2401], { icon: icon('fk-marker fk-marker--sm', 12) }).addTo(map).bindPopup(m.tas || '');
		});
	}
	if (d.querySelector('.js-map')) {
		if (typeof w.L !== 'undefined') initMaps(); else w.addEventListener('load', initMaps);
	}

	/* ---------- Form (AJAX with graceful fallback) ---------- */
	$$('.js-form').forEach(function (form) {
		var status = form.querySelector('.form__status');
		function show(ok, msg) {
			status.className = 'form__status is-visible ' + (ok ? 'is-ok' : 'is-err');
			status.textContent = msg;
		}
		form.addEventListener('submit', function (e) {
			var bad = false;
			$$('[required]', form).forEach(function (f) {
				var wrap = f.closest('.field');
				var invalid = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value));
				if (wrap) wrap.classList.toggle('is-error', invalid);
				if (invalid) bad = true;
			});
			if (bad) { e.preventDefault(); show(false, (cfg.i18n && cfg.i18n.err) || 'Error'); return; }
			if (cfg.static) { e.preventDefault(); form.reset(); show(true, cfg.i18n.ok); return; }
			if (!w.fetch || !w.FormData) return;
			e.preventDefault();
			form.classList.add('is-loading');
			fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'X-Requested-With': 'fetch' }, credentials: 'same-origin' })
				.then(function (r) { return r.json(); })
				.then(function (res) {
					if (res && res.success) { form.reset(); show(true, cfg.i18n.ok); }
					else show(false, cfg.i18n.err);
				})
				.catch(function () { show(false, cfg.i18n.err); })
				.then(function () { form.classList.remove('is-loading'); });
		});
		$$('input, textarea', form).forEach(function (f) {
			f.addEventListener('input', function () { var wr = f.closest('.field'); if (wr) wr.classList.remove('is-error'); });
		});
	});

	/* ---------- Lightbox ---------- */
	d.addEventListener('click', function (e) {
		var a = e.target.closest('.js-lightbox, .wp-block-gallery a[href$=".jpg"], .wp-block-gallery a[href$=".jpeg"], .wp-block-gallery a[href$=".png"], .wp-block-gallery a[href$=".webp"]');
		if (!a) return;
		e.preventDefault();
		var box = d.createElement('div');
		box.className = 'lightbox';
		box.innerHTML = '<img alt="" src="' + a.getAttribute('href') + '">';
		d.body.appendChild(box);
		w.requestAnimationFrame(function () { box.classList.add('is-open'); });
		box.addEventListener('click', function () { box.classList.remove('is-open'); setTimeout(function () { box.remove(); }, 300); });
	});

	/* ---------- Subtle parallax on hero visual ---------- */
	var hv = d.querySelector('.hero .hero-visual');
	if (hv && !reduce && w.matchMedia('(hover: hover)').matches) {
		var hero = d.querySelector('.hero');
		hero.addEventListener('mousemove', function (e) {
			var r = hero.getBoundingClientRect();
			var x = (e.clientX - r.left) / r.width - 0.5;
			var y = (e.clientY - r.top) / r.height - 0.5;
			hv.style.transform = 'perspective(1200px) rotateY(' + (x * 4) + 'deg) rotateX(' + (-y * 4) + 'deg)';
		});
		hero.addEventListener('mouseleave', function () { hv.style.transform = ''; });
		hv.style.transition = 'transform .6s cubic-bezier(.2,.7,.2,1)';
	}

	onScroll();
})();

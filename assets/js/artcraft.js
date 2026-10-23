/* FKTD — ArtCraft-style motion: hero orbit/parallax, chapter indicator, ruler */
(function () {
	'use strict';
	var d = document, w = window;
	var reduce = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* ---------- Hero: mouse parallax + scroll-out ---------- */
	var hero = d.querySelector('.ahero');
	if (hero) {
		var cards = [].slice.call(hero.querySelectorAll('.fc')), rings = hero.querySelector('.ahero__rings'), center = hero.querySelector('.ahero__center');
		var mx = 0, my = 0, tx = 0, ty = 0, prog = 0, geo = [];
		function measure() {
			var hr = hero.getBoundingClientRect();
			geo = cards.map(function (c) {
				var r = c.getBoundingClientRect();
				return { dx: (r.left + r.width / 2 - hr.left - hr.width / 2) / hr.width, dy: (r.top + r.height / 2 - hr.top - hr.height / 2) / hr.height, d: parseFloat(c.style.getPropertyValue('--d')) || .5 };
			});
		}
		measure(); w.addEventListener('resize', measure);
		hero.addEventListener('mousemove', function (e) {
			var r = hero.getBoundingClientRect();
			mx = (e.clientX - r.left) / r.width - .5; my = (e.clientY - r.top) / r.height - .5;
		});
		hero.addEventListener('mouseleave', function () { mx = my = 0; });
		function loop() {
			tx += (mx - tx) * .06; ty += (my - ty) * .06;
			var r = hero.getBoundingClientRect();
			prog = Math.min(1, Math.max(0, -r.top / (r.height * .9)));
			if (r.bottom > 0) {
				var W = r.width, H = r.height;
				cards.forEach(function (c, i) {
					var g = geo[i]; if (!g) return;
					var push = prog * (0.6 + g.d);
					var x = -tx * 60 * g.d + g.dx * W * push * .9;
					var y = -ty * 40 * g.d + g.dy * H * push * .9 - prog * 120 * g.d;
					c.style.setProperty('--tx', x.toFixed(1) + 'px');
					c.style.setProperty('--ty', y.toFixed(1) + 'px');
					c.style.setProperty('--s', (1 + prog * .7 * g.d).toFixed(3));
					c.style.setProperty('--o', Math.max(0, 1 - prog * 1.15).toFixed(3));
				});
				if (rings) { rings.style.setProperty('--rot', (prog * 35 + tx * 4).toFixed(2) + 'deg'); rings.style.setProperty('--rs', (1 + prog * .35).toFixed(3)); }
				if (center) { center.style.setProperty('--cy', (prog * 90).toFixed(1) + 'px'); center.style.setProperty('--co', Math.max(0, 1 - prog * 1.5).toFixed(3)); }
			}
			requestAnimationFrame(loop);
		}
		if (!reduce) requestAnimationFrame(loop);
	}

	/* ---------- Chapter indicator ---------- */
	var box = d.querySelector('.chapters__list');
	var chs = [].slice.call(d.querySelectorAll('[data-chapter]')).filter(function (el) { return el.getAttribute('data-chapter'); });
	var seen = {}, list = [];
	chs.forEach(function (el) { var t = el.getAttribute('data-chapter').trim(); if (!seen[t] && t.length < 40) { seen[t] = 1; list.push({ el: el, t: t }); } });
	var items = [];
	if (box && list.length > 1) {
		list.forEach(function (c) { var s = d.createElement('div'); s.className = 'chapters__item'; s.textContent = c.t; box.appendChild(s); items.push(s); });
	}
	var cur = -1;
	function setCur(i) {
		if (i === cur || !items.length) return;
		cur = i;
		items.forEach(function (it, j) {
			it.className = 'chapters__item ' + (j < i ? 'is-past' : j === i ? 'is-cur' : 'is-future');
			if (j === i) it.innerHTML = list[j].t.split('').map(function (ch, k) { return '<span class="ch" style="--k:' + k + '">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>'; }).join('');
			else it.textContent = list[j].t;
		});
	}

	/* ---------- Ruler progress ---------- */
	var mark = d.querySelector('.ruler__mark');
	var ticking = false;
	function onScroll() {
		var y = w.scrollY, h = d.documentElement.scrollHeight - w.innerHeight;
		if (mark) mark.parentNode.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0);
		if (list.length) {
			var line = w.innerHeight * .4, idx = 0;
			list.forEach(function (c, i) { if (c.el.getBoundingClientRect().top < line) idx = i; });
			setCur(idx);
		}
		ticking = false;
	}
	w.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
	onScroll();
})();

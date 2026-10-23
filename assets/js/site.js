/* FKTD — portal features: modals, search, catalog filters, pagination, FAQ, share, calendar, cookie, assistant */
(function () {
	'use strict';
	var d = document, w = window;
	function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
	function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
	function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[‘’ʻ']/g, ''); }
	var store = { get: function (k) { try { return w.localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { w.localStorage.setItem(k, v); } catch (e) {} } };

	/* ---------- Modals ---------- */
	var lastFocus = null;
	function openModal(id, trigger) {
		var m = d.getElementById('modal-' + id);
		if (!m) return;
		lastFocus = trigger || d.activeElement;
		if (trigger && trigger.hasAttribute('data-project')) {
			var name = trigger.getAttribute('data-project');
			$$('.js-apply-name', m).forEach(function (el) { el.textContent = name; });
			$$('.js-apply-input', m).forEach(function (el) { el.value = name; });
		}
		$$('.form__status', m).forEach(function (s) { s.className = 'form__status'; s.textContent = ''; });
		m.hidden = false;
		requestAnimationFrame(function () { m.classList.add('is-open'); });
		d.body.classList.add('modal-open');
		var f = m.querySelector('input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea, select');
		setTimeout(function () { if (f) f.focus(); }, 60);
		if (d.body.classList.contains('drawer-open')) { var x = d.querySelector('.js-drawer-close'); if (x) x.click(); }
	}
	function closeModal(m) {
		if (!m) return;
		m.classList.remove('is-open');
		setTimeout(function () { m.hidden = true; }, 250);
		if (!d.querySelector('.modal.is-open, .search-o.is-open')) d.body.classList.remove('modal-open');
		if (lastFocus && lastFocus.focus) lastFocus.focus();
	}
	d.addEventListener('click', function (e) {
		var o = e.target.closest('[data-open]');
		if (o) { e.preventDefault(); openModal(o.getAttribute('data-open'), o); return; }
		var c = e.target.closest('[data-close]');
		if (c) { closeModal(c.closest('.modal, .search-o')); }
	});
	d.addEventListener('keydown', function (e) {
		if (e.key === 'Escape') { $$('.modal.is-open, .search-o.is-open').forEach(closeModal); }
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openModal('search'); }
		if (e.key === '/' && !/input|textarea|select/i.test((d.activeElement || {}).tagName || '')) { e.preventDefault(); openModal('search'); }
	});
	// Demo-mode messages for forms without a backend
	d.addEventListener('submit', function (e) {
		var f = e.target;
		setTimeout(function () {
			var st = f.querySelector('.form__status.is-ok');
			if (!st) return;
			if (f.closest('#modal-login')) st.textContent = 'Демо-режим: кабинет инвестора заработает после подключения серверной части.';
			else if (f.closest('#modal-subscribe')) st.textContent = 'Спасибо! Вы подписаны на новости технопарка.';
			else if (f.closest('#modal-feedback')) st.textContent = 'Спасибо за отзыв! Мы рассмотрим его в течение 3 рабочих дней.';
			else if (f.closest('#modal-register')) st.textContent = 'Вы записаны! Менеджер свяжется с вами для подтверждения.';
		}, 0);
	});

	/* ---------- Language dropdown ---------- */
	$$('.langdd__btn').forEach(function (b) {
		b.addEventListener('click', function (e) {
			e.stopPropagation();
			var p = b.parentNode, open = !p.classList.contains('is-open');
			$$('.langdd.is-open').forEach(function (x) { x.classList.remove('is-open'); });
			p.classList.toggle('is-open', open); b.setAttribute('aria-expanded', open);
		});
	});
	d.addEventListener('click', function () { $$('.langdd.is-open').forEach(function (x) { x.classList.remove('is-open'); }); });

	/* ---------- Search ---------- */
	var IDX = w.FKTD_INDEX || [];
	function search(q) {
		var terms = norm(q).split(/[\s,.;:!?()«»"]+/).filter(function (t) { return t.length > 1; });
		if (!terms.length) return [];
		var out = [];
		IDX.forEach(function (p) {
			var t = norm(p.t), x = norm(p.x), score = 0, pos = -1;
			terms.forEach(function (term) {
				var stem = term.length > 5 ? term.slice(0, term.length - 2) : term;
				if (t.indexOf(stem) > -1) score += 10;
				var i = x.indexOf(stem), n = 0;
				if (i > -1 && pos < 0) pos = i;
				while (i > -1 && n < 20) { n++; i = x.indexOf(stem, i + stem.length); }
				score += n;
			});
			if (score > 0) out.push({ p: p, score: score, pos: pos });
		});
		out.sort(function (a, b) { return b.score - a.score; });
		return out.map(function (r) {
			var start = Math.max(0, r.pos - 70), snip = r.p.x.substr(start, 200);
			snip = (start > 0 ? '…' : '') + esc(snip) + '…';
			terms.forEach(function (term) {
				var stem = term.length > 5 ? term.slice(0, term.length - 2) : term;
				try { snip = snip.replace(new RegExp('(' + stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^\\s,.]*)', 'gi'), '<mark>$1</mark>'); } catch (e) {}
			});
			return { u: r.p.u, t: r.p.t, s: r.p.s, snip: snip };
		});
	}
	function resultHTML(r) {
		return '<li><a href="' + r.u + '"><small>' + esc(r.s) + '</small><strong>' + esc(r.t) + '</strong><span>' + r.snip + '</span></a></li>';
	}
	var sIn = d.querySelector('.js-search-input'), sRes = d.querySelector('.js-search-res');
	if (sIn && sRes) {
		var tmr;
		sIn.addEventListener('input', function () {
			clearTimeout(tmr);
			tmr = setTimeout(function () {
				var q = sIn.value.trim();
				if (q.length < 2) { sRes.innerHTML = ''; return; }
				var res = search(q).slice(0, 6);
				sRes.innerHTML = res.length ? '<ol class="search-list search-list--o">' + res.map(resultHTML).join('') + '</ol><a class="link-arrow" href="search.html?q=' + encodeURIComponent(q) + '">Все результаты →</a>'
					: '<p class="muted">Ничего не найдено. Попробуйте другой запрос или <a href="contacts.html#form">задайте вопрос</a>.</p>';
			}, 120);
		});
	}
	var sp = d.querySelector('[data-searchpage]');
	if (sp) {
		var params = new URLSearchParams(w.location.search), q0 = params.get('q') || '', inp = sp.querySelector('[data-sp-input]');
		inp.value = q0;
		var all = q0 ? search(q0) : [], active = '';
		function render() {
			var list = all.filter(function (r) { return !active || r.s === active; });
			sp.querySelector('[data-sp-count]').textContent = q0 ? ('Найдено: ' + list.length + ' по запросу «' + q0 + '»') : 'Введите запрос, например: льготы, площадь, НДС.';
			sp.querySelector('[data-sp-results]').innerHTML = list.map(resultHTML).join('') || (q0 ? '<li class="empty-state">Ничего не найдено</li>' : '');
		}
		var secs = [];
		all.forEach(function (r) { if (secs.indexOf(r.s) < 0) secs.push(r.s); });
		var fbox = sp.querySelector('[data-sp-filters]');
		if (secs.length > 1) {
			fbox.innerHTML = '<button class="pill is-active" type="button" data-s="">Все разделы</button>' + secs.map(function (s) { return '<button class="pill" type="button" data-s="' + esc(s) + '">' + esc(s) + '</button>'; }).join('');
			fbox.addEventListener('click', function (e) {
				var b = e.target.closest('[data-s]'); if (!b) return;
				active = b.getAttribute('data-s');
				$$('.pill', fbox).forEach(function (x) { x.classList.toggle('is-active', x === b); });
				render();
			});
		}
		render();
	}

	/* ---------- Catalog filters + pagination ---------- */
	$$('[data-catalog]').forEach(function (box) {
		var items = $$('[data-item]', box), grid = box.querySelector('.catalog__grid') || (items[0] && items[0].parentNode);
		var per = parseInt(box.getAttribute('data-per-page') || '0', 10), page = 1;
		var st = { dir: '', q: '', inv: '', sort: '', type: '', cat: '', when: box.getAttribute('data-default-when') || '' };
		var pager = box.querySelector('[data-pager]'), empty = box.querySelector('[data-empty]'), count = box.querySelector('[data-count-out]');
		function apply() {
			var vis = items.filter(function (it) {
				if (st.dir && it.getAttribute('data-dir') !== st.dir) return false;
				if (st.type && it.getAttribute('data-type') !== st.type) return false;
				if (st.cat && it.getAttribute('data-cat') !== st.cat) return false;
				if (st.when && it.getAttribute('data-when') !== st.when) return false;
				if (st.q && norm(it.getAttribute('data-text') || it.textContent).indexOf(norm(st.q)) < 0) return false;
				if (st.inv) {
					var r = st.inv.split('-'), v = parseFloat(it.getAttribute('data-inv') || '0');
					if (!v || v < +r[0] || v > +r[1]) return false;
				}
				return true;
			});
			if (st.sort) {
				vis.sort(function (a, b) {
					if (st.sort === 'name') return a.textContent.trim().localeCompare(b.textContent.trim(), 'ru');
					var va = parseFloat(a.getAttribute('data-inv') || '999'), vb = parseFloat(b.getAttribute('data-inv') || '999');
					return st.sort === 'inv-asc' ? va - vb : vb - va;
				});
				vis.forEach(function (it) { grid.appendChild(it); });
			}
			var pages = per ? Math.max(1, Math.ceil(vis.length / per)) : 1;
			if (page > pages) page = pages;
			items.forEach(function (it) { it.hidden = true; });
			vis.forEach(function (it, i) {
				if (!per || (i >= (page - 1) * per && i < page * per)) { it.hidden = false; it.classList.add('is-in'); }
			});
			if (empty) empty.hidden = vis.length > 0;
			if (count) count.textContent = 'Найдено проектов: ' + vis.length;
			if (pager) {
				var h = '';
				if (pages > 1) {
					h += '<button class="page-numbers" type="button" data-page="' + Math.max(1, page - 1) + '" aria-label="Назад"' + (page === 1 ? ' disabled' : '') + '>‹</button>';
					for (var p = 1; p <= pages; p++) h += '<button class="page-numbers' + (p === page ? ' current' : '') + '" type="button" data-page="' + p + '">' + p + '</button>';
					h += '<button class="page-numbers" type="button" data-page="' + Math.min(pages, page + 1) + '" aria-label="Вперёд"' + (page === pages ? ' disabled' : '') + '>›</button>';
				}
				pager.innerHTML = h;
			}
		}
		function pills(attr, key) {
			$$('[' + attr + ']', box).forEach(function (b) {
				b.addEventListener('click', function () {
					st[key] = b.getAttribute(attr); page = 1;
					$$('[' + attr + ']', box).forEach(function (x) { x.classList.toggle('is-active', x === b); });
					apply();
				});
			});
		}
		pills('data-f-dir', 'dir'); pills('data-f-type', 'type'); pills('data-f-cat', 'cat'); pills('data-f-when', 'when');
		var q = box.querySelector('[data-f-q]'); if (q) q.addEventListener('input', function () { st.q = q.value.trim(); page = 1; apply(); });
		var inv = box.querySelector('[data-f-inv]'); if (inv) inv.addEventListener('change', function () { st.inv = inv.value; page = 1; apply(); });
		var so = box.querySelector('[data-f-sort]'); if (so) so.addEventListener('change', function () { st.sort = so.value; apply(); });
		var rs = box.querySelector('[data-f-reset]'); if (rs) rs.addEventListener('click', function () {
			st.dir = st.q = st.inv = st.sort = ''; if (q) q.value = ''; if (inv) inv.value = ''; if (so) so.value = '';
			$$('[data-f-dir]', box).forEach(function (x, i) { x.classList.toggle('is-active', i === 0); }); apply();
		});
		if (pager) pager.addEventListener('click', function (e) {
			var b = e.target.closest('[data-page]'); if (!b || b.disabled) return;
			page = parseInt(b.getAttribute('data-page'), 10); apply();
			box.scrollIntoView({ behavior: 'smooth', block: 'start' });
		});
		// deep link: invest-sectors.html#polymers
		var hash = (w.location.hash || '').slice(1);
		if (hash) { var hb = box.querySelector('[data-f-dir="' + hash + '"]'); if (hb) hb.click(); }
		apply();
	});

	/* ---------- FAQ accordion ---------- */
	$$('[data-faq]').forEach(function (box) {
		var items = $$('[data-faq-item]', box), cur = 0, cnt = box.querySelector('[data-faq-count]');
		function open(i, scroll) {
			cur = i;
			items.forEach(function (it, j) {
				var on = j === i;
				it.classList.toggle('is-open', on);
				it.querySelector('.faq__q').setAttribute('aria-expanded', on);
				it.querySelector('.faq__a').hidden = !on;
			});
			if (cnt) cnt.textContent = (i + 1) + ' / ' + items.length;
			if (scroll) items[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
		items.forEach(function (it, i) {
			it.querySelector('.faq__q').addEventListener('click', function () {
				if (it.classList.contains('is-open')) { it.classList.remove('is-open'); it.querySelector('.faq__a').hidden = true; it.querySelector('.faq__q').setAttribute('aria-expanded', false); }
				else open(i);
			});
		});
		var pv = box.querySelector('[data-faq-prev]'), nx = box.querySelector('[data-faq-next]');
		if (pv) pv.addEventListener('click', function () { open((cur - 1 + items.length) % items.length, true); });
		if (nx) nx.addEventListener('click', function () { open((cur + 1) % items.length, true); });
		var fq = box.querySelector('[data-faq-q]');
		if (fq) fq.addEventListener('input', function () {
			var v = norm(fq.value.trim());
			items.forEach(function (it) { it.hidden = v && norm(it.textContent).indexOf(v) < 0; });
		});
		var h = parseInt((w.location.hash || '').replace('#q', ''), 10);
		if (h > 0 && h <= items.length) open(h - 1, true);
	});

	/* ---------- Share ---------- */
	d.addEventListener('click', function (e) {
		var b = e.target.closest('[data-share]'); if (!b) return;
		var url = w.location.href, bar = b.closest('.share'), t = bar ? bar.getAttribute('data-share-title') : d.title, k = b.getAttribute('data-share');
		var map = { tg: 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(t), fb: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url), li: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url) };
		if (map[k]) { w.open(map[k], '_blank', 'noopener,width=640,height=560'); return; }
		var ok = bar && bar.querySelector('.share__ok');
		function done() { if (ok) { ok.hidden = false; setTimeout(function () { ok.hidden = true; }, 2000); } }
		if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, done); else done();
	});

	/* ---------- Add to calendar (.ics) ---------- */
	d.addEventListener('click', function (e) {
		var b = e.target.closest('[data-ics]'); if (!b || b.disabled) return;
		var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FKTD//RU', 'BEGIN:VEVENT', 'UID:' + Date.now() + '@fktd.uz',
			'DTSTART;VALUE=DATE:' + b.getAttribute('data-start'), 'DTEND;VALUE=DATE:' + b.getAttribute('data-end'),
			'SUMMARY:' + b.getAttribute('data-title'), 'LOCATION:' + (b.getAttribute('data-loc') || ''), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
		var a = d.createElement('a');
		a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
		a.download = 'fktd-event.ics'; d.body.appendChild(a); a.click(); a.remove();
	});

	/* ---------- Benefits calculator ---------- */
	$$('[data-calc]').forEach(function (c) {
		var inp = c.querySelector('[data-calc-in]');
		function upd() {
			var v = parseFloat(inp.value), p, l, t;
			if (v < 5) { p = l = t = 'по объёму инвестиций'; }
			else if (v < 10) { p = l = t = '5 лет'; }
			else { p = l = '10 лет'; t = 'до 3 лет'; }
			c.querySelector('[data-calc-v]').textContent = '$' + String(v).replace('.', ',') + ' млн';
			c.querySelector('[data-calc-p]').textContent = p; c.querySelector('[data-calc-l]').textContent = l; c.querySelector('[data-calc-t]').textContent = t;
			inp.style.setProperty('--p', ((v - inp.min) / (inp.max - inp.min) * 100) + '%');
		}
		inp.addEventListener('input', upd); upd();
	});

	/* ---------- Cookie banner ---------- */
	var ck = d.querySelector('.cookie');
	if (ck && !store.get('fktd_cookie')) {
		setTimeout(function () { ck.hidden = false; requestAnimationFrame(function () { ck.classList.add('is-in'); }); }, 900);
		$$('[data-cookie]', ck).forEach(function (b) { b.addEventListener('click', function () { store.set('fktd_cookie', b.getAttribute('data-cookie')); ck.classList.remove('is-in'); setTimeout(function () { ck.hidden = true; }, 300); }); });
	}

	/* ---------- Assistant (rule-based FAQ bot) ---------- */
	var ai = d.querySelector('[data-ai]');
	if (ai) {
		var KB = w.FKTD_KB || [], CT = w.FKTD_CONTACT || {}, fab = ai.querySelector('.ai__fab'), panel = ai.querySelector('.ai__panel'), log = ai.querySelector('.ai__log'), form = ai.querySelector('.ai__form'), input = form.querySelector('input');
		function toggle(on) {
			panel.hidden = !on; ai.classList.toggle('is-open', on); fab.setAttribute('aria-expanded', on);
			if (on) setTimeout(function () { input.focus(); }, 50);
		}
		fab.addEventListener('click', function () { toggle(panel.hidden); });
		ai.querySelector('[data-ai-close]').addEventListener('click', function () { toggle(false); });
		$$('[data-ai-open]').forEach(function (b) { b.addEventListener('click', function () { toggle(true); }); });
		function add(html, who) {
			var m = d.createElement('div'); m.className = 'ai__msg ai__msg--' + who; m.innerHTML = html; log.appendChild(m); log.scrollTop = log.scrollHeight;
		}
		function answer(q) {
			var nq = norm(q), best = null, bs = 0;
			KB.forEach(function (it) {
				var s = 0;
				it.k.split(' ').forEach(function (k) { if (k && nq.indexOf(k) > -1) s += 2; });
				norm(it.q).split(/\s+/).forEach(function (t) { if (t.length > 3 && nq.indexOf(t.slice(0, t.length - 1)) > -1) s += 1; });
				if (s > bs) { bs = s; best = it; }
			});
			if (best && bs >= 2) {
				var txt = best.a ? esc(best.a) : 'Эту информацию уточняет команда технопарка. Оставьте заявку — менеджер ответит в течение 24 часов.';
				return '<b>' + esc(best.q) + '</b><br>' + txt + (best.l ? '<br><a href="' + best.l + '">Подробнее →</a>' : '');
			}
			var sr = search(q).slice(0, 3);
			if (sr.length) return 'Вот что нашлось на сайте:<ul>' + sr.map(function (r) { return '<li><a href="' + r.u + '">' + esc(r.t) + '</a></li>'; }).join('') + '</ul>Не то? Позвоните: <a href="' + CT.tel + '">' + esc(CT.phone) + '</a>.';
			return 'Пока не знаю ответа на этот вопрос. Напишите нам на <a href="mailto:' + CT.email + '">' + esc(CT.email) + '</a> или позвоните <a href="' + CT.tel + '">' + esc(CT.phone) + '</a> — ответим в течение 24 часов.';
		}
		function ask(q) {
			if (!q) return;
			add(esc(q), 'me');
			var t = d.createElement('div'); t.className = 'ai__msg ai__msg--bot ai__typing'; t.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(t); log.scrollTop = log.scrollHeight;
			setTimeout(function () { t.remove(); add(answer(q), 'bot'); }, 550);
		}
		form.addEventListener('submit', function (e) { e.preventDefault(); var q = input.value.trim(); input.value = ''; ask(q); });
		log.addEventListener('click', function (e) { var c = e.target.closest('[data-q]'); if (c) ask(c.getAttribute('data-q')); });
	}

	/* ---------- Header: hide floating assistant label on scroll ---------- */
	var lastY = 0;
	w.addEventListener('scroll', function () {
		var y = w.scrollY; if (ai) ai.classList.toggle('is-compact', y > 400 && y > lastY); lastY = y;
	}, { passive: true });
})();

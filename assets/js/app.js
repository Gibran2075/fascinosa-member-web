/* =========================================================================
   FASCINOSA — app.js
   Interaktivitas halaman (Vanilla JS): landing, login & member area
   ========================================================================= */
(function () {
  'use strict';

  /* ============================ UTIL: DOM ============================== */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function on(el, ev, fn) { if (el) el.addEventListener(ev, fn); }
  function setText(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
  function setHTML(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
  function show(el) { if (el) el.classList.remove('hidden'); }
  function hide(el) { if (el) el.classList.add('hidden'); }

  function escapeHTML(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function firstName(fullName) {
    return String(fullName || '').trim().split(/\s+/)[0] || 'Member';
  }

  /* ============================ UTIL: COPY ============================= */
  function copyText(text) {
    return new Promise(function (resolve) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { resolve(true); }).catch(function () {
          resolve(legacyCopy(text));
        });
      } else {
        resolve(legacyCopy(text));
      }
    });
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  /* ============================ UTIL: MODAL ============================ */
  function openModal(el) {
    if (!el) return;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    var focusable = el.querySelector('input, textarea, select');
    if (focusable) setTimeout(function () { focusable.focus(); }, 120);
  }

  function closeModal(el) {
    if (!el) return;
    el.classList.remove('is-open');
    el.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal-overlay.is-open')) {
      document.body.style.overflow = '';
    }
  }

  function closeAllModals() {
    $$('.modal-overlay.is-open').forEach(closeModal);
  }

  document.addEventListener('click', function (e) {
    var closer = e.target.closest('[data-close-modal]');
    if (closer) {
      e.preventDefault();
      closeModal(closer.closest('.modal-overlay'));
      return;
    }
    var opener = e.target.closest('[data-open-register]');
    if (opener) {
      e.preventDefault();
      openModal(document.getElementById('registerModal'));
      return;
    }
    var demo = e.target.closest('[data-demo]');
    if (demo) {
      e.preventDefault();
      window.FSC.toast(demo.getAttribute('data-demo') || 'Menu ini hanya tampilan demo.', 'info');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllModals();
  });

  /* ====================== GLOBAL: NAV AUTH STATE ======================= */
  function renderAuthState() {
    var logged = window.FSC.isLoggedIn();
    var user = logged ? window.FSC.getCurrentUser() : null;
    var memberId = user ? user.memberId : '';

    $$('[data-auth-visible="guest"]').forEach(function (el) { logged ? hide(el) : show(el); });
    $$('[data-auth-visible="member"]').forEach(function (el) { logged ? show(el) : hide(el); });

    if (logged && user) {
      $$('[data-bind="member-id"]').forEach(function (el) { el.textContent = memberId; });
      $$('[data-bind="user-name"]').forEach(function (el) { el.textContent = user.name; });
      $$('[data-bind="first-name"]').forEach(function (el) { el.textContent = firstName(user.name); });
    }

    // Keranjang
    var count = window.FSC.getCart().length;
    $$('[data-bind="cart-count"]').forEach(function (el) { el.textContent = String(count); });

    // Bar sesi aktif di halaman login
    var bar = document.getElementById('activeSessionBar');
    if (bar && logged && user) {
      show(bar);
      setText('activeSessionName', user.name + ' (' + user.memberId + ')');
    }
  }

  /* ========================= LANDING: FILTER =========================== */
  function initCollectionFilter() {
    var tabs = $$('[data-filter]');
    if (!tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var key = tab.getAttribute('data-filter');

        tabs.forEach(function (t) {
          t.classList.remove('is-active', 'bg-black', 'text-white', 'border-black');
          t.classList.add('border-[#E5E5E5]');
        });
        tab.classList.add('is-active');
        tab.classList.remove('border-[#E5E5E5]');

        var visible = 0;
        $$('.product-card').forEach(function (card) {
          var match = key === 'all' || card.getAttribute('data-category') === key;
          card.classList.toggle('is-hidden', !match);
          if (match) {
            visible++;
            card.classList.remove('fsc-fade-up');
            void card.offsetWidth; // restart animation
            card.classList.add('fsc-fade-up');
          }
        });

        var empty = document.getElementById('emptyFilter');
        if (empty) empty.classList.toggle('hidden', visible !== 0);
      });
    });
  }

  /* ========================= LANDING: PRODUCT ========================== */
  function initProductActions() {
    $$('.product-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var name = card.getAttribute('data-name') || 'Produk';
        var count = window.FSC.addToCart({ title: name });
        $$('[data-bind="cart-count"]').forEach(function (el) { el.textContent = String(count); });
        window.FSC.toast(name + ' ditambahkan ke keranjang demo (' + count + ' item).', 'success');
      });
    });

    var cartBtn = document.getElementById('cartBtn');
    on(cartBtn, 'click', function () {
      var count = window.FSC.getCart().length;
      window.FSC.toast(
        count ? 'Keranjang demo berisi ' + count + ' item.' : 'Keranjang masih kosong — klik produk untuk menambah.',
        'info'
      );
    });
  }

  /* ======================== LANDING: REGISTER ========================== */
  function initRegisterForm() {
    var form = document.getElementById('registerForm');
    if (!form) return;

    on(form, 'submit', function (e) {
      e.preventDefault();

      var payload = {
        name: (document.getElementById('regName') || {}).value,
        phone: (document.getElementById('regPhone') || {}).value,
        email: (document.getElementById('regEmail') || {}).value,
        password: (document.getElementById('regPassword') || {}).value
      };

      var result = window.FSC.register(payload);
      if (!result.ok) {
        window.FSC.toast(result.message, 'error');
        form.classList.remove('fsc-shake');
        void form.offsetWidth;
        form.classList.add('fsc-shake');
        return;
      }

      window.FSC.toast(result.message + ' Mengarahkan ke Member Area...', 'success');
      form.reset();
      setTimeout(function () { window.location.href = 'member.html'; }, 1400);
    });

    // Buka otomatis lewat ?register=1 atau #daftar
    var params = new URLSearchParams(window.location.search);
    if (params.get('register') === '1' || window.location.hash === '#daftar') {
      setTimeout(function () { openModal(document.getElementById('registerModal')); }, 350);
    }
  }

  /* =========================== LOGIN PAGE ============================== */
  function initLoginForm() {
    var form = document.getElementById('authForm');
    if (!form) return;

    var pwd = document.getElementById('credential');
    var eyeBtn = document.getElementById('toggle-password');
    var eyeIcon = document.getElementById('eye-icon');

    on(eyeBtn, 'click', function () {
      if (!pwd) return;
      var isPassword = pwd.type === 'password';
      pwd.type = isPassword ? 'text' : 'password';
      if (eyeIcon) eyeIcon.textContent = isPassword ? 'visibility_off' : 'visibility';
    });

    on(form, 'submit', function (e) {
      e.preventDefault();

      var idEl = document.getElementById('identifier');
      var identifier = idEl ? idEl.value.trim() : '';
      var password = pwd ? pwd.value : '';

      if (!identifier || !password) {
        window.FSC.toast('Nomor HP / Email dan Password wajib diisi.', 'error');
        form.classList.remove('fsc-shake');
        void form.offsetWidth;
        form.classList.add('fsc-shake');
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.dataset.original = btn.textContent;
        btn.textContent = 'Memproses...';
      }

      var result = window.FSC.login(identifier, password);

      if (!result.ok) {
        window.FSC.toast(result.message, 'error');
        form.classList.remove('fsc-shake');
        void form.offsetWidth;
        form.classList.add('fsc-shake');
        if (btn) {
          btn.disabled = false;
          btn.textContent = btn.dataset.original || 'Masuk Sekarang';
        }
        return;
      }

      window.FSC.toast('Login Berhasil, mengarahkan ke Member Area...', 'success');
      if (btn) btn.textContent = 'Berhasil ✓';

      var remember = document.getElementById('remember-me');
      try {
        if (remember && !remember.checked) {
          // tetap gunakan localStorage untuk demo, hanya ditandai preferensi
          localStorage.setItem('fascinosa_remember', 'false');
        } else {
          localStorage.setItem('fascinosa_remember', 'true');
        }
      } catch (err) { /* ignore */ }

      setTimeout(function () { window.location.replace('member.html'); }, 1000);
    });

    // Quick demo login
    var quick = document.getElementById('btnQuickDemo');
    on(quick, 'click', function () {
      var idEl = document.getElementById('identifier');
      if (idEl) idEl.value = 'sinta@email.com';
      if (pwd) pwd.value = 'password123';
      var remember = document.getElementById('remember-me');
      if (remember) remember.checked = true;
      window.FSC.toast('Kredensial demo terisi. Memproses login...', 'info');
      setTimeout(function () { form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true })); }, 450);
    });
  }

  /* ========================== MEMBER PAGE ============================== */
  function renderMember() {
    var user = window.FSC.getCurrentUser();
    if (!user) {
      window.FSC.requireLogin('login.html');
      return;
    }

    // Header & sapaan
    setText('hdrUserName', 'Halo, ' + user.name + ' 👋');
    setText('welcomeName', firstName(user.name));

    // Digital member card
    setText('cardName', String(user.name).toUpperCase());
    setText('cardMemberId', user.memberId);
    setText('cardJoined', String(user.joinedDate).toUpperCase());
    setText('memberSince', 'MEMBER SINCE ' + (user.joinedYear || '2026') + ' • STATUS VERIFIKASI AKTIF');

    // Stat: poin
    var points = Number(user.points) || 0;
    setText('statPoints', window.FSC.formatPoints(points));
    setText('statDiscount', window.FSC.formatIDR(points * 100));
    $$('[data-bind="member-id"]').forEach(function (el) { el.textContent = user.memberId; });
    $$('[data-bind="user-name"]').forEach(function (el) { el.textContent = user.name; });

    // Stat: tier
    setText('statTier', user.tier || 'SILVER MEMBER');
    var spent = Number(user.spent) || 0;
    var target = Number(user.tierTarget) || 3000000;
    var pct = Math.max(0, Math.min(100, Math.round((spent / target) * 100)));
    var fill = document.getElementById('progressFill');
    if (fill) fill.style.width = pct + '%';
    setText('progressLabel', pct + '% (' + window.FSC.formatIDR(spent) + ' / ' + window.FSC.formatIDR(target) + ')');
    setText('tierRemaining',
      'Belanja ' + window.FSC.formatIDR(Math.max(0, target - spent)) + ' lagi untuk mencapai status Gold Member & fasilitas free delivery express atelier seumur hidup.'
    );
    setText('tierEvaluation', 'Evaluasi Tier: ' + (user.tierEvaluation || '31 Des 2026'));

    // Stat: voucher
    var vouchers = Array.isArray(user.vouchers) ? user.vouchers : [];
    setText('voucherCount', String(vouchers.length));
    renderVoucherList(vouchers);

    // Profil
    setText('pfName', user.name);
    setText('pfPhone', formatPhone(user.phone));
    setText('pfEmail', user.email);
    setText('pfBirthday', user.birthday || '-');
    setText('pfAddress', user.address || '-');

    // Modal QR
    setText('qrMemberId', user.memberId);
    setText('qrMemberName', String(user.name).toUpperCase());

    // Modal edit profil (prefill)
    setVal('editName', user.name);
    setVal('editPhone', user.phone);
    setVal('editEmail', user.email);
    setVal('editAddress', user.address);
  }

  function setVal(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value == null ? '' : value;
  }

  function formatPhone(phone) {
    var p = String(phone || '').replace(/[^0-9]/g, '');
    if (p.length < 9) return phone || '-';
    if (p.indexOf('62') === 0) p = '0' + p.slice(2);
    return '+62 ' + p.slice(1, 4) + '-' + p.slice(4, 8) + '-' + p.slice(8, 12);
  }

  function renderVoucherList(vouchers) {
    var wrap = document.getElementById('voucherList');
    if (!wrap) return;
    if (!vouchers.length) {
      wrap.innerHTML = '<p class="font-label-meta text-label-meta text-on-surface-variant uppercase tracking-[0.12em]">Belum ada voucher aktif.</p>';
      return;
    }
    wrap.innerHTML = vouchers.map(function (v) {
      return '' +
        '<div class="flex items-center justify-between p-2 bg-surface-container-low border border-surface-container-high">' +
          '<div class="flex items-center gap-2">' +
            '<span class="text-[14px]">' + escapeHTML(v.icon || '🎟️') + '</span>' +
            '<span class="font-label-meta text-[11px] tracking-[0.12em] text-on-surface uppercase font-medium">' + escapeHTML(v.title) + '</span>' +
          '</div>' +
          '<span class="font-label-meta text-[10px] tracking-[0.08em] ' + (v.meta === 'Aktif' ? 'text-emerald-700 uppercase font-semibold' : 'text-on-surface-variant') + '">' + escapeHTML(v.meta || '') + '</span>' +
        '</div>';
    }).join('');
  }

  function initMemberActions() {
    // Tampilkan QR Code
    on(document.getElementById('btnShowQr'), 'click', function () {
      openModal(document.getElementById('modalQr'));
    });

    // Tukarkan poin
    on(document.getElementById('btnRedeem'), 'click', function () {
      renderRedeemList();
      openModal(document.getElementById('modalRedeem'));
    });

    // Edit profil
    on(document.getElementById('btnEditProfile'), 'click', function () {
      renderMember();
      openModal(document.getElementById('modalEdit'));
    });

    // Simpan edit profil
    var editForm = document.getElementById('editForm');
    on(editForm, 'submit', function (e) {
      e.preventDefault();
      var result = window.FSC.updateProfile({
        name: (document.getElementById('editName') || {}).value,
        phone: (document.getElementById('editPhone') || {}).value,
        email: (document.getElementById('editEmail') || {}).value,
        address: (document.getElementById('editAddress') || {}).value
      });
      if (!result.ok) {
        window.FSC.toast(result.message, 'error');
        return;
      }
      renderMember();
      closeModal(document.getElementById('modalEdit'));
      window.FSC.toast('Profil berhasil diperbarui.', 'success');
    });

    // Logout
    $$('[data-logout]').forEach(function (btn) {
      on(btn, 'click', function (e) {
        e.preventDefault();
        window.FSC.logout();
        window.FSC.toast('Kamu telah logout. Sampai jumpa lagi!', 'success');
        setTimeout(function () { window.location.href = 'index.html'; }, 700);
      });
    });

    // Salin Member ID
    var copyIdBtn = document.getElementById('copyIdBtn');
    on(copyIdBtn, 'click', function () {
      var id = (document.getElementById('cardMemberId') || {}).textContent || '';
      copyText(id.trim()).then(function () {
        var icon = copyIdBtn.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.textContent = 'done';
          setTimeout(function () { icon.textContent = 'content_copy'; }, 2000);
        }
        window.FSC.toast('Member ID ' + id.trim() + ' berhasil disalin.', 'success');
      });
    });

    // Salin kode voucher promo
    var copyVoucherBtn = document.getElementById('copyVoucherBtn');
    on(copyVoucherBtn, 'click', function () {
      copyText('SILVER20VIP').then(function () {
        var original = copyVoucherBtn.textContent;
        copyVoucherBtn.textContent = 'Tersalin!';
        window.FSC.toast('Kode promo SILVER20VIP berhasil disalin.', 'success');
        setTimeout(function () { copyVoucherBtn.textContent = original; }, 2000);
      });
    });

    // Tombol util lain
    on(document.getElementById('btnSync'), 'click', function () {
      window.FSC.toast('Kartu digital tersinkron dengan server Fascinosa.', 'success');
    });
    on(document.getElementById('btnVoucherAll'), 'click', function () {
      window.FSC.toast('Halaman "Voucher Saya" akan hadir di versi produksi.', 'info');
    });
  }

  function renderRedeemList() {
    var wrap = document.getElementById('redeemList');
    if (!wrap) return;

    var user = window.FSC.getCurrentUser() || { points: 0 };
    var points = Number(user.points) || 0;
    setText('redeemBalance', window.FSC.formatPoints(points) + ' Pts');

    wrap.innerHTML = window.FSC.VOUCHER_CATALOG.map(function (v) {
      var canAfford = points >= v.cost;
      return '' +
        '<div class="border border-surface-container-high bg-surface-container-low p-4 flex flex-col sm:flex-row sm:items-center gap-4">' +
          '<div class="w-11 h-11 shrink-0 bg-white border border-surface-container-high flex items-center justify-center text-[18px]">' + escapeHTML(v.icon) + '</div>' +
          '<div class="flex-1">' +
            '<p class="font-title-md text-[15px] text-on-surface">' + escapeHTML(v.title) + '</p>' +
            '<p class="font-body-sm text-body-sm text-on-surface-variant font-light mt-0.5">' + escapeHTML(v.desc) + '</p>' +
            '<p class="font-label-meta text-[10px] tracking-[0.14em] uppercase text-on-surface-variant/80 mt-1">' + escapeHTML(v.expiry) + ' • ' + window.FSC.formatPoints(v.cost) + ' Pts</p>' +
          '</div>' +
          '<button type="button" data-voucher="' + escapeHTML(v.id) + '" ' +
            (canAfford ? '' : 'disabled ') +
            'class="w-full sm:w-auto shrink-0 px-5 py-2.5 font-label-caps text-label-caps tracking-[0.16em] uppercase transition-colors ' +
            (canAfford
              ? 'bg-primary text-on-primary hover:bg-neutral-700'
              : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed opacity-70') +
            '">' + (canAfford ? 'Tukarkan' : 'Poin Kurang') + '</button>' +
        '</div>';
    }).join('');

    $$('[data-voucher]', wrap).forEach(function (btn) {
      on(btn, 'click', function () {
        var res = window.FSC.redeemVoucher(btn.getAttribute('data-voucher'));
        window.FSC.toast(res.message, res.ok ? 'success' : 'error');
        if (res.ok) {
          renderMember();
          renderRedeemList();
        }
      });
    });
  }

  /* ============================= BOOT ================================== */
  document.addEventListener('DOMContentLoaded', function () {
    window.FSC.init();
    renderAuthState();
    initCollectionFilter();
    initProductActions();
    initRegisterForm();
    initLoginForm();
    initMemberActions();

    var page = document.body.getAttribute('data-page') || '';
    if (page === 'member') renderMember();
  });
})();

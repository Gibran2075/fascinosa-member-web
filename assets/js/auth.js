/* =========================================================================
   FASCINOSA — auth.js
   Authentication & State Management berbasis localStorage (dummy prototype)
   ========================================================================= */
(function (global) {
  'use strict';

  /* ----------------------------- STORAGE KEYS ---------------------------- */
  var KEYS = {
    USERS: 'fascinosa_users',      // daftar user terdaftar (array of object)
    SESSION: 'fascinosa_session',  // user yang sedang login (object)
    LOGIN: 'isLoggedIn',           // status login -> "true" / "false"
    CART: 'fascinosa_cart',        // keranjang demo (array)
    REGISTERED: 'fascinosa_registered_at'
  };

  /* --------------------------- DUMMY USER DEFAULT ------------------------- */
  var DEFAULT_USER = {
    memberId: 'MB-001234',
    name: 'Sinta Putri',
    phone: '081234567890',
    email: 'sinta@email.com',
    password: 'password123',
    joinedDate: '03 Okt 2026',
    joinedYear: '2026',
    points: 1250,
    tier: 'SILVER MEMBER',
    birthday: '14 Oktober 1996',
    address: 'Jl. Senopati No. 42, Kebayoran Baru, Jakarta Selatan, DKI Jakarta 12190',
    spent: 2250000,
    tierTarget: 3000000,
    tierEvaluation: '31 Des 2026',
    vouchers: [
      { title: 'Voucher Ultah 15%', meta: 's/d 31 Okt', icon: '🎂' },
      { title: 'Gratis Ongkir Atelier', meta: 'Aktif', icon: '🚚' }
    ],
    isNew: false
  };

  /* --------------------------- KATALOG VOUCHER --------------------------- */
  var VOUCHER_CATALOG = [
    { id: 'ongkir', title: 'Gratis Ongkir Atelier', desc: 'Bebas ongkir se-Jabodetabek untuk 1x transaksi.', cost: 200, icon: '🚚', expiry: 's/d 30 Nov 2026' },
    { id: 'potong10', title: 'Voucher Potongan 10%', desc: 'Diskon 10% maksimal Rp 150.000 semua koleksi.', cost: 350, icon: '🎟️', expiry: 's/d 31 Des 2026' },
    { id: 'diskon50', title: 'Voucher Diskon Rp 50.000', desc: 'Potongan langsung tanpa minimum pembelian.', cost: 500, icon: '💎', expiry: 's/d 31 Des 2026' },
    { id: 'birthday', title: 'Voucher Ultah 15%', desc: 'Diskon spesial ulang tahun, berlaku 14 hari.', cost: 650, icon: '🎂', expiry: 's/d 31 Okt 2026' },
    { id: 'tote', title: 'Exclusive Fascinosa Tote Bag', desc: 'Merchandise eksklusif edisi terbatas atelier.', cost: 1500, icon: '👜', expiry: 'Selama stok tersedia' }
  ];

  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  /* ------------------------------ UTILITIES ------------------------------ */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null || raw === undefined || raw === '') return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function formatIDR(value) {
    var n = Number(value) || 0;
    return 'Rp ' + n.toLocaleString('id-ID');
  }

  function formatPoints(value) {
    var n = Number(value) || 0;
    return n.toLocaleString('id-ID');
  }

  function generateMemberId() {
    var n;
    if (global.crypto && typeof global.crypto.getRandomValues === 'function') {
      var buf = new Uint32Array(1);
      global.crypto.getRandomValues(buf);
      n = buf[0];
    } else {
      n = Math.floor(Math.random() * 1000000);
    }
    var id = String(n % 1000000).padStart(6, '0');
    return 'MB-' + id;
  }

  function todayLabel() {
    var d = new Date();
    var dd = String(d.getDate()).padStart(2, '0');
    return dd + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear();
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  function normalizePhone(v) {
    return String(v).replace(/[^0-9]/g, '');
  }

  /* --------------------------------- TOAST -------------------------------- */
  function toast(message, type) {
    type = type || 'info';
    var wrap = document.getElementById('fsc-toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'fsc-toast-wrap';
      wrap.className = 'fsc-toast-wrap';
      wrap.setAttribute('role', 'status');
      wrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(wrap);
    }

    var icons = { success: '✓', error: '✕', info: 'i' };
    var el = document.createElement('div');
    el.className = 'fsc-toast fsc-toast--' + type;

    var icon = document.createElement('span');
    icon.className = 'fsc-toast__icon';
    icon.textContent = icons[type] || icons.info;

    var msg = document.createElement('span');
    msg.textContent = message;

    el.appendChild(icon);
    el.appendChild(msg);
    wrap.appendChild(el);

    requestAnimationFrame(function () {
      el.classList.add('is-visible');
    });

    setTimeout(function () {
      el.classList.remove('is-visible');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 350);
    }, 3400);
  }

  /* ---------------------------------- CORE -------------------------------- */
  function seed() {
    var users = read(KEYS.USERS, null);
    if (!Array.isArray(users) || users.length === 0) {
      write(KEYS.USERS, [clone(DEFAULT_USER)]);
    } else if (!users.some(function (u) { return u.memberId === DEFAULT_USER.memberId; })) {
      users.unshift(clone(DEFAULT_USER));
      write(KEYS.USERS, users);
    }
  }

  function getUsers() {
    var users = read(KEYS.USERS, null);
    if (!Array.isArray(users) || users.length === 0) {
      seed();
      users = read(KEYS.USERS, []);
    }
    return users;
  }

  function saveUsers(users) {
    write(KEYS.USERS, users);
  }

  function findUser(identifier) {
    var id = String(identifier || '').trim().toLowerCase();
    var phone = normalizePhone(identifier);
    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      var u = users[i];
      if (String(u.email || '').toLowerCase() === id) return u;
      if (phone && normalizePhone(u.phone) === phone) return u;
      if (String(u.memberId || '').toLowerCase() === id) return u;
    }
    return null;
  }

  function getCurrentUser() {
    var session = read(KEYS.SESSION, null);
    if (!session) return null;
    // sinkronkan dengan data terbaru di tabel users
    var fresh = findUser(session.memberId) || findUser(session.email) || session;
    return fresh;
  }

  function setCurrentUser(user) {
    write(KEYS.SESSION, user);
    write(KEYS.LOGIN, 'true');
  }

  function isLoggedIn() {
    var flag = localStorage.getItem(KEYS.LOGIN);
    if (flag !== 'true') return false;
    return !!read(KEYS.SESSION, null);
  }

  /**
   * Login sederhana.
   * - Identifier & password wajib terisi (sesuai kebutuhan demo).
   * - Bila identifier cocok dengan user terdaftar -> gunakan data user tsb.
   * - Bila identifier belum terdaftar -> auto-provision akun demo baru.
   */
  function login(identifier, password) {
    var id = String(identifier || '').trim();
    var pw = String(password || '').trim();

    if (!id) return { ok: false, message: 'Isi Nomor HP / Email terlebih dahulu.' };
    if (!pw) return { ok: false, message: 'Password wajib diisi.' };

    var existing = findUser(id);
    if (existing) {
      if (existing.password && existing.password !== pw) {
        return {
          ok: false,
          message: 'Password tidak sesuai. Untuk akun demo gunakan "password123".'
        };
      }
      setCurrentUser(existing);
      return { ok: true, user: existing, message: 'Login berhasil. Mengarahkan ke Member Area...' };
    }

    // Akun baru (demo) — data disimpan agar tampil konsisten di member area
    var isEmail = isValidEmail(id);
    var autoName = isEmail
      ? id.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); })
      : 'Member Fascinosa';

    var newUser = {
      memberId: generateMemberId(),
      name: autoName,
      phone: isEmail ? '-' : normalizePhone(id),
      email: isEmail ? id : autoName.replace(/\s+/g, '').toLowerCase() + '@fascinosa.id',
      password: pw,
      joinedDate: todayLabel(),
      joinedYear: String(new Date().getFullYear()),
      points: 250,
      tier: 'SILVER MEMBER',
      birthday: '-',
      address: '-',
      spent: 0,
      tierTarget: 3000000,
      tierEvaluation: '31 Des 2026',
      vouchers: [
        { title: 'Voucher Selamat Datang', meta: 'Aktif', icon: '🎁' }
      ],
      isNew: true
    };

    var users = getUsers();
    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);

    return { ok: true, user: newUser, message: 'Akun demo dibuat. Mengarahkan ke Member Area...' };
  }

  function register(data) {
    data = data || {};
    var name = String(data.name || '').trim();
    var phone = normalizePhone(data.phone);
    var email = String(data.email || '').trim().toLowerCase();
    var password = String(data.password || '');

    if (name.length < 2) return { ok: false, message: 'Nama lengkap minimal 2 karakter.' };
    if (phone.length < 9) return { ok: false, message: 'Nomor HP tidak valid (min. 9 digit).' };
    if (!isValidEmail(email)) return { ok: false, message: 'Format email tidak valid.' };
    if (password.length < 6) return { ok: false, message: 'Password minimal 6 karakter.' };
    if (findUser(email) || findUser(phone)) {
      return { ok: false, message: 'Email / No HP sudah terdaftar. Silakan login.' };
    }

    var user = {
      memberId: generateMemberId(),
      name: name,
      phone: phone,
      email: email,
      password: password,
      joinedDate: todayLabel(),
      joinedYear: String(new Date().getFullYear()),
      points: 250,
      tier: 'SILVER MEMBER',
      birthday: '-',
      address: '-',
      spent: 0,
      tierTarget: 3000000,
      tierEvaluation: '31 Des 2026',
      vouchers: [
        { title: 'Voucher Selamat Datang', meta: 'Aktif', icon: '🎁' }
      ],
      isNew: true
    };

    var users = getUsers();
    users.push(user);
    saveUsers(users);
    setCurrentUser(user);
    write(KEYS.REGISTERED, String(Date.now()));

    return { ok: true, user: user, message: 'Pendaftaran berhasil! Member ID ' + user.memberId + ' telah dibuat.' };
  }

  function logout() {
    try {
      localStorage.removeItem(KEYS.SESSION);
      localStorage.setItem(KEYS.LOGIN, 'false');
    } catch (e) { /* ignore */ }
  }

  function requireLogin(redirectTo) {
    if (!isLoggedIn()) {
      global.location.replace(redirectTo || 'login.html');
      return false;
    }
    return true;
  }

  function updateProfile(patch) {
    var user = getCurrentUser();
    if (!user) return { ok: false, message: 'Sesi tidak ditemukan.' };
    patch = patch || {};

    if (typeof patch.name === 'string' && patch.name.trim().length >= 2) user.name = patch.name.trim();
    if (typeof patch.phone === 'string' && normalizePhone(patch.phone).length >= 9) user.phone = normalizePhone(patch.phone);
    if (typeof patch.email === 'string' && isValidEmail(patch.email.trim())) user.email = patch.email.trim().toLowerCase();
    if (typeof patch.address === 'string') user.address = patch.address.trim() || '-';
    if (typeof patch.birthday === 'string') user.birthday = patch.birthday.trim() || '-';

    var users = getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].memberId === user.memberId) users[i] = user;
    }
    saveUsers(users);
    setCurrentUser(user);
    return { ok: true, user: user, message: 'Profil berhasil diperbarui.' };
  }

  /* -------------------------- POIN & VOUCHER ----------------------------- */
  function redeemVoucher(voucherId) {
    var user = getCurrentUser();
    if (!user) return { ok: false, message: 'Silakan login terlebih dahulu.' };

    var voucher = null;
    for (var i = 0; i < VOUCHER_CATALOG.length; i++) {
      if (VOUCHER_CATALOG[i].id === voucherId) voucher = VOUCHER_CATALOG[i];
    }
    if (!voucher) return { ok: false, message: 'Voucher tidak ditemukan.' };

    var points = Number(user.points) || 0;
    if (points < voucher.cost) {
      return {
        ok: false,
        message: 'Poin tidak cukup. Butuh ' + formatPoints(voucher.cost) + ' Pts, saldo kamu ' + formatPoints(points) + ' Pts.'
      };
    }

    user.points = points - voucher.cost;
    user.vouchers = Array.isArray(user.vouchers) ? user.vouchers : [];
    user.vouchers.push({ title: voucher.title, meta: voucher.expiry, icon: voucher.icon });

    var users = getUsers();
    for (var j = 0; j < users.length; j++) {
      if (users[j].memberId === user.memberId) users[j] = user;
    }
    saveUsers(users);
    setCurrentUser(user);

    return {
      ok: true,
      user: user,
      message: 'Berhasil ditukar! ' + voucher.title + ' sudah masuk ke daftar voucher kamu.'
    };
  }

  /* ------------------------------- KERANJANG ----------------------------- */
  function getCart() {
    var cart = read(KEYS.CART, []);
    return Array.isArray(cart) ? cart : [];
  }

  function addToCart(item) {
    var cart = getCart();
    cart.push(item || { title: 'Produk Fascinosa' });
    write(KEYS.CART, cart);
    return cart.length;
  }

  function clearCart() {
    write(KEYS.CART, []);
    return 0;
  }

  /* --------------------------------- INIT --------------------------------- */
  function init() {
    seed();
    // Pastikan flag login selalu konsisten dengan sesi
    if (!read(KEYS.SESSION, null) && localStorage.getItem(KEYS.LOGIN) === 'true') {
      localStorage.setItem(KEYS.LOGIN, 'false');
    }
  }

  /* -------------------------------- EXPORT -------------------------------- */
  global.FSC = {
    KEYS: KEYS,
    DEFAULT_USER: DEFAULT_USER,
    VOUCHER_CATALOG: VOUCHER_CATALOG,
    init: init,
    seed: seed,
    getUsers: getUsers,
    findUser: findUser,
    getCurrentUser: getCurrentUser,
    setCurrentUser: setCurrentUser,
    isLoggedIn: isLoggedIn,
    login: login,
    register: register,
    logout: logout,
    requireLogin: requireLogin,
    updateProfile: updateProfile,
    redeemVoucher: redeemVoucher,
    getCart: getCart,
    addToCart: addToCart,
    clearCart: clearCart,
    generateMemberId: generateMemberId,
    formatIDR: formatIDR,
    formatPoints: formatPoints,
    todayLabel: todayLabel,
    toast: toast
  };
})(window);

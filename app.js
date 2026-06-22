/************************************************************
 * app.js
 * S&LP Website Portal
 ************************************************************/

(function (window, document) {
  'use strict';

  const CONFIG = window.APP_CONFIG || {};
  const API = window.SLP_API || null;
  const ALL_CATEGORY = 'ทั้งหมด';

  const state = {
    websites: [],
    categories: [],
    activeCategory: ALL_CATEGORY,
    searchText: '',
    loading: false,
    loggingIn: false,
    sessionTimer: null
  };

  const el = {};

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheElements();
    applyConfig();
    bindEvents();

    if (!API) {
      showLoginView();
      setSystemStatus('offline', 'ไม่พบไฟล์ api.js');
      setLoginMessage('ไม่พบระบบเชื่อมต่อ API กรุณาตรวจสอบไฟล์ api.js');
      return;
    }

    checkHealth();

    const session = API.getSession();
    if (session) {
      setCurrentUser(session.user && session.user.name);
      showPortalView();
      scheduleSessionExpiry();
      await loadWebsites(false);
    } else {
      showLoginView();
      window.setTimeout(function () {
        if (el.passwordInput) el.passwordInput.focus();
      }, 200);
    }
  }

  function cacheElements() {
    const ids = [
      'loginView',
      'portalView',
      'loginForm',
      'passwordInput',
      'togglePasswordButton',
      'eyeOpenIcon',
      'eyeClosedIcon',
      'loginMessage',
      'loginButton',
      'loginButtonText',
      'loginButtonSpinner',
      'systemStatusDot',
      'systemStatusText',
      'loginLogo',
      'portalLogo',
      'currentUserName',
      'dropdownUserName',
      'userAvatar',
      'userMenuButton',
      'userDropdown',
      'logoutButton',
      'welcomeGreeting',
      'refreshButton',
      'totalWebsiteCount',
      'totalCategoryCount',
      'searchInput',
      'clearSearchButton',
      'categoryTabs',
      'resultCountText',
      'websiteLoadingState',
      'websiteGrid',
      'emptyState',
      'emptyStateTitle',
      'emptyStateMessage',
      'errorState',
      'errorStateMessage',
      'retryButton',
      'loadingOverlay',
      'loadingText',
      'toastContainer',
      'confirmModal',
      'cancelModalButton',
      'confirmModalButton'
    ];

    ids.forEach(function (id) {
      el[id] = document.getElementById(id);
    });
  }

  function applyConfig() {
    const logoUrl = normalizeText(CONFIG.LOGO_URL) ||
      'https://lh5.googleusercontent.com/d/1HicYHV18UaA5y4GFyHJaG9aNI-qjIzIY';

    if (el.loginLogo) el.loginLogo.src = logoUrl;
    if (el.portalLogo) el.portalLogo.src = logoUrl;

    document.title = (normalizeText(CONFIG.APP_NAME) || 'S&LP Portal') +
      ' | Website Portal';
  }

  function bindEvents() {
    if (el.loginForm) {
      el.loginForm.addEventListener('submit', handleLogin);
    }

    if (el.passwordInput) {
      el.passwordInput.addEventListener('input', function () {
        setLoginMessage('');
        el.passwordInput.classList.remove('input-error');
      });
    }

    if (el.togglePasswordButton) {
      el.togglePasswordButton.addEventListener('click', togglePassword);
    }

    if (el.refreshButton) {
      el.refreshButton.addEventListener('click', function () {
        loadWebsites(true);
      });
    }

    if (el.retryButton) {
      el.retryButton.addEventListener('click', function () {
        loadWebsites(false);
      });
    }

    if (el.searchInput) {
      el.searchInput.addEventListener('input', function () {
        state.searchText = normalizeText(el.searchInput.value).toLowerCase();
        if (el.clearSearchButton) {
          el.clearSearchButton.hidden = !state.searchText;
        }
        renderWebsites();
      });
    }

    if (el.clearSearchButton) {
      el.clearSearchButton.addEventListener('click', function () {
        state.searchText = '';
        if (el.searchInput) {
          el.searchInput.value = '';
          el.searchInput.focus();
        }
        el.clearSearchButton.hidden = true;
        renderWebsites();
      });
    }

    if (el.categoryTabs) {
      el.categoryTabs.addEventListener('click', function (event) {
        const button = event.target.closest('.category-tab');
        if (!button) return;
        state.activeCategory = normalizeText(button.dataset.category) || ALL_CATEGORY;
        updateCategoryButtons();
        renderWebsites();
      });
    }

    if (el.websiteGrid) {
      el.websiteGrid.addEventListener('click', function (event) {
        const card = event.target.closest('.website-card');
        if (!card) return;
        openWebsite(card.dataset.link);
      });

      el.websiteGrid.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const card = event.target.closest('.website-card');
        if (!card) return;
        event.preventDefault();
        openWebsite(card.dataset.link);
      });
    }

    if (el.userMenuButton) {
      el.userMenuButton.addEventListener('click', function (event) {
        event.stopPropagation();
        const open = el.userDropdown && el.userDropdown.hidden;
        if (el.userDropdown) el.userDropdown.hidden = !open;
        el.userMenuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    if (el.logoutButton) {
      el.logoutButton.addEventListener('click', openLogoutModal);
    }

    if (el.cancelModalButton) {
      el.cancelModalButton.addEventListener('click', closeLogoutModal);
    }

    if (el.confirmModalButton) {
      el.confirmModalButton.addEventListener('click', logout);
    }

    if (el.confirmModal) {
      el.confirmModal.addEventListener('click', function (event) {
        if (event.target === el.confirmModal) closeLogoutModal();
      });
    }

    document.addEventListener('click', function (event) {
      if (
        el.userDropdown &&
        !el.userDropdown.hidden &&
        el.userMenuButton &&
        !el.userDropdown.contains(event.target) &&
        !el.userMenuButton.contains(event.target)
      ) {
        closeUserMenu();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      closeUserMenu();
      closeLogoutModal();
    });

    window.addEventListener('online', checkHealth);
    window.addEventListener('offline', function () {
      setSystemStatus('offline', 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต');
    });
  }

  async function checkHealth() {
    if (!API) return;

    if (!window.navigator.onLine) {
      setSystemStatus('offline', 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต');
      return;
    }

    setSystemStatus('checking', 'กำลังตรวจสอบสถานะระบบ');

    try {
      await API.health();
      setSystemStatus('online', 'ระบบพร้อมใช้งาน');
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemStatus('offline', getErrorMessage(error, 'ไม่สามารถเชื่อมต่อระบบได้'));
    }
  }

  function setSystemStatus(status, message) {
    if (el.systemStatusDot) {
      el.systemStatusDot.classList.remove('is-checking', 'is-online', 'is-offline');
      if (status === 'checking') el.systemStatusDot.classList.add('is-checking');
      if (status === 'online') el.systemStatusDot.classList.add('is-online');
      if (status === 'offline') el.systemStatusDot.classList.add('is-offline');
    }
    if (el.systemStatusText) el.systemStatusText.textContent = message;
  }

  async function handleLogin(event) {
    event.preventDefault();

    if (state.loggingIn || !API) return;

    const pass = normalizeText(el.passwordInput && el.passwordInput.value);
    if (!pass) {
      setLoginMessage('กรุณากรอกรหัสผ่าน');
      if (el.passwordInput) {
        el.passwordInput.classList.add('input-error');
        el.passwordInput.focus();
      }
      return;
    }

    state.loggingIn = true;
    setLoginBusy(true);
    setLoginMessage('');

    try {
      const result = await API.login(pass);
      const userName = normalizeText(result && result.user && result.user.name) || 'ผู้ใช้งาน';

      if (el.passwordInput) el.passwordInput.value = '';
      setCurrentUser(userName);
      showPortalView();
      scheduleSessionExpiry();
      await loadWebsites(false);
      showToast('success', 'เข้าสู่ระบบสำเร็จ', 'ยินดีต้อนรับ ' + userName);
    } catch (error) {
      console.error('Login failed:', error);
      setLoginMessage(getErrorMessage(error, 'เข้าสู่ระบบไม่สำเร็จ'));
      if (el.passwordInput) {
        el.passwordInput.classList.add('input-error');
        el.passwordInput.focus();
        el.passwordInput.select();
      }
    } finally {
      state.loggingIn = false;
      setLoginBusy(false);
    }
  }

  function setLoginBusy(busy) {
    if (el.loginButton) el.loginButton.disabled = busy;
    if (el.passwordInput) el.passwordInput.disabled = busy;
    if (el.loginButtonText) {
      el.loginButtonText.textContent = busy ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ';
    }
    if (el.loginButtonSpinner) el.loginButtonSpinner.hidden = !busy;
  }

  function setLoginMessage(message, success) {
    if (!el.loginMessage) return;
    el.loginMessage.textContent = normalizeText(message);
    el.loginMessage.classList.toggle('success', Boolean(success));
  }

  function togglePassword() {
    if (!el.passwordInput) return;
    const show = el.passwordInput.type === 'password';
    el.passwordInput.type = show ? 'text' : 'password';
    if (el.eyeOpenIcon) el.eyeOpenIcon.hidden = show;
    if (el.eyeClosedIcon) el.eyeClosedIcon.hidden = !show;
    el.togglePasswordButton.setAttribute('aria-label', show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
    el.passwordInput.focus();
  }

  function showLoginView() {
    if (el.loginView) el.loginView.hidden = false;
    if (el.portalView) el.portalView.hidden = true;
    closeUserMenu();
    closeLogoutModal();
  }

  function showPortalView() {
    if (el.loginView) el.loginView.hidden = true;
    if (el.portalView) el.portalView.hidden = false;
    window.scrollTo(0, 0);
  }

  function setCurrentUser(nameValue) {
    const name = normalizeText(nameValue) || 'ผู้ใช้งาน';
    if (el.currentUserName) el.currentUserName.textContent = name;
    if (el.dropdownUserName) el.dropdownUserName.textContent = name;
    if (el.userAvatar) el.userAvatar.textContent = Array.from(name)[0].toUpperCase();
    if (el.welcomeGreeting) el.welcomeGreeting.textContent = 'ยินดีต้อนรับ ' + name;
  }

  async function loadWebsites(showSuccessToast) {
    if (state.loading || !API) return;

    state.loading = true;
    setRefreshBusy(true);
    showListState('loading');

    try {
      const result = await API.getWebsites();
      state.websites = normalizeWebsites(result && result.websites);
      state.categories = buildCategories(state.websites, result && result.categories);

      const userName = normalizeText(result && result.user && result.user.name);
      if (userName) setCurrentUser(userName);

      if (
        state.activeCategory !== ALL_CATEGORY &&
        !state.categories.includes(state.activeCategory)
      ) {
        state.activeCategory = ALL_CATEGORY;
      }

      renderCategories();
      updateSummary();
      renderWebsites();

      if (showSuccessToast) {
        showToast('success', 'โหลดข้อมูลสำเร็จ', 'พบเว็บไซต์ ' + state.websites.length + ' รายการ');
      }
    } catch (error) {
      console.error('Load websites failed:', error);

      if (isSessionError(error)) {
        expireSession(getErrorMessage(error, 'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่'));
        return;
      }

      showListState('error', getErrorMessage(error, 'ไม่สามารถโหลดรายการเว็บไซต์ได้'));
    } finally {
      state.loading = false;
      setRefreshBusy(false);
    }
  }

  function normalizeWebsites(value) {
    if (!Array.isArray(value)) return [];

    return value.map(function (item, index) {
      const name = normalizeText(item && item.name);
      const link = normalizeText(item && item.link);
      if (!name || !isHttpUrl(link)) return null;

      const sort = Number(item.sort);
      return {
        id: normalizeText(item.id) || 'website-' + index,
        name: name,
        link: link,
        category: normalizeText(item.category) || 'ทั่วไป',
        icon: normalizeText(item.icon) || 'link',
        sort: Number.isFinite(sort) ? sort : 9999
      };
    }).filter(Boolean).sort(function (a, b) {
      const categoryCompare = a.category.localeCompare(b.category, 'th');
      if (categoryCompare !== 0) return categoryCompare;
      if (a.sort !== b.sort) return a.sort - b.sort;
      return a.name.localeCompare(b.name, 'th');
    });
  }

  function buildCategories(websites, returnedCategories) {
    const result = [];

    if (Array.isArray(returnedCategories)) {
      returnedCategories.forEach(function (value) {
        const category = normalizeText(value);
        if (category && !result.includes(category)) result.push(category);
      });
    }

    websites.forEach(function (website) {
      if (!result.includes(website.category)) result.push(website.category);
    });

    return result;
  }

  function renderCategories() {
    if (!el.categoryTabs) return;
    el.categoryTabs.replaceChildren();

    [ALL_CATEGORY].concat(state.categories).forEach(function (category) {
      const button = document.createElement('button');
      const active = category === state.activeCategory;
      button.type = 'button';
      button.className = 'category-tab' + (active ? ' active' : '');
      button.dataset.category = category;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.textContent = category;
      el.categoryTabs.appendChild(button);
    });
  }

  function updateCategoryButtons() {
    if (!el.categoryTabs) return;
    el.categoryTabs.querySelectorAll('.category-tab').forEach(function (button) {
      const active = button.dataset.category === state.activeCategory;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
  }

  function updateSummary() {
    if (el.totalWebsiteCount) el.totalWebsiteCount.textContent = String(state.websites.length);
    if (el.totalCategoryCount) el.totalCategoryCount.textContent = String(state.categories.length);
  }

  function getFilteredWebsites() {
    return state.websites.filter(function (website) {
      const categoryMatch =
        state.activeCategory === ALL_CATEGORY || website.category === state.activeCategory;
      if (!categoryMatch) return false;
      if (!state.searchText) return true;

      return [website.name, website.category, website.link]
        .join(' ')
        .toLowerCase()
        .includes(state.searchText);
    });
  }

  function renderWebsites() {
    if (!el.websiteGrid) return;

    const websites = getFilteredWebsites();
    el.websiteGrid.replaceChildren();

    if (state.websites.length === 0) {
      showListState('empty', 'ยังไม่มีรายการเว็บไซต์', 'กรุณาเพิ่มข้อมูลในชีต Sheet1');
      updateResultCount(0);
      return;
    }

    if (websites.length === 0) {
      showListState('empty', 'ไม่พบเว็บไซต์', 'ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น');
      updateResultCount(0);
      return;
    }

    const fragment = document.createDocumentFragment();
    websites.forEach(function (website, index) {
      fragment.appendChild(createWebsiteCard(website, index));
    });

    el.websiteGrid.appendChild(fragment);
    showListState('grid');
    updateResultCount(websites.length);
  }

  function createWebsiteCard(website, index) {
    const card = document.createElement('article');
    card.className = 'website-card theme-' + ((index % 6) + 1);
    card.dataset.link = website.link;
    card.tabIndex = 0;
    card.setAttribute('role', 'link');
    card.setAttribute('aria-label', 'เปิดเว็บไซต์ ' + website.name);

    const main = document.createElement('div');
    main.className = 'website-card-main';

    const top = document.createElement('div');
    top.className = 'website-card-top';

    const icon = document.createElement('span');
    icon.className = 'website-card-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = getIconSvg(resolveIcon(website));

    const arrow = document.createElement('span');
    arrow.className = 'website-card-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>';

    top.append(icon, arrow);

    const category = document.createElement('span');
    category.className = 'website-card-category';
    category.textContent = website.category;

    const name = document.createElement('h3');
    name.className = 'website-card-name';
    name.textContent = website.name;

    const hostname = document.createElement('span');
    hostname.className = 'website-card-link';
    hostname.textContent = getHostname(website.link);

    main.append(top, category, name, hostname);

    const footer = document.createElement('div');
    footer.className = 'website-card-footer';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'website-open-button';
    button.textContent = 'เปิดใช้งาน';
    footer.appendChild(button);

    card.append(main, footer);
    return card;
  }

  function showListState(type, message, detail) {
    if (el.websiteLoadingState) el.websiteLoadingState.hidden = true;
    if (el.websiteGrid) el.websiteGrid.hidden = true;
    if (el.emptyState) el.emptyState.hidden = true;
    if (el.errorState) el.errorState.hidden = true;

    if (type === 'loading') {
      if (el.websiteLoadingState) el.websiteLoadingState.hidden = false;
      if (el.resultCountText) el.resultCountText.textContent = 'กำลังโหลดข้อมูล';
      return;
    }

    if (type === 'grid') {
      if (el.websiteGrid) el.websiteGrid.hidden = false;
      return;
    }

    if (type === 'empty') {
      if (el.emptyState) el.emptyState.hidden = false;
      if (el.emptyStateTitle) el.emptyStateTitle.textContent = message || 'ไม่พบเว็บไซต์';
      if (el.emptyStateMessage) el.emptyStateMessage.textContent = detail || '';
      return;
    }

    if (type === 'error') {
      if (el.errorState) el.errorState.hidden = false;
      if (el.errorStateMessage) el.errorStateMessage.textContent = message || 'กรุณาลองใหม่อีกครั้ง';
      if (el.resultCountText) el.resultCountText.textContent = 'โหลดข้อมูลไม่สำเร็จ';
    }
  }

  function updateResultCount(count) {
    if (!el.resultCountText) return;
    el.resultCountText.textContent = 'พบ ' + count + ' รายการ' +
      (state.activeCategory === ALL_CATEGORY ? '' : ' ในหมวด ' + state.activeCategory);
  }

  function openWebsite(linkValue) {
    const link = normalizeText(linkValue);
    if (!isHttpUrl(link)) {
      showToast('error', 'เปิดเว็บไซต์ไม่ได้', 'ลิงก์เว็บไซต์ไม่ถูกต้อง');
      return;
    }

    const opened = window.open(link, '_blank', 'noopener,noreferrer');
    if (!opened) {
      showToast('warning', 'เปิดหน้าต่างใหม่ไม่ได้', 'กรุณาอนุญาต Pop-up แล้วลองอีกครั้ง');
    }
  }

  function resolveIcon(website) {
    const specified = normalizeText(website.icon).toLowerCase();
    if (specified && specified !== 'link') return specified;

    const text = (website.name + ' ' + website.category).toLowerCase();
    if (text.includes('ประตู') || text.includes('door')) return 'door';
    if (text.includes('ดับเพลิง') || text.includes('fire')) return 'fire';
    if (text.includes('แอลกอฮอล์') || text.includes('alcohol')) return 'alcohol';
    if (text.includes('รายงาน') || text.includes('report')) return 'report';
    if (text.includes('เสี่ยง') || text.includes('risk')) return 'risk';
    if (text.includes('รักษาความปลอดภัย') || text.includes('security')) return 'shield';
    if (text.includes('ตรวจ') || text.includes('check')) return 'checklist';
    if (text.includes('รถ') || text.includes('car')) return 'car';
    if (text.includes('dashboard') || text.includes('แดชบอร์ด')) return 'dashboard';
    return 'link';
  }

  function getIconSvg(name) {
    const icons = {
      link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"></path><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"></path></svg>',
      shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>',
      door: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21h16"></path><path d="M6 21V3h10v18"></path><path d="M16 5h2v16"></path><path d="M12 12h.01"></path></svg>',
      fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4.4 0 8-3.6 8-8 0-5-4-8-6-11 0 3-2 5-4 6-2-2-3-4-3-6-2 3-3 6-3 9 0 5.5 3.6 10 8 10Z"></path></svg>',
      alcohol: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2h8l-1 7a4 4 0 0 1-8 0Z"></path><path d="M12 13v9"></path><path d="M8 22h8"></path></svg>',
      report: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h8"></path></svg>',
      risk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',
      checklist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="m8 9 1.5 1.5L12 8"></path><path d="M14 9h3"></path><path d="m8 15 1.5 1.5L12 14"></path><path d="M14 15h3"></path></svg>',
      car: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3v-5l2-5h14l2 5v5h-2"></path><path d="M5 17h14"></path><circle cx="6.5" cy="17.5" r="1.5"></circle><circle cx="17.5" cy="17.5" r="1.5"></circle></svg>',
      dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>'
    };
    return icons[name] || icons.link;
  }

  function setRefreshBusy(busy) {
    if (!el.refreshButton) return;
    el.refreshButton.disabled = busy;
    el.refreshButton.classList.toggle('is-loading', busy);
  }

  function openLogoutModal() {
    closeUserMenu();
    if (!el.confirmModal) return;
    el.confirmModal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeLogoutModal() {
    if (el.confirmModal) el.confirmModal.hidden = true;
    document.body.classList.remove('modal-open');
  }

  function closeUserMenu() {
    if (el.userDropdown) el.userDropdown.hidden = true;
    if (el.userMenuButton) el.userMenuButton.setAttribute('aria-expanded', 'false');
  }

  async function logout() {
    closeLogoutModal();
    showOverlay('กำลังออกจากระบบ...');

    try {
      if (API) await API.logout();
    } catch (error) {
      console.warn('Logout failed:', error);
    } finally {
      clearSessionTimer();
      state.websites = [];
      state.categories = [];
      state.activeCategory = ALL_CATEGORY;
      state.searchText = '';
      hideOverlay();
      showLoginView();
      setLoginMessage('ออกจากระบบแล้ว', true);
      if (el.passwordInput) {
        el.passwordInput.value = '';
        el.passwordInput.focus();
      }
    }
  }

  function scheduleSessionExpiry() {
    clearSessionTimer();
    if (!API) return;

    const session = API.getSession();
    if (!session || !Number.isFinite(session.expiresTime)) return;

    const remaining = session.expiresTime - Date.now();
    if (remaining <= 0) {
      expireSession('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
      return;
    }

    state.sessionTimer = window.setTimeout(function () {
      expireSession('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }, Math.min(remaining, 2147483647));
  }

  function clearSessionTimer() {
    if (!state.sessionTimer) return;
    window.clearTimeout(state.sessionTimer);
    state.sessionTimer = null;
  }

  function expireSession(message) {
    clearSessionTimer();
    if (API) API.clearSession();
    showLoginView();
    setLoginMessage(message);
    showToast('warning', 'กรุณาเข้าสู่ระบบใหม่', message);
    if (el.passwordInput) {
      el.passwordInput.value = '';
      el.passwordInput.focus();
    }
  }

  function isSessionError(error) {
    const code = normalizeText(error && error.code).toUpperCase();
    return Number(error && error.status) === 401 ||
      code === 'SESSION_REQUIRED' ||
      code === 'SESSION_INVALID' ||
      code === 'SESSION_EXPIRED';
  }

  function showOverlay(message) {
    if (el.loadingText) el.loadingText.textContent = message || 'กำลังดำเนินการ...';
    if (el.loadingOverlay) el.loadingOverlay.hidden = false;
  }

  function hideOverlay() {
    if (el.loadingOverlay) el.loadingOverlay.hidden = true;
  }

  function showToast(type, title, message) {
    if (!el.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');

    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = type === 'success' ? '✓' : type === 'error' ? '×' : type === 'warning' ? '!' : 'i';

    const content = document.createElement('span');
    content.className = 'toast-content';

    const strong = document.createElement('strong');
    strong.className = 'toast-title';
    strong.textContent = title || 'แจ้งเตือน';

    const text = document.createElement('span');
    text.className = 'toast-message';
    text.textContent = message || '';

    content.append(strong, text);
    toast.append(icon, content);
    el.toastContainer.appendChild(toast);

    window.setTimeout(function () {
      toast.classList.add('toast-leaving');
      window.setTimeout(function () { toast.remove(); }, 250);
    }, 3200);
  }

  function getHostname(link) {
    try {
      return new URL(link).hostname.replace(/^www\./i, '');
    } catch (error) {
      return link;
    }
  }

  function isHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (error) {
      return false;
    }
  }

  function getErrorMessage(error, fallback) {
    return normalizeText(error && error.message) || fallback || 'เกิดข้อผิดพลาดในการใช้งานระบบ';
  }

  function normalizeText(value) {
    return String(value == null ? '' : value).trim();
  }

})(window, document);

/************************************************************

* app.js
* S&LP Website Portal
*
* หน้าที่:
* * ตรวจสอบสถานะระบบ
* * เข้าสู่ระบบ
* * ตรวจสอบ Session เดิม
* * โหลดรายการเว็บไซต์จาก Google Sheet
* * ค้นหาและกรองหมวดหมู่
* * เปิดเว็บไซต์ในแท็บใหม่
* * ออกจากระบบ
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
isLoadingWebsites: false,
isLoggingIn: false,
sessionTimer: null,
initialized: false
};

const elements = {};

/************************************************************

* INITIALIZE
  ************************************************************/

document.addEventListener(
'DOMContentLoaded',
initializeApplication
);

async function initializeApplication() {
if (state.initialized) {
return;
}

```
state.initialized = true;

cacheElements();
applyApplicationConfig();
bindEvents();

if (!API) {
  showLoginView();

  setSystemStatus(
    'offline',
    'ไม่พบไฟล์ api.js'
  );

  showLoginMessage(
    'ไม่พบระบบเชื่อมต่อ API กรุณาตรวจสอบไฟล์ api.js'
  );

  return;
}

checkSystemHealth();

const session = API.getSession();

if (session) {
  updateCurrentUser(
    session.user &&
    session.user.name
  );

  showPortalView();
  scheduleSessionExpiry();

  await loadWebsites({
    showSuccessToast: false
  });

  return;
}

showLoginView();

window.setTimeout(function () {
  if (elements.passwordInput) {
    elements.passwordInput.focus();
  }
}, 250);
```

}

/************************************************************

* CACHE ELEMENTS
  ************************************************************/

function cacheElements() {
elements.loginView =
document.getElementById('loginView');

```
elements.portalView =
  document.getElementById('portalView');

elements.loginForm =
  document.getElementById('loginForm');

elements.passwordInput =
  document.getElementById('passwordInput');

elements.togglePasswordButton =
  document.getElementById(
    'togglePasswordButton'
  );

elements.eyeOpenIcon =
  document.getElementById('eyeOpenIcon');

elements.eyeClosedIcon =
  document.getElementById('eyeClosedIcon');

elements.loginMessage =
  document.getElementById('loginMessage');

elements.loginButton =
  document.getElementById('loginButton');

elements.loginButtonText =
  document.getElementById(
    'loginButtonText'
  );

elements.loginButtonSpinner =
  document.getElementById(
    'loginButtonSpinner'
  );

elements.systemStatusDot =
  document.getElementById(
    'systemStatusDot'
  );

elements.systemStatusText =
  document.getElementById(
    'systemStatusText'
  );

elements.loginLogo =
  document.getElementById('loginLogo');

elements.portalLogo =
  document.getElementById('portalLogo');

elements.currentUserName =
  document.getElementById(
    'currentUserName'
  );

elements.dropdownUserName =
  document.getElementById(
    'dropdownUserName'
  );

elements.userAvatar =
  document.getElementById('userAvatar');

elements.userMenuButton =
  document.getElementById(
    'userMenuButton'
  );

elements.userDropdown =
  document.getElementById(
    'userDropdown'
  );

elements.logoutButton =
  document.getElementById(
    'logoutButton'
  );

elements.welcomeGreeting =
  document.getElementById(
    'welcomeGreeting'
  );

elements.refreshButton =
  document.getElementById(
    'refreshButton'
  );

elements.totalWebsiteCount =
  document.getElementById(
    'totalWebsiteCount'
  );

elements.totalCategoryCount =
  document.getElementById(
    'totalCategoryCount'
  );

elements.searchInput =
  document.getElementById(
    'searchInput'
  );

elements.clearSearchButton =
  document.getElementById(
    'clearSearchButton'
  );

elements.categoryTabs =
  document.getElementById(
    'categoryTabs'
  );

elements.resultCountText =
  document.getElementById(
    'resultCountText'
  );

elements.websiteLoadingState =
  document.getElementById(
    'websiteLoadingState'
  );

elements.websiteGrid =
  document.getElementById(
    'websiteGrid'
  );

elements.emptyState =
  document.getElementById(
    'emptyState'
  );

elements.emptyStateTitle =
  document.getElementById(
    'emptyStateTitle'
  );

elements.emptyStateMessage =
  document.getElementById(
    'emptyStateMessage'
  );

elements.errorState =
  document.getElementById(
    'errorState'
  );

elements.errorStateMessage =
  document.getElementById(
    'errorStateMessage'
  );

elements.retryButton =
  document.getElementById(
    'retryButton'
  );

elements.loadingOverlay =
  document.getElementById(
    'loadingOverlay'
  );

elements.loadingText =
  document.getElementById(
    'loadingText'
  );

elements.toastContainer =
  document.getElementById(
    'toastContainer'
  );

elements.confirmModal =
  document.getElementById(
    'confirmModal'
  );

elements.cancelModalButton =
  document.getElementById(
    'cancelModalButton'
  );

elements.confirmModalButton =
  document.getElementById(
    'confirmModalButton'
  );
```

}

/************************************************************

* APPLICATION CONFIG
  ************************************************************/

function applyApplicationConfig() {
const logoUrl =
normalizeText(CONFIG.LOGO_URL) ||
'https://lh5.googleusercontent.com/d/1HicYHV18UaA5y4GFyHJaG9aNI-qjIzIY';

```
if (elements.loginLogo) {
  elements.loginLogo.src = logoUrl;
}

if (elements.portalLogo) {
  elements.portalLogo.src = logoUrl;
}

const appName =
  normalizeText(CONFIG.APP_NAME) ||
  'S&LP Portal';

document.title =
  appName + ' | Website Portal';
```

}

/************************************************************

* EVENT BINDING
  ************************************************************/

function bindEvents() {
if (elements.loginForm) {
elements.loginForm.addEventListener(
'submit',
handleLoginSubmit
);
}

```
if (elements.passwordInput) {
  elements.passwordInput.addEventListener(
    'input',
    handlePasswordInput
  );
}

if (elements.togglePasswordButton) {
  elements.togglePasswordButton
    .addEventListener(
      'click',
      togglePasswordVisibility
    );
}

if (elements.userMenuButton) {
  elements.userMenuButton.addEventListener(
    'click',
    toggleUserDropdown
  );
}

if (elements.logoutButton) {
  elements.logoutButton.addEventListener(
    'click',
    openLogoutModal
  );
}

if (elements.cancelModalButton) {
  elements.cancelModalButton
    .addEventListener(
      'click',
      closeLogoutModal
    );
}

if (elements.confirmModalButton) {
  elements.confirmModalButton
    .addEventListener(
      'click',
      confirmLogout
    );
}

if (elements.confirmModal) {
  elements.confirmModal.addEventListener(
    'click',
    function (event) {
      if (
        event.target ===
        elements.confirmModal
      ) {
        closeLogoutModal();
      }
    }
  );
}

if (elements.refreshButton) {
  elements.refreshButton.addEventListener(
    'click',
    function () {
      loadWebsites({
        showSuccessToast: true
      });
    }
  );
}

if (elements.retryButton) {
  elements.retryButton.addEventListener(
    'click',
    function () {
      loadWebsites({
        showSuccessToast: false
      });
    }
  );
}

if (elements.searchInput) {
  elements.searchInput.addEventListener(
    'input',
    handleSearchInput
  );
}

if (elements.clearSearchButton) {
  elements.clearSearchButton
    .addEventListener(
      'click',
      clearSearch
    );
}

if (elements.categoryTabs) {
  elements.categoryTabs.addEventListener(
    'click',
    handleCategoryClick
  );
}

if (elements.websiteGrid) {
  elements.websiteGrid.addEventListener(
    'click',
    handleWebsiteCardClick
  );

  elements.websiteGrid.addEventListener(
    'keydown',
    handleWebsiteCardKeydown
  );
}

document.addEventListener(
  'click',
  handleDocumentClick
);

document.addEventListener(
  'keydown',
  handleDocumentKeydown
);

window.addEventListener(
  'online',
  function () {
    checkSystemHealth();
  }
);

window.addEventListener(
  'offline',
  function () {
    setSystemStatus(
      'offline',
      'ไม่มีการเชื่อมต่ออินเทอร์เน็ต'
    );
  }
);
```

}

/************************************************************

* SYSTEM HEALTH
  ************************************************************/

async function checkSystemHealth() {
if (!API) {
return;
}

```
if (!window.navigator.onLine) {
  setSystemStatus(
    'offline',
    'ไม่มีการเชื่อมต่ออินเทอร์เน็ต'
  );

  return;
}

setSystemStatus(
  'checking',
  'กำลังตรวจสอบสถานะระบบ'
);

try {
  await API.health();

  setSystemStatus(
    'online',
    'ระบบพร้อมใช้งาน'
  );

} catch (error) {
  console.error(
    'Health check error:',
    error
  );

  setSystemStatus(
    'offline',
    getErrorMessage(
      error,
      'ไม่สามารถเชื่อมต่อระบบได้'
    )
  );
}
```

}

function setSystemStatus(
status,
message
) {
if (elements.systemStatusDot) {
elements.systemStatusDot.classList.remove(
'is-checking',
'is-online',
'is-offline'
);

```
  if (status === 'checking') {
    elements.systemStatusDot.classList.add(
      'is-checking'
    );
  }

  if (status === 'online') {
    elements.systemStatusDot.classList.add(
      'is-online'
    );
  }

  if (status === 'offline') {
    elements.systemStatusDot.classList.add(
      'is-offline'
    );
  }
}

if (elements.systemStatusText) {
  elements.systemStatusText.textContent =
    normalizeText(message);
}
```

}

/************************************************************

* LOGIN
  ************************************************************/

async function handleLoginSubmit(event) {
event.preventDefault();

```
if (
  state.isLoggingIn ||
  !API
) {
  return;
}

const pass =
  normalizeText(
    elements.passwordInput &&
    elements.passwordInput.value
  );

if (!pass) {
  showLoginMessage(
    'กรุณากรอกรหัสผ่าน'
  );

  setInputError(true);

  if (elements.passwordInput) {
    elements.passwordInput.focus();
  }

  return;
}

state.isLoggingIn = true;

setInputError(false);
showLoginMessage('');
setLoginBusy(true);

try {
  const result =
    await API.login(pass);

  const userName =
    normalizeText(
      result &&
      result.user &&
      result.user.name
    );

  updateCurrentUser(userName);

  if (elements.passwordInput) {
    elements.passwordInput.value = '';
  }

  showLoginMessage(
    'เข้าสู่ระบบสำเร็จ',
    true
  );

  showPortalView();
  scheduleSessionExpiry();

  await loadWebsites({
    showSuccessToast: false
  });

  showToast({
    type: 'success',
    title: 'เข้าสู่ระบบสำเร็จ',
    message:
      userName
        ? 'ยินดีต้อนรับ ' + userName
        : 'ยินดีต้อนรับเข้าสู่ระบบ'
  });

} catch (error) {
  console.error(
    'Login error:',
    error
  );

  setInputError(true);

  showLoginMessage(
    getErrorMessage(
      error,
      'เข้าสู่ระบบไม่สำเร็จ'
    )
  );

  if (elements.passwordInput) {
    elements.passwordInput.focus();
    elements.passwordInput.select();
  }

} finally {
  state.isLoggingIn = false;
  setLoginBusy(false);
}
```

}

function handlePasswordInput() {
setInputError(false);
showLoginMessage('');
}

function setLoginBusy(isBusy) {
if (elements.loginButton) {
elements.loginButton.disabled =
Boolean(isBusy);
}

```
if (elements.passwordInput) {
  elements.passwordInput.disabled =
    Boolean(isBusy);
}

if (elements.loginButtonText) {
  elements.loginButtonText.textContent =
    isBusy
      ? 'กำลังตรวจสอบ...'
      : 'เข้าสู่ระบบ';
}

if (elements.loginButtonSpinner) {
  elements.loginButtonSpinner.hidden =
    !isBusy;
}
```

}

function showLoginMessage(
message,
success
) {
if (!elements.loginMessage) {
return;
}

```
elements.loginMessage.textContent =
  normalizeText(message);

elements.loginMessage.classList.toggle(
  'success',
  Boolean(success)
);
```

}

function setInputError(hasError) {
if (!elements.passwordInput) {
return;
}

```
elements.passwordInput.classList.toggle(
  'input-error',
  Boolean(hasError)
);

elements.passwordInput.setAttribute(
  'aria-invalid',
  hasError ? 'true' : 'false'
);
```

}

function togglePasswordVisibility() {
if (!elements.passwordInput) {
return;
}

```
const isPassword =
  elements.passwordInput.type ===
  'password';

elements.passwordInput.type =
  isPassword
    ? 'text'
    : 'password';

if (elements.eyeOpenIcon) {
  elements.eyeOpenIcon.hidden =
    isPassword;
}

if (elements.eyeClosedIcon) {
  elements.eyeClosedIcon.hidden =
    !isPassword;
}

if (elements.togglePasswordButton) {
  elements.togglePasswordButton
    .setAttribute(
      'aria-label',
      isPassword
        ? 'ซ่อนรหัสผ่าน'
        : 'แสดงรหัสผ่าน'
    );
}

elements.passwordInput.focus();
```

}

/************************************************************

* VIEW CONTROL
  ************************************************************/

function showLoginView() {
if (elements.loginView) {
elements.loginView.hidden = false;
}

```
if (elements.portalView) {
  elements.portalView.hidden = true;
}

closeUserDropdown();
closeLogoutModal();

document.body.classList.remove(
  'modal-open'
);
```

}

function showPortalView() {
if (elements.loginView) {
elements.loginView.hidden = true;
}

```
if (elements.portalView) {
  elements.portalView.hidden = false;
}

window.scrollTo({
  top: 0,
  behavior: 'auto'
});
```

}

/************************************************************

* CURRENT USER
  ************************************************************/

function updateCurrentUser(nameValue) {
const name =
normalizeText(nameValue) ||
'ผู้ใช้งาน';

```
if (elements.currentUserName) {
  elements.currentUserName.textContent =
    name;
}

if (elements.dropdownUserName) {
  elements.dropdownUserName.textContent =
    name;
}

if (elements.userAvatar) {
  elements.userAvatar.textContent =
    getUserInitial(name);
}

if (elements.welcomeGreeting) {
  elements.welcomeGreeting.textContent =
    'ยินดีต้อนรับ ' + name;
}
```

}

function getUserInitial(name) {
const cleanName =
normalizeText(name);

```
if (!cleanName) {
  return 'S';
}

return Array.from(cleanName)[0]
  .toUpperCase();
```

}

/************************************************************

* LOAD WEBSITES
  ************************************************************/

async function loadWebsites(options) {
const settings =
options || {};

```
if (
  state.isLoadingWebsites ||
  !API
) {
  return;
}

state.isLoadingWebsites = true;

setRefreshBusy(true);
showWebsiteLoadingState();

try {
  const result =
    await API.getWebsites();

  const websites =
    normalizeWebsiteList(
      result &&
      result.websites
    );

  state.websites = websites;

  state.categories =
    createCategoryList(
      websites,
      result &&
      result.categories
    );

  const returnedUserName =
    normalizeText(
      result &&
      result.user &&
      result.user.name
    );

  if (returnedUserName) {
    updateCurrentUser(
      returnedUserName
    );
  }

  renderCategoryTabs();
  updateSummary();
  renderWebsiteList();

  if (settings.showSuccessToast) {
    showToast({
      type: 'success',
      title: 'โหลดข้อมูลสำเร็จ',
      message:
        'พบเว็บไซต์ ' +
        websites.length +
        ' รายการ'
    });
  }

} catch (error) {
  console.error(
    'Load websites error:',
    error
  );

  if (isSessionError(error)) {
    handleExpiredSession(
      getErrorMessage(
        error,
        'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่'
      )
    );

    return;
  }

  showWebsiteErrorState(
    getErrorMessage(
      error,
      'ไม่สามารถโหลดรายการเว็บไซต์ได้'
    )
  );

} finally {
  state.isLoadingWebsites = false;
  setRefreshBusy(false);
}
```

}

function normalizeWebsiteList(value) {
if (!Array.isArray(value)) {
return [];
}

```
return value
  .map(function (item, index) {
    const website =
      item &&
      typeof item === 'object'
        ? item
        : {};

    const name =
      normalizeText(
        website.name
      );

    const link =
      normalizeText(
        website.link
      );

    if (
      !name ||
      !isValidHttpUrl(link)
    ) {
      return null;
    }

    const sortNumber =
      Number(website.sort);

    return {
      id:
        normalizeText(
          website.id
        ) ||
        'website-' + index,

      name: name,
      link: link,

      category:
        normalizeText(
          website.category
        ) ||
        'ทั่วไป',

      icon:
        normalizeText(
          website.icon
        ) ||
        'link',

      sort:
        Number.isFinite(sortNumber)
          ? sortNumber
          : 9999
    };
  })
  .filter(Boolean)
  .sort(function (a, b) {
    const categoryCompare =
      a.category.localeCompare(
        b.category,
        'th'
      );

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    if (a.sort !== b.sort) {
      return a.sort - b.sort;
    }

    return a.name.localeCompare(
      b.name,
      'th'
    );
  });
```

}

function createCategoryList(
websites,
returnedCategories
) {
const categories = [];

```
if (Array.isArray(returnedCategories)) {
  returnedCategories.forEach(
    function (category) {
      const cleanCategory =
        normalizeText(category);

      if (
        cleanCategory &&
        !categories.includes(
          cleanCategory
        )
      ) {
        categories.push(
          cleanCategory
        );
      }
    }
  );
}

websites.forEach(function (website) {
  if (
    !categories.includes(
      website.category
    )
  ) {
    categories.push(
      website.category
    );
  }
});

return categories;
```

}

/************************************************************

* WEBSITE STATES
  ************************************************************/

function hideAllWebsiteStates() {
if (elements.websiteLoadingState) {
elements.websiteLoadingState.hidden =
true;
}

```
if (elements.websiteGrid) {
  elements.websiteGrid.hidden =
    true;
}

if (elements.emptyState) {
  elements.emptyState.hidden =
    true;
}

if (elements.errorState) {
  elements.errorState.hidden =
    true;
}
```

}

function showWebsiteLoadingState() {
hideAllWebsiteStates();

```
if (elements.websiteLoadingState) {
  elements.websiteLoadingState.hidden =
    false;
}

if (elements.resultCountText) {
  elements.resultCountText.textContent =
    'กำลังโหลดข้อมูล';
}
```

}

function showWebsiteErrorState(message) {
hideAllWebsiteStates();

```
if (elements.errorState) {
  elements.errorState.hidden = false;
}

if (elements.errorStateMessage) {
  elements.errorStateMessage.textContent =
    normalizeText(message) ||
    'กรุณาลองใหม่อีกครั้ง';
}

if (elements.resultCountText) {
  elements.resultCountText.textContent =
    'โหลดข้อมูลไม่สำเร็จ';
}
```

}

function showWebsiteEmptyState(
title,
message
) {
hideAllWebsiteStates();

```
if (elements.emptyState) {
  elements.emptyState.hidden = false;
}

if (elements.emptyStateTitle) {
  elements.emptyStateTitle.textContent =
    normalizeText(title) ||
    'ไม่พบเว็บไซต์';
}

if (elements.emptyStateMessage) {
  elements.emptyStateMessage.textContent =
    normalizeText(message) ||
    'ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น';
}
```

}

/************************************************************

* SUMMARY
  ************************************************************/

function updateSummary() {
if (elements.totalWebsiteCount) {
elements.totalWebsiteCount.textContent =
String(
state.websites.length
);
}

```
if (elements.totalCategoryCount) {
  elements.totalCategoryCount.textContent =
    String(
      state.categories.length
    );
}
```

}

/************************************************************

* CATEGORY
  ************************************************************/

function renderCategoryTabs() {
if (!elements.categoryTabs) {
return;
}

```
if (
  state.activeCategory !==
    ALL_CATEGORY &&
  !state.categories.includes(
    state.activeCategory
  )
) {
  state.activeCategory =
    ALL_CATEGORY;
}

elements.categoryTabs.replaceChildren();

const allButton =
  createCategoryButton(
    ALL_CATEGORY
  );

elements.categoryTabs.appendChild(
  allButton
);

state.categories.forEach(
  function (category) {
    elements.categoryTabs.appendChild(
      createCategoryButton(
        category
      )
    );
  }
);
```

}

function createCategoryButton(category) {
const button =
document.createElement('button');

```
const isActive =
  category ===
  state.activeCategory;

button.type = 'button';

button.className =
  'category-tab' +
  (
    isActive
      ? ' active'
      : ''
  );

button.textContent =
  category;

button.dataset.category =
  category;

button.setAttribute(
  'role',
  'tab'
);

button.setAttribute(
  'aria-selected',
  isActive
    ? 'true'
    : 'false'
);

return button;
```

}

function handleCategoryClick(event) {
const button =
event.target.closest(
'.category-tab'
);

```
if (
  !button ||
  !elements.categoryTabs.contains(
    button
  )
) {
  return;
}

const category =
  normalizeText(
    button.dataset.category
  );

if (!category) {
  return;
}

state.activeCategory =
  category;

updateCategorySelection();
renderWebsiteList();
```

}

function updateCategorySelection() {
if (!elements.categoryTabs) {
return;
}

```
const buttons =
  elements.categoryTabs.querySelectorAll(
    '.category-tab'
  );

buttons.forEach(function (button) {
  const isActive =
    button.dataset.category ===
    state.activeCategory;

  button.classList.toggle(
    'active',
    isActive
  );

  button.setAttribute(
    'aria-selected',
    isActive
      ? 'true'
      : 'false'
  );
});
```

}

/************************************************************

* SEARCH
  ************************************************************/

function handleSearchInput() {
state.searchText =
normalizeText(
elements.searchInput &&
elements.searchInput.value
).toLowerCase();

```
if (elements.clearSearchButton) {
  elements.clearSearchButton.hidden =
    !state.searchText;
}

renderWebsiteList();
```

}

function clearSearch() {
state.searchText = '';

```
if (elements.searchInput) {
  elements.searchInput.value = '';
  elements.searchInput.focus();
}

if (elements.clearSearchButton) {
  elements.clearSearchButton.hidden =
    true;
}

renderWebsiteList();
```

}

/************************************************************

* RENDER WEBSITE LIST
  ************************************************************/

function renderWebsiteList() {
if (!elements.websiteGrid) {
return;
}

```
const filteredWebsites =
  getFilteredWebsites();

elements.websiteGrid.replaceChildren();

if (state.websites.length === 0) {
  showWebsiteEmptyState(
    'ยังไม่มีรายการเว็บไซต์',
    'กรุณาเพิ่มข้อมูลในชีต Sheet1'
  );

  updateResultCount(0);

  return;
}

if (filteredWebsites.length === 0) {
  showWebsiteEmptyState(
    'ไม่พบเว็บไซต์',
    'ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น'
  );

  updateResultCount(0);

  return;
}

const fragment =
  document.createDocumentFragment();

filteredWebsites.forEach(
  function (website, index) {
    fragment.appendChild(
      createWebsiteCard(
        website,
        index
      )
    );
  }
);

elements.websiteGrid.appendChild(
  fragment
);

hideAllWebsiteStates();

elements.websiteGrid.hidden = false;

updateResultCount(
  filteredWebsites.length
);
```

}

function getFilteredWebsites() {
return state.websites.filter(
function (website) {
const categoryMatched =
state.activeCategory ===
ALL_CATEGORY ||
website.category ===
state.activeCategory;

```
    if (!categoryMatched) {
      return false;
    }

    if (!state.searchText) {
      return true;
    }

    const searchableText = [
      website.name,
      website.category,
      website.link
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(
      state.searchText
    );
  }
);
```

}

function updateResultCount(count) {
if (!elements.resultCountText) {
return;
}

```
const categoryText =
  state.activeCategory ===
  ALL_CATEGORY
    ? ''
    : ' ในหมวด ' +
      state.activeCategory;

elements.resultCountText.textContent =
  'พบ ' +
  count +
  ' รายการ' +
  categoryText;
```

}

/************************************************************

* WEBSITE CARD
  ************************************************************/

function createWebsiteCard(
website,
index
) {
const card =
document.createElement('article');

```
card.className =
  'website-card theme-' +
  (
    index % 6 + 1
  );

card.dataset.link =
  website.link;

card.dataset.websiteId =
  website.id;

card.tabIndex = 0;

card.setAttribute(
  'role',
  'link'
);

card.setAttribute(
  'aria-label',
  'เปิดเว็บไซต์ ' +
  website.name
);

const main =
  document.createElement('div');

main.className =
  'website-card-main';


const top =
  document.createElement('div');

top.className =
  'website-card-top';


const icon =
  document.createElement('span');

icon.className =
  'website-card-icon';

icon.setAttribute(
  'aria-hidden',
  'true'
);

icon.innerHTML =
  getWebsiteIconSvg(
    resolveIconName(
      website
    )
  );


const arrow =
  document.createElement('span');

arrow.className =
  'website-card-arrow';

arrow.setAttribute(
  'aria-hidden',
  'true'
);

arrow.innerHTML =
  getExternalLinkIconSvg();


top.appendChild(icon);
top.appendChild(arrow);


const category =
  document.createElement('span');

category.className =
  'website-card-category';

category.textContent =
  website.category;


const name =
  document.createElement('h3');

name.className =
  'website-card-name';

name.textContent =
  website.name;


const linkText =
  document.createElement('span');

linkText.className =
  'website-card-link';

linkText.textContent =
  formatLinkLabel(
    website.link
  );


main.appendChild(top);
main.appendChild(category);
main.appendChild(name);
main.appendChild(linkText);


const footer =
  document.createElement('div');

footer.className =
  'website-card-footer';


const openButton =
  document.createElement('button');

openButton.type = 'button';

openButton.className =
  'website-open-button';

openButton.dataset.link =
  website.link;

openButton.textContent =
  'เปิดใช้งาน';


footer.appendChild(
  openButton
);

card.appendChild(main);
card.appendChild(footer);

return card;
```

}

function handleWebsiteCardClick(event) {
const card =
event.target.closest(
'.website-card'
);

```
if (
  !card ||
  !elements.websiteGrid.contains(card)
) {
  return;
}

const link =
  normalizeText(
    card.dataset.link
  );

openWebsiteLink(link);
```

}

function handleWebsiteCardKeydown(event) {
if (
event.key !== 'Enter' &&
event.key !== ' '
) {
return;
}

```
const card =
  event.target.closest(
    '.website-card'
  );

if (
  !card ||
  !elements.websiteGrid.contains(card)
) {
  return;
}

event.preventDefault();

openWebsiteLink(
  card.dataset.link
);
```

}

function openWebsiteLink(linkValue) {
const link =
normalizeText(linkValue);

```
if (!isValidHttpUrl(link)) {
  showToast({
    type: 'error',
    title: 'ไม่สามารถเปิดเว็บไซต์ได้',
    message:
      'ลิงก์เว็บไซต์ไม่ถูกต้อง'
  });

  return;
}

const openedWindow =
  window.open(
    link,
    '_blank',
    'noopener,noreferrer'
  );

if (openedWindow) {
  try {
    openedWindow.opener = null;
  } catch (error) {
    console.warn(error);
  }

  return;
}

showToast({
  type: 'warning',
  title: 'ไม่สามารถเปิดหน้าต่างใหม่ได้',
  message:
    'กรุณาอนุญาต Pop-up แล้วลองอีกครั้ง'
});
```

}

function formatLinkLabel(link) {
try {
const url =
new URL(link);

```
  return url.hostname.replace(
    /^www\./i,
    ''
  );

} catch (error) {
  return link;
}
```

}

/************************************************************

* ICONS
  ************************************************************/

function resolveIconName(website) {
const specifiedIcon =
normalizeText(
website.icon
).toLowerCase();

```
if (
  specifiedIcon &&
  specifiedIcon !== 'link'
) {
  return specifiedIcon;
}

const text = [
  website.name,
  website.category
]
  .join(' ')
  .toLowerCase();

if (
  text.includes('ประตู') ||
  text.includes('door')
) {
  return 'door';
}

if (
  text.includes('ดับเพลิง') ||
  text.includes('fire')
) {
  return 'fire';
}

if (
  text.includes('แอลกอฮอล์') ||
  text.includes('alcohol')
) {
  return 'alcohol';
}

if (
  text.includes('รายงาน') ||
  text.includes('report')
) {
  return 'report';
}

if (
  text.includes('จุดเสี่ยง') ||
  text.includes('risk')
) {
  return 'risk';
}

if (
  text.includes('รักษาความปลอดภัย') ||
  text.includes('security')
) {
  return 'shield';
}

if (
  text.includes('ตรวจ') ||
  text.includes('check')
) {
  return 'checklist';
}

if (
  text.includes('ผู้ใช้') ||
  text.includes('พนักงาน') ||
  text.includes('user')
) {
  return 'user';
}

if (
  text.includes('รถ') ||
  text.includes('car')
) {
  return 'car';
}

if (
  text.includes('dashboard') ||
  text.includes('แดชบอร์ด')
) {
  return 'dashboard';
}

return 'link';
```

}

function getWebsiteIconSvg(iconName) {
const icons = {
link:
'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"></path><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"></path></svg>',

```
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path></svg>',

  door:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21h16"></path><path d="M6 21V3h10v18"></path><path d="M16 5h2v16"></path><path d="M12 12h.01"></path></svg>',

  fire:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4.4 0 8-3.6 8-8 0-5-4-8-6-11 0 3-2 5-4 6-2-2-3-4-3-6-2 3-3 6-3 9 0 5.5 3.6 10 8 10Z"></path><path d="M9 18c0-2 1-3 3-5 2 2 3 3 3 5a3 3 0 0 1-6 0Z"></path></svg>',

  alcohol:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2h8l-1 7a4 4 0 0 1-8 0Z"></path><path d="M12 13v9"></path><path d="M8 22h8"></path></svg>',

  report:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h8"></path><path d="M8 9h2"></path></svg>',

  risk:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',

  checklist:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="m8 9 1.5 1.5L12 8"></path><path d="M14 9h3"></path><path d="m8 15 1.5 1.5L12 14"></path><path d="M14 15h3"></path></svg>',

  user:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle></svg>',

  car:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3v-5l2-5h14l2 5v5h-2"></path><path d="M5 17h14"></path><circle cx="6.5" cy="17.5" r="1.5"></circle><circle cx="17.5" cy="17.5" r="1.5"></circle><path d="M5 12h14"></path></svg>',

  dashboard:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect></svg>',

  folder:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"></path><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2"></path></svg>'
};

return (
  icons[iconName] ||
  icons.link
);
```

}

function getExternalLinkIconSvg() {
return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>';
}

/************************************************************

* REFRESH BUTTON
  ************************************************************/

function setRefreshBusy(isBusy) {
if (!elements.refreshButton) {
return;
}

```
elements.refreshButton.disabled =
  Boolean(isBusy);

elements.refreshButton.classList.toggle(
  'is-loading',
  Boolean(isBusy)
);
```

}

/************************************************************

* USER DROPDOWN
  ************************************************************/

function toggleUserDropdown(event) {
event.stopPropagation();

```
if (!elements.userDropdown) {
  return;
}

const willOpen =
  elements.userDropdown.hidden;

elements.userDropdown.hidden =
  !willOpen;

elements.userMenuButton.setAttribute(
  'aria-expanded',
  willOpen
    ? 'true'
    : 'false'
);
```

}

function closeUserDropdown() {
if (elements.userDropdown) {
elements.userDropdown.hidden = true;
}

```
if (elements.userMenuButton) {
  elements.userMenuButton.setAttribute(
    'aria-expanded',
    'false'
  );
}
```

}

function handleDocumentClick(event) {
if (
elements.userDropdown &&
elements.userMenuButton &&
!elements.userDropdown.hidden &&
!elements.userDropdown.contains(
event.target
) &&
!elements.userMenuButton.contains(
event.target
)
) {
closeUserDropdown();
}
}

/************************************************************

* LOGOUT MODAL
  ************************************************************/

function openLogoutModal() {
closeUserDropdown();

```
if (!elements.confirmModal) {
  return;
}

elements.confirmModal.hidden = false;

document.body.classList.add(
  'modal-open'
);

window.setTimeout(function () {
  if (elements.cancelModalButton) {
    elements.cancelModalButton.focus();
  }
}, 50);
```

}

function closeLogoutModal() {
if (elements.confirmModal) {
elements.confirmModal.hidden = true;
}

```
document.body.classList.remove(
  'modal-open'
);
```

}

async function confirmLogout() {
closeLogoutModal();

```
showLoadingOverlay(
  'กำลังออกจากระบบ...'
);

try {
  if (API) {
    await API.logout();
  }

} catch (error) {
  console.warn(
    'Logout error:',
    error
  );

} finally {
  clearSessionTimer();

  state.websites = [];
  state.categories = [];
  state.activeCategory =
    ALL_CATEGORY;
  state.searchText = '';

  if (elements.searchInput) {
    elements.searchInput.value = '';
  }

  if (elements.clearSearchButton) {
    elements.clearSearchButton.hidden =
      true;
  }

  if (elements.websiteGrid) {
    elements.websiteGrid.replaceChildren();
  }

  hideLoadingOverlay();
  showLoginView();

  showLoginMessage(
    'ออกจากระบบแล้ว',
    true
  );

  if (elements.passwordInput) {
    elements.passwordInput.value = '';
    elements.passwordInput.focus();
  }
}
```

}

/************************************************************

* SESSION
  ************************************************************/

function scheduleSessionExpiry() {
clearSessionTimer();

```
if (!API) {
  return;
}

const session =
  API.getSession();

if (
  !session ||
  !Number.isFinite(
    session.expiresTime
  )
) {
  return;
}

const remainingTime =
  session.expiresTime -
  Date.now();

if (remainingTime <= 0) {
  handleExpiredSession(
    'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่'
  );

  return;
}

state.sessionTimer =
  window.setTimeout(
    function () {
      handleExpiredSession(
        'Session หมดอายุ กรุณาเข้าสู่ระบบใหม่'
      );
    },
    Math.min(
      remainingTime,
      2147483647
    )
  );
```

}

function clearSessionTimer() {
if (state.sessionTimer) {
window.clearTimeout(
state.sessionTimer
);

```
  state.sessionTimer = null;
}
```

}

function handleExpiredSession(message) {
clearSessionTimer();

```
if (API) {
  API.clearSession();
}

state.websites = [];
state.categories = [];
state.activeCategory =
  ALL_CATEGORY;
state.searchText = '';

showLoginView();

showLoginMessage(
  normalizeText(message) ||
  'กรุณาเข้าสู่ระบบใหม่'
);

if (elements.passwordInput) {
  elements.passwordInput.value = '';
  elements.passwordInput.focus();
}

showToast({
  type: 'warning',
  title: 'กรุณาเข้าสู่ระบบใหม่',
  message:
    normalizeText(message) ||
    'Session หมดอายุ'
});
```

}

function isSessionError(error) {
const code =
normalizeText(
error &&
error.code
).toUpperCase();

```
return (
  Number(
    error &&
    error.status
  ) === 401 ||
  code === 'SESSION_REQUIRED' ||
  code === 'SESSION_INVALID' ||
  code === 'SESSION_EXPIRED'
);
```

}

/************************************************************

* LOADING OVERLAY
  ************************************************************/

function showLoadingOverlay(message) {
if (elements.loadingText) {
elements.loadingText.textContent =
normalizeText(message) ||
'กำลังดำเนินการ...';
}

```
if (elements.loadingOverlay) {
  elements.loadingOverlay.hidden =
    false;
}
```

}

function hideLoadingOverlay() {
if (elements.loadingOverlay) {
elements.loadingOverlay.hidden =
true;
}
}

/************************************************************

* TOAST
  ************************************************************/

function showToast(options) {
if (!elements.toastContainer) {
return;
}

```
const settings =
  options || {};

const type =
  normalizeText(
    settings.type
  ) || 'info';

const title =
  normalizeText(
    settings.title
  ) || 'แจ้งเตือน';

const message =
  normalizeText(
    settings.message
  );

const toast =
  document.createElement('div');

toast.className =
  'toast toast-' + type;

toast.setAttribute(
  'role',
  type === 'error'
    ? 'alert'
    : 'status'
);


const icon =
  document.createElement('span');

icon.className =
  'toast-icon';

icon.setAttribute(
  'aria-hidden',
  'true'
);

icon.innerHTML =
  getToastIconSvg(type);


const content =
  document.createElement('span');

content.className =
  'toast-content';


const titleElement =
  document.createElement('strong');

titleElement.className =
  'toast-title';

titleElement.textContent =
  title;


const messageElement =
  document.createElement('span');

messageElement.className =
  'toast-message';

messageElement.textContent =
  message;


content.appendChild(
  titleElement
);

if (message) {
  content.appendChild(
    messageElement
  );
}

toast.appendChild(icon);
toast.appendChild(content);

elements.toastContainer.appendChild(
  toast
);

window.setTimeout(function () {
  toast.classList.add(
    'toast-leaving'
  );

  window.setTimeout(function () {
    toast.remove();
  }, 250);

}, Number(settings.duration) || 3200);
```

}

function getToastIconSvg(type) {
if (type === 'success') {
return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"></path></svg>';
}

```
if (type === 'error') {
  return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';
}

if (type === 'warning') {
  return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>';
}

return '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>';
```

}

/************************************************************

* DOCUMENT KEYBOARD
  ************************************************************/

function handleDocumentKeydown(event) {
if (event.key !== 'Escape') {
return;
}

```
if (
  elements.confirmModal &&
  !elements.confirmModal.hidden
) {
  closeLogoutModal();
  return;
}

closeUserDropdown();
```

}

/************************************************************

* HELPERS
  ************************************************************/

function normalizeText(value) {
return String(
value == null
? ''
: value
).trim();
}

function isValidHttpUrl(value) {
try {
const url =
new URL(
normalizeText(value)
);

```
  return (
    url.protocol === 'http:' ||
    url.protocol === 'https:'
  );

} catch (error) {
  return false;
}
```

}

function getErrorMessage(
error,
fallbackMessage
) {
const message =
normalizeText(
error &&
error.message
);

```
if (message) {
  return message;
}

return (
  normalizeText(
    fallbackMessage
  ) ||
  'เกิดข้อผิดพลาดในการใช้งานระบบ'
);
```

}

})(window, document);

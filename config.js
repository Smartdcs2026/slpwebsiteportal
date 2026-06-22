/************************************************************
 * config.js
 * S&LP Website Portal
 ************************************************************/

(function (window) {
  'use strict';

  window.APP_CONFIG = Object.freeze({
    /*
     * Cloudflare Worker URL
     * ห้ามใส่ / ต่อท้าย
     */
    API_BASE:
      'https://slpwebsiteportal.somchaibutphon.workers.dev',

    /*
     * ข้อมูลระบบ
     */
    APP_NAME:
      'S&LP Portal',

    DEPARTMENT:
      'S&LP Security & Lossprevention',

    LOGO_URL:
      'https://lh5.googleusercontent.com/d/1HicYHV18UaA5y4GFyHJaG9aNI-qjIzIY',

    /*
     * Timeout สำหรับเรียก API
     */
    API_TIMEOUT_MS:
      30000,

    LOGIN_TIMEOUT_MS:
      30000,

    WEBSITE_TIMEOUT_MS:
      30000,

    LOGOUT_TIMEOUT_MS:
      15000,

    /*
     * ลบ Session ก่อนหมดอายุจริงเล็กน้อย
     */
    SESSION_MARGIN_MS:
      60 * 1000,

    /*
     * ชื่อข้อมูลที่เก็บใน Browser
     */
    STORAGE_KEYS: Object.freeze({
      TOKEN:
        'slp_portal_token',

      USER:
        'slp_portal_user',

      EXPIRES_AT:
        'slp_portal_expires_at'
    })
  });

})(window);

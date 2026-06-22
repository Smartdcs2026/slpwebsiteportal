/************************************************************
 * api.js
 * S&LP Website Portal
 *
 * ใช้สำหรับเชื่อมต่อ:
 * Cloudflare Worker
 *
 * รองรับ:
 * - ตรวจสอบสถานะระบบ
 * - เข้าสู่ระบบ
 * - บันทึก Session
 * - โหลดรายการเว็บไซต์
 * - ออกจากระบบ
 * - ตรวจ Session หมดอายุ
 ************************************************************/

(function (window) {
  'use strict';

  const CONFIG =
    window.APP_CONFIG || {};

  const API_BASE =
    String(
      CONFIG.API_BASE || ''
    ).replace(/\/+$/, '');

  const STORAGE_KEYS =
    CONFIG.STORAGE_KEYS || {
      TOKEN:
        'slp_portal_token',

      USER:
        'slp_portal_user',

      EXPIRES_AT:
        'slp_portal_expires_at'
    };

  const DEFAULT_TIMEOUT_MS =
    Number(CONFIG.API_TIMEOUT_MS) ||
    30000;

  const SESSION_MARGIN_MS =
    Number(CONFIG.SESSION_MARGIN_MS) ||
    60000;


  /************************************************************
   * API ERROR
   ************************************************************/

  class PortalAPIError extends Error {
    constructor(
      message,
      code,
      status,
      details,
      requestId
    ) {
      super(
        message ||
        'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ'
      );

      this.name =
        'PortalAPIError';

      this.code =
        code || 'API_ERROR';

      this.status =
        Number(status) || 0;

      this.details =
        details || null;

      this.requestId =
        requestId || '';
    }
  }


  /************************************************************
   * CONFIG CHECK
   ************************************************************/

  function validateApiConfig() {
    if (!API_BASE) {
      throw new PortalAPIError(
        'ไม่พบการตั้งค่า APP_CONFIG.API_BASE',
        'API_BASE_NOT_CONFIGURED',
        0
      );
    }

    if (
      !/^https:\/\/[^/\s]+(?:\/.*)?$/i.test(
        API_BASE
      )
    ) {
      throw new PortalAPIError(
        'รูปแบบ API_BASE ไม่ถูกต้อง',
        'INVALID_API_BASE',
        0
      );
    }
  }


  /************************************************************
   * STORAGE HELPERS
   ************************************************************/

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(
        key,
        String(value)
      );

      return true;

    } catch (error) {
      console.warn(
        'ไม่สามารถบันทึกข้อมูลใน Browser ได้',
        error
      );

      return false;
    }
  }


  function storageGet(key) {
    try {
      return window.localStorage.getItem(
        key
      ) || '';

    } catch (error) {
      console.warn(
        'ไม่สามารถอ่านข้อมูลจาก Browser ได้',
        error
      );

      return '';
    }
  }


  function storageRemove(key) {
    try {
      window.localStorage.removeItem(
        key
      );

    } catch (error) {
      console.warn(
        'ไม่สามารถลบข้อมูลจาก Browser ได้',
        error
      );
    }
  }


  /************************************************************
   * SESSION
   ************************************************************/

  function saveSession(loginResult) {
    const token =
      normalizeText(
        loginResult &&
        loginResult.token
      );

    const user =
      loginResult &&
      loginResult.user &&
      typeof loginResult.user === 'object'
        ? loginResult.user
        : {};

    const userName =
      normalizeText(user.name);

    const expiresAt =
      normalizeText(
        loginResult &&
        loginResult.expiresAt
      );

    if (!token) {
      throw new PortalAPIError(
        'ระบบไม่ได้ส่ง Session Token กลับมา',
        'TOKEN_NOT_RECEIVED',
        0
      );
    }

    if (!userName) {
      throw new PortalAPIError(
        'ระบบไม่ได้ส่งชื่อผู้ใช้งานกลับมา',
        'USER_NOT_RECEIVED',
        0
      );
    }

    if (!expiresAt) {
      throw new PortalAPIError(
        'ระบบไม่ได้ส่งเวลาหมดอายุของ Session กลับมา',
        'EXPIRY_NOT_RECEIVED',
        0
      );
    }

    const expiresTime =
      new Date(expiresAt).getTime();

    if (
      !Number.isFinite(expiresTime) ||
      expiresTime <= Date.now()
    ) {
      throw new PortalAPIError(
        'เวลาหมดอายุของ Session ไม่ถูกต้อง',
        'INVALID_SESSION_EXPIRY',
        0
      );
    }

    storageSet(
      STORAGE_KEYS.TOKEN,
      token
    );

    storageSet(
      STORAGE_KEYS.USER,
      JSON.stringify({
        name: userName
      })
    );

    storageSet(
      STORAGE_KEYS.EXPIRES_AT,
      expiresAt
    );

    return {
      token: token,

      user: {
        name: userName
      },

      expiresAt: expiresAt
    };
  }


  function getSession() {
    const token =
      normalizeText(
        storageGet(
          STORAGE_KEYS.TOKEN
        )
      );

    const expiresAt =
      normalizeText(
        storageGet(
          STORAGE_KEYS.EXPIRES_AT
        )
      );

    let user = null;

    const rawUser =
      storageGet(
        STORAGE_KEYS.USER
      );

    if (rawUser) {
      try {
        const parsedUser =
          JSON.parse(rawUser);

        if (
          parsedUser &&
          typeof parsedUser === 'object'
        ) {
          user = {
            name:
              normalizeText(
                parsedUser.name
              )
          };
        }

      } catch (error) {
        user = null;
      }
    }

    if (
      !token ||
      !expiresAt ||
      !user ||
      !user.name
    ) {
      return null;
    }

    const expiresTime =
      new Date(expiresAt).getTime();

    if (!Number.isFinite(expiresTime)) {
      clearSession();
      return null;
    }

    if (
      Date.now() >=
      (
        expiresTime -
        SESSION_MARGIN_MS
      )
    ) {
      clearSession();
      return null;
    }

    return {
      token: token,
      user: user,
      expiresAt: expiresAt,
      expiresTime: expiresTime
    };
  }


  function getToken() {
    const session =
      getSession();

    return session
      ? session.token
      : '';
  }


  function getCurrentUser() {
    const session =
      getSession();

    return session
      ? session.user
      : null;
  }


  function isAuthenticated() {
    return Boolean(
      getSession()
    );
  }


  function clearSession() {
    storageRemove(
      STORAGE_KEYS.TOKEN
    );

    storageRemove(
      STORAGE_KEYS.USER
    );

    storageRemove(
      STORAGE_KEYS.EXPIRES_AT
    );
  }


  /************************************************************
   * API REQUEST
   ************************************************************/

  async function request(
    path,
    options
  ) {
    validateApiConfig();

    const requestOptions =
      options || {};

    const method =
      normalizeText(
        requestOptions.method || 'GET'
      ).toUpperCase();

    const timeoutMs =
      Number(
        requestOptions.timeoutMs
      ) ||
      DEFAULT_TIMEOUT_MS;

    const requiresAuth =
      Boolean(
        requestOptions.requiresAuth
      );

    const body =
      requestOptions.body;

    const token =
      requiresAuth
        ? getToken()
        : normalizeText(
            requestOptions.token
          );

    if (
      requiresAuth &&
      !token
    ) {
      throw new PortalAPIError(
        'กรุณาเข้าสู่ระบบก่อนใช้งาน',
        'SESSION_REQUIRED',
        401
      );
    }

    const controller =
      new AbortController();

    const timeoutId =
      window.setTimeout(
        function () {
          controller.abort();
        },
        timeoutMs
      );

    const headers =
      new Headers();

    headers.set(
      'Accept',
      'application/json'
    );

    if (token) {
      headers.set(
        'Authorization',
        'Bearer ' + token
      );
    }

    let requestBody;

    if (
      body !== undefined &&
      body !== null
    ) {
      headers.set(
        'Content-Type',
        'application/json;charset=UTF-8'
      );

      requestBody =
        JSON.stringify(body);
    }

    let response;

    try {
      response =
        await window.fetch(
          API_BASE +
          normalizeApiPath(path),
          {
            method: method,
            headers: headers,
            body: requestBody,
            cache: 'no-store',
            credentials: 'omit',
            redirect: 'follow',
            signal: controller.signal
          }
        );

    } catch (error) {
      if (
        error &&
        error.name === 'AbortError'
      ) {
        throw new PortalAPIError(
          'ระบบใช้เวลาตอบสนองนานเกินไป กรุณาลองใหม่',
          'REQUEST_TIMEOUT',
          0
        );
      }

      throw new PortalAPIError(
        'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต',
        'NETWORK_ERROR',
        0,
        {
          originalMessage:
            error &&
            error.message
              ? error.message
              : ''
        }
      );

    } finally {
      window.clearTimeout(
        timeoutId
      );
    }

    const responseText =
      await readResponseText(
        response
      );

    const result =
      parseJsonResponse(
        responseText,
        response.status
      );

    if (
      !response.ok ||
      result.ok !== true
    ) {
      const error =
        new PortalAPIError(
          result.message ||
          getDefaultStatusMessage(
            response.status
          ),

          result.code ||
          'API_ERROR',

          response.status,

          result,

          result.requestId || ''
        );

      if (
        isSessionError(
          error.code,
          response.status
        )
      ) {
        clearSession();
      }

      throw error;
    }

    return result;
  }


  async function readResponseText(
    response
  ) {
    try {
      return await response.text();

    } catch (error) {
      throw new PortalAPIError(
        'ไม่สามารถอ่านข้อมูลตอบกลับจากระบบได้',
        'RESPONSE_READ_ERROR',
        response.status
      );
    }
  }


  function parseJsonResponse(
    responseText,
    status
  ) {
    const text =
      String(
        responseText || ''
      ).trim();

    if (!text) {
      throw new PortalAPIError(
        'เซิร์ฟเวอร์ไม่ได้ส่งข้อมูลกลับมา',
        'EMPTY_RESPONSE',
        status
      );
    }

    try {
      const parsed =
        JSON.parse(text);

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        throw new Error(
          'Invalid response object'
        );
      }

      return parsed;

    } catch (error) {
      throw new PortalAPIError(
        'เซิร์ฟเวอร์ไม่ได้ส่ง JSON กลับมา',
        'INVALID_JSON_RESPONSE',
        status,
        {
          preview:
            text.substring(
              0,
              250
            )
        }
      );
    }
  }


  /************************************************************
   * API METHODS
   ************************************************************/

  async function health() {
    return await request(
      '/api/health',
      {
        method: 'GET',
        timeoutMs:
          Number(
            CONFIG.API_TIMEOUT_MS
          ) ||
          30000
      }
    );
  }


  async function login(pass) {
    const cleanPass =
      normalizeText(pass);

    if (!cleanPass) {
      throw new PortalAPIError(
        'กรุณากรอกรหัสผ่าน',
        'PASS_REQUIRED',
        400
      );
    }

    const result =
      await request(
        '/api/login',
        {
          method: 'POST',

          timeoutMs:
            Number(
              CONFIG.LOGIN_TIMEOUT_MS
            ) ||
            30000,

          body: {
            pass: cleanPass
          }
        }
      );

    saveSession(result);

    return result;
  }


  async function getWebsites() {
    const result =
      await request(
        '/api/websites',
        {
          method: 'GET',

          requiresAuth: true,

          timeoutMs:
            Number(
              CONFIG.WEBSITE_TIMEOUT_MS
            ) ||
            30000
        }
      );

    if (
      result.user &&
      result.user.name
    ) {
      const session =
        getSession();

      if (session) {
        storageSet(
          STORAGE_KEYS.USER,
          JSON.stringify({
            name:
              normalizeText(
                result.user.name
              )
          })
        );
      }
    }

    return result;
  }


  async function logout() {
    const token =
      getToken();

    try {
      if (!token) {
        return {
          ok: true,
          message:
            'ออกจากระบบแล้ว'
        };
      }

      return await request(
        '/api/logout',
        {
          method: 'POST',

          token: token,

          timeoutMs:
            Number(
              CONFIG.LOGOUT_TIMEOUT_MS
            ) ||
            15000,

          body: {}
        }
      );

    } finally {
      clearSession();
    }
  }


  /************************************************************
   * ERROR HELPERS
   ************************************************************/

  function isSessionError(
    code,
    status
  ) {
    const normalizedCode =
      normalizeText(code)
        .toUpperCase();

    const sessionCodes = [
      'SESSION_REQUIRED',
      'SESSION_INVALID',
      'SESSION_EXPIRED'
    ];

    return (
      Number(status) === 401 ||
      sessionCodes.includes(
        normalizedCode
      )
    );
  }


  function getDefaultStatusMessage(
    status
  ) {
    const messages = {
      400:
        'ข้อมูลที่ส่งไปไม่ถูกต้อง',

      401:
        'กรุณาเข้าสู่ระบบใหม่',

      403:
        'ไม่มีสิทธิ์ใช้งานระบบ',

      404:
        'ไม่พบ API ที่เรียกใช้งาน',

      413:
        'ข้อมูลมีขนาดใหญ่เกินกำหนด',

      429:
        'มีการเรียกใช้งานมากเกินไป กรุณารอสักครู่',

      500:
        'เกิดข้อผิดพลาดภายในระบบ',

      502:
        'ไม่สามารถเชื่อมต่อระบบฐานข้อมูลได้',

      503:
        'ระบบไม่พร้อมใช้งานชั่วคราว',

      504:
        'ระบบใช้เวลาตอบสนองนานเกินไป'
    };

    return (
      messages[Number(status)] ||
      'เกิดข้อผิดพลาดในการใช้งานระบบ'
    );
  }


  /************************************************************
   * GENERAL HELPERS
   ************************************************************/

  function normalizeApiPath(path) {
    const cleanPath =
      String(path || '')
        .trim();

    if (!cleanPath) {
      return '/';
    }

    return cleanPath.startsWith('/')
      ? cleanPath
      : '/' + cleanPath;
  }


  function normalizeText(value) {
    return String(
      value == null
        ? ''
        : value
    ).trim();
  }


  /************************************************************
   * EXPORT
   ************************************************************/

  window.SLP_API = Object.freeze({
    PortalAPIError:
      PortalAPIError,

    health:
      health,

    login:
      login,

    getWebsites:
      getWebsites,

    logout:
      logout,

    saveSession:
      saveSession,

    getSession:
      getSession,

    getToken:
      getToken,

    getCurrentUser:
      getCurrentUser,

    isAuthenticated:
      isAuthenticated,

    clearSession:
      clearSession
  });

})(window);

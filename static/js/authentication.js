/**
 * @typedef Tokens
 * @property {string} access
 * @property {string} refresh
 */

/**
 * @typedef ParseTokens
 * @type {(Record) => {access, refresh}}
 */

/**
 * @typedef Logined
 * @type {({access, refresh}) => void}
 */

class Auth {
  _loginPath = '/auth';
  /**
   * @type {HTMLFormElement | null}
   */
  $$form = null;
  /**
   * @type {PersistController | null}
   */
  _persist = null;
  

  /**
   * @type { ParseTokens }
   */
  _parseTokens = function (result) {
    const {access, refresh} = result;
    return {access, refresh};
  };

  /**
   * @type {Logined | null}
   */
  _logined = null;
  // function ({access, refresh}) {
  //   console.warn('required logined');
  //   // required initial..
  // };

  _refreshKey = null;

  constructor() {
    this._refreshKey = 'refresh_key';
    this._persist = new PersistController({
      type: 'local'
    });

    this._persist.getItem(this._refreshKey);
  }

  login(payload) {
    fetch(this._loginPath, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(res => res.json())
      .then(data => {
        if (this._parseTokens) {
          const tokens = this._parseTokens(data);
          if (typeof tokens.refresh === 'string') {
            this._persist.setItem(this._refreshKey, tokens.refresh);
          }
          this._logined(tokens);
        }
      });
  }

  submitHandler(e) {
    e.preventDefault();
    const fd = new FormData(this.$$form);
    const payload = [...fd.entries()].reduce((a, c) => {
      a[c[0]] = c[1];
      return a;
    }, {});
    this.login(payload);
  }

  init(options={}) {
    const {form, loginPath} = options;
    this.$$form = form;
    this._loginPath = loginPath ?? this._loginPath;
    form?.addEventListener('submit', this.submitHandler.bind(this));
  }

  destory() {
    this._loginPath = null;
    if (this.$$form) {
      this.$$form.removeEventListener('submit', this.submitHandler.bind(this));
      this.$$form = null;
    }
  }

  /**
   * 
   * @param {{
   *  parseTokens?: ParseTokens,
   *  logined?: Logined,
   * }} options 
   */
  config(options={}) {
    if (typeof options.parseTokens === 'function') {
      this._parseTokens = options.parseTokens;
    }
    if (typeof options.logined === 'function') {
      this._logined = options.logined;
    }
  }

  get _refresh() {
    return this._persist.getItem(this._refreshKey);
  }
}

// https://ko.javascript.info/cookie
const cookieStorage = new (class CookieStorage {
  setting() {
    document.cookie.split('; ').reduce((a, c) => {
      const entry = c.split('='); 
      a[entry[0]] = entry[1]; 
      return a;
    }, {}) 
  }

  getItem(name) {
    const matches = document.cookie.match(new RegExp(
      "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : null;
  }

  setItem(name, value, options={}) {
    options = {
      path: '/',
      ...options
    };
  
    if (options.expires instanceof Date) {
      options.expires = options.expires.toUTCString();
    }
  
    let updatedCookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    for (const optionKey in options) {
      updatedCookie += `; ${optionKey}`;
      const optionValue = options[optionKey];
      if (optionValue !== true) {
        updatedCookie += `=${optionValue}`;
      }
    }
  
    document.cookie = updatedCookie;
  }

  removeItem(name) {
    this.setItem(name, '', {
      'max-age': -1
    });
  }
})();

class PersistController {
  /**
   * @type {WindowLocalStorage | WindowSessionStorage | CookieHelper}
   */
  _store = null;

  /**
   * 
   * @param {{
   *  type?: 'local' | 'session' | 'cookie',
   * }} config 
   */
  constructor(config={}) {
    let type = config.type ?? 'local';
    if (type === 'local') {
      this._store = window.localStorage;
    } else if (type === 'session') {
      this._store = window.sessionStorage;
    } else if (type === 'cookie') {
      this._store = new CookieStorage();
    }
  }

  getItem(name) {
    if (this._store === null) return null;
    return this._store.getItem(name);
  }

  setItem(name, value) {
    this._store?.setItem(name, value);
  }

  removeItem(name) {
    this._store?.removeItem(name);
  }
}

const auth = new Auth();
customElements.define('login-wrapper', class LoginForm extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const self = this;
    setTimeout(() => {
      auth.init({
        form: self.querySelector('form'),
        loginPath: self.getAttribute('login-path'),
      });
    });
  }

  adoptedCallback() {
    auth.destory();
  }

  // attributeChangedCallback(name, oldValue, newValue) { }
});


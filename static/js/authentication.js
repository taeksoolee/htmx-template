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
  _refreshPath = '/auth/refresh';

  /**
   * @type {HTMLFormElement | null}
   */
  $$form = null;
  
  _persist = new PersistController({
    type: 'local'
  });

  _access$ = new SimpleObserver();

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

  _refreshKey = 'refresh_key';

  __data = {
    __tokens: new Proxy({
      __access: null,
      __info: null
    }, {
      set: (obj, prop, value) => {
        if (prop === '__access') {
          if (typeof value === 'string' && !!value) {
            obj[prop] = value;
            try {
              const { payload } = simpleJWTDecoder.decodeJWT(value);
              obj['__info'] = payload;

              const maxAge = (payload.exp * 1000) - Date.now();
              setTimeout(() => {
                this.setAccessToken();
              }, maxAge - 5000); // 5초전 refresh
            } catch(err) {
              console.warn(err);
            }
          }
        } else {
          obj[prop] = value
        }

        return true;
      },
    }),
  };

  constructor() {
    this.setAccessToken();
    navigation.addEventListener('navigate', () => {
      this.setAccessToken();
    });
  }

  setAccessToken() {
    const self = this;

    const refresh = this._persist.getItem(this._refreshKey);
    if (typeof refresh !== 'string') return;
    
    fetch(this._refreshPath, {
      method: 'POST',
      body: JSON.stringify({
        refresh
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .then(data => {
        if (typeof data?.access !== 'string') return;
        self.__data.__tokens.__access = data.access;

        const tokens = {
          refresh,
          access: data.access,
        }

        this._logined(tokens);
        this._access$.next({
          isAuthorized: true,
          tokens,
        });
      })
      .catch(err => {
        console.error(err);
        this._access$.next({
          isAuthorized: false,
          err,
        });
      });
  }

  logout() {
    this._persist.removeItem(this._refreshKey);
    this.__data.__tokens.__access = null;
    this._access$.next({
      isAuthorized: false,
    });
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
          this.__data.__tokens.__access = tokens.access;
          this._access$.next({
            isAuthorized: true,
            tokens,
          });
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
   *  refreshPath? string,
   * }} options 
   */
  config(options={}) {
    if (typeof options.parseTokens === 'function') {
      this._parseTokens = options.parseTokens;
    }
    if (typeof options.logined === 'function') {
      this._logined = options.logined;
    }
    if (typeof options.refreshPath === 'string') {
      this._refreshPath = options.refreshPath;
    }
  }

  get _refresh() {
    return this._persist.getItem(this._refreshKey);
  }

  get access() {
    return auth.__data.__tokens.__access;
  }

  get info() {
    return auth.__data.__tokens.__info;
  }

  /**
   * @type {() => SimpleObserver}
   */
  get access$() {
    return this._access$;
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

class SimpleObserver {
  _map = new Map();

  _list = [];

  _randomNumber() {
    return Date.now();
  }

  next(payload) {
    console.log(payload);
    this._list.push(payload);
    this._map.keys().forEach(key => {
      const fn = this._map.get(key);
      typeof fn === 'function' && fn(payload);
    });
  }

  subscribe(fn) {
    if (typeof fn !== 'function') return null;

    const id = `${this._randomNumber()}`;
    this._map.set(id, fn);
    console.log(this._list);
    this._list.forEach(payload => fn(payload));
    return id;
  }

  unsubscribe(id) {
    return this._map.delete(id);
  }
}

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

class SimpleJWTDecoder {
  _base64UrlDecode(str) {
    // Base64URL 디코딩 함수
    return decodeURIComponent(atob(str.replace(/-/g, '+').replace(/_/g, '/')));
  }
  
  decodeJWT(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT');
    }
  
    return {
      header: JSON.parse(this._base64UrlDecode(parts[0])),
      payload: JSON.parse(this._base64UrlDecode(parts[1])),
      signature: parts[2],
    };
  }
}

const simpleJWTDecoder = new SimpleJWTDecoder();
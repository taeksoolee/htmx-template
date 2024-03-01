const axios = require('axios').default;
const { getReasonPhrase } = require('http-status-codes');

const moment = require('moment');

/**
 * 
 * @param {import("express").Application} app 
 */
const hzModule = (app) => {
  const prefix = '/hz';
  const store = (() => {
    const __data__ = Symbol('data');
    return {
      [__data__]: {},
      set(key, value) {
        this[__data__][key] = value
      },
      get(key) {
        return this[__data__][key];
      },
      remove(key) {
        delete this[__data__][key];
      },
      isExist(key) {
        return typeof this[__data__][key] !== 'undefined';
      }
    }
  })();

  const request = (token, config) => {
    const instance = axios.create({
      baseURL: 'https://vppapidev.haezoom.com',
      headers: {
        'Plant-Type': 'vpp',
        Authorization: `JWT ${token}`,
      },
    });

    if (config?.store) {
      instance.interceptors.response.use((res) => {
        store.set(res.config.url, res.data);
        return res;
      });
    }

    return instance;
  };

  const token = (req) => req.session.token;

  const pagination = (pageName, req, data) => {
    const curPage = Number(req.query['page']) || 1;
    const perPage = Number(req.query['perPage']) || 10;

    const totalCnt = data.length;

    const pageCnt = Math.floor(totalCnt / perPage) + (totalCnt % perPage === 0 ? 1 : 0);
    const startPage = ((curPage-1) * perPage) + 1;

    return {
      curPage,
      perPage,
      totalCnt,
      pageCnt,
      startPage,
      pager: `
        <div hx-boost="true">
          ${Array.from(
            {length: pageCnt}, 
            (_, i) => {
              if (i+1 === curPage) {
                return `<span>${i+1}</span>`;
              } else {
                return `<a href="/hz/?page=${pageName}?page=${i+1}">${i+1}</a>`;
              }
            },
          ).join(' | ')}
        </div>
      `
    }
  }

  /**
   * @typedef Handler
   * @type {(
   *  req: import('express').Request, 
  *  res: import('express').Response
  * ) => [string, Promise<any> | any]}
   */

  /**
   * 
   * @param {Handler} callback 
   * @returns {Handler}
   */
  const api = (path, handler) => {
    return [`${prefix}/api${path}`, async (req, res) => {
      try {
        const data = await handler(req, res);
        res.json(data);
      } catch(err) {
        if (axios.isAxiosError(err)) {
          res.status(err.response.status).send({
            message: getReasonPhrase(err.response.status),
          });
        } else {
          res.status(500).send({
            message: 'Server Error',
            error: err.message,
          });
        }
      }
    }]
  }


  /**
   * 
   * @param {Handler} handler
   * @returns {Handler}
   */
  const html = (path, handler) => {
    return [`${prefix}/html${path}`, async (req, res) => {
      try {
        const data = await handler(req, res);

        res.send(data);
      } catch(err) {
        console.log(err);
        if (axios.isAxiosError(err)) {
          res.send(`
            <h1>${err.response.status}</h1>
            <h2>${getReasonPhrase(err.response.status)}</h2>
            <p>${err ?? ''}</p>
          `);
        } else {
          res.send(`
            <h1>500</h1>
            <h2>Server Error</h2>
            <p>${err ?? ''}</p>
          `);
        }
      }
    }];
  }

  const table = (keys, list) => {
    return `
    <div class="overflow-auto">
      <div>
        <table>
          <thead>
            <tr">
              ${keys.map(key => `<th>${key}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${list.map(item => `
              <tr>
                ${keys.map(key => {
                  return `
                    <td style="white-space: nowrap;">
                      ${Array.isArray(item[key]) ? JSON.stringify(item[key]) : item[key] ?? '-'}
                    </td>
                  `
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
          <tfooter>
          </tfooter>
        </table>
      </div>
    </div>
    `;
  }

  app.get(...html('/home', async (req, res) => {
    return `
      <h1>☀️ Hello HZ</h1>
    `;
  }));

  app.get(...html('/nav', async (req, res) => {
    const isAuthorized = !!token(req);

    return `
      <nav hx-boost="true">
        <ul>
          <li>
            <a href="/hz/?page=home">
              <strong>Haezoom</strong>
            </a>
          </li>
        </ul>
        <ul>
          ${isAuthorized ? `
          <li><a href="/hz/?page=profile">profile</a></li>
          <li><a href="/hz/?page=agg-resources">agg-resources</a></li>
          <li><a href="/hz/?page=resources">resources</a></li>
          <li><a href="/hz/?page=sends">sends</a></li>
          <li>
            <a href="#" onclick="window.logoutForm.submit();"><ion-icon name="log-out-outline"></ion-icon></a>
            <form style="display: none;" name="logoutForm" action="/hz/html/logout" method="post" entype="application/x-www-form-urlencoded">
              <button type="submit" id="logoutBtn">
              </button>
            </form>
          </li>
          ` : `
          <li><a href="/hz/?page=login"><ion-icon name="log-in-outline"></ion-icon></a></li>
          `}
        </ul>
      </nav>
    `;
  }))

  app.get(...html('/login', async (req, res) => {
    if (!!token(req)) {
      res.redirect('/hz/html/home')
      return;
    };

    return `
    <section class="container">
      <h3>🔐 Login Form</h3>
      <form action="/hz/html/login" method="post" entype="application/x-www-form-urlencoded">
        <div class="grid">
          <label>
            Email
            <input name="username" type="text" required autocomplete="username" />
          </label>
          <label>
            Password
            <input name="password" type="password" required autocomplete="current-password" />
          </label>
        </div>
        ${
          typeof req.query['fail'] !== 'undefined'
          ? `
          <p style="color: var(--pico-form-element-invalid-active-border-color);">
            로그인 실패했습니다.
          </p>
          `
          : ''
        }
        <button type="submit">Login</button>
      </form>
    </section>
    `;
  }));

  app.post(...html('/login', async (req, res) => {
    try {
      const {data} = await request().post('/api/token-auth/', {
        ...req.body
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      })
  
      req.session.token = data.token;
      req.session.save();
      res.redirect('/hz');
    } catch(err) {
      res.redirect('/hz/?page=login?fail');
    } finally {
      return;
    }
  }));

  app.post(...html('/logout', async (req, res) => {
    await new Promise((resolve, reject) => {
      req.session.token = null;
      req.session.save(function(err) {
        if (err) reject(err);
        resolve();
      })
    });

    res.redirect('/hz/?page=home');
    return;
  }));

  app.get(...html('/profile', async (req, res) => {
    const {data} = await request(token(req)).post('/api/auth/');

    if (data.code) {
      throw new axios.AxiosError(data.message, data.code, {}, {}, {
        status: data.code,
      });
    }

    return `
      <article>
        ${Object.keys(data.results).map(key => `
          <div>
            <strong>${key} : </strong>${data.results[key]}
          </div>
        `).join('')}
      </article>
    `;
  }));


  app.get(...html('/agg-resources', async (req, res) => {
    const data = store.isExist('/api/vpp/agg-resources/') 
      ? store.get('/api/vpp/agg-resources/')
      : (await request(token(req)).get('/api/vpp/agg-resources/')).data;

    if (data.code) {
      throw new axios.AxiosError(data.message, data.code, {}, {}, {
        status: data.code,
      });
    }

    const {
      perPage,
      startPage,
      pager,
    } = pagination('resources', req, data.results);

    return `
      ${pager}
      ${table([
        "agg_resource_id",
        "agg_resource_name",
        "agg_resource_type",
        "capacity_last",
        "reg_date",
        "resource_id",
      ], data.results.slice(startPage, startPage+perPage))}
    `;
  }));

  app.get(...html('/resources', async (req, res) => {
    const data = store.isExist('/v2/vpp/resource/list/')
      ? store.get('/v2/vpp/resource/list/')
      : (await request(token(req), {store: true}).get('/v2/vpp/resource/list/')).data;

    if (data?.code) {
      throw new axios.AxiosError(data.message, data.code, {}, {}, {
        status: data.code,
      });
    }

    const {
      perPage,
      startPage,
      pager,
    } = pagination('resources', req, data);
    
    return `
      ${pager}
      ${table([
        "id",
        "status",
        "err_status",
        "province",
        "cbp_gen_id",
        "ess_cbp_gen_id",
        "plant_name",
        "is_ess",
        "pcs_cap",
        "dch_start",
        "dch_end",
        "ch_start",
        "ch_end",
        "capacity",
        "ess_capacity",
        "fitting",
        "renewal_date",
        "business_name",
        "CRN",
        "ib_name",
        "ib_owner_name",
        "ib_contact_number",
        "agg_resource_name",
        "contract_number",
        "contract_type",
        "contract_date",
        "contract_start_date",
        "contract_end_date",
        "guarantee",
        "promotion",
        "hz_settle_rate",
        "b_settle_rate",
        "c_settle_rate",
        "download_key",
      ], data.slice(startPage, startPage+perPage))}
    `;
  }));

  app.get(...html('/sends', async (req, res) => {

    const now = moment().add(-2, 'months');
    const range = {
      from : now.format('YYYY-MM'),
      to: now.format('YYYY-MM'),
      qs() {
        return `?month_from=${this.from}&month_to=${this.to}`;
      },
      html() {
        return `
          <div>
            ${this.from}-${this.to}
          </div>
        `;
      },
    };

    const data = (store.isExist(`/api/vpp/settlement/send-list/${range.qs()}`)
      ? store.get(`/api/vpp/settlement/send-list/${range.qs()}`)
      : (await request(token(req), {store: true}).get(`/api/vpp/settlement/send-list/${range.qs()}`)).data).result.table_data;

    const {
      perPage,
      startPage,
      pager,
    } = pagination('sends', req, data);

    return `
      ${range.html()}
      ${pager}
      ${table([
        "id",
        "gen_month",
        "report_available",
        "bill_available",
        "message_available",
        "business_type",
        "crn",
        "corp_name",
        "mail_receiver",
        "message_receiver",
        "agg_resources",
        "send_history",
      ], data.slice(startPage, startPage+perPage))}
    `
  }));

  
  app.get(...api('/auth', async (req, res) => {
    return {
      isAuthorized: !!token(req),
    };
  }));

  app.get(...api('/profile', async (req, res) => {
    const {data} = await request(token(req)).post('/api/auth/');
    return data;
  }));
  
  app.get(...api('/agg-resources', async (req, res) => {
    const {data} = await request(token(req)).get('/api/vpp/agg-resources/');
    return data;
  }));

  app.get(...api('/resources', async (req, res) => {
    const {data} = await request(token(req)).get('/v2/vpp/resource/list/');
    return data;
  }));


};

module.exports = hzModule;
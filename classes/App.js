const fs = require('fs');

const express = require('express');
const nunjucks = require('nunjucks');
const cors = require('cors');

const session = require('express-session');
const FileStore = require('session-file-store')(session);

class App {
  _app;
  constructor() {
    const app = express();

    app.use(cors({
      origin: '*',
    }));

    app.use(express.static('static'));
    app.use(express.json()); // JSON parser
    app.use(express.urlencoded({ extended: false} )); // 'Content-Type': 'application/x-www-form-urlencoded'


    this._app = app;
  }

  nunjucks() {
    const app = this._app;

    const viewsDir = 'views';
    app.set('view engine', 'html');
    nunjucks.configure(viewsDir, {
      autoescape: true,
      express: app,
      watch: true
    });
    const files = [];
    (function setFiles(path="") {
      const dir = fs.readdirSync(path, {
        withFileTypes: true,
      });

      for (const file of dir) {
        if (file.isFile()) {
          files.push(`${path}/${file.name}`);
        } else {
          setFiles(`${path}/${file.name}`);
        }
      }
    })(viewsDir);

    files
      .map(res => res.replace(new RegExp('^'+viewsDir), ''))
      .map(res => res.replace(/.html$/, ''))
      .forEach(file => {
        if (file.startsWith('/components')) return;
        app.get(`${file.replace(/index/g, '')}`, (req, res) => {
          res.render(`${file.replace(/^\//, '')}`);
        });
      });

    return this;
  }

  session() {
    const app = this._app;

    // app.set('trust proxy', 1)  // production
    app.use(session({
      secret: 'Haezoom Secret!@#',
      resave: false,
      saveUninitialized: true,
      cookie: {
        // secure: true,
      },
      store: new FileStore(),
    }));

    return this;
  }

  regist(fn) {
    fn(this._app);
    return this;
  }


  listen(port=4000) {
    const app = this._app;
    app.listen(port, () => {
      console.log(`🚀 http://localhost:${port}`);
    });
  }
}

module.exports = App;
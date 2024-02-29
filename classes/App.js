const fs = require('fs');

const express = require('express');
const nunjucks = require('nunjucks');

class App {
  _app;
  constructor() {
    const app = express();

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

  regist(fn) {
    fn(this._app);
    return this;
  }

  listen(port=4000) {
    app.listen(port, () => {
      console.log(`🚀 http://localhost:${port}`);
    });
  }
}

module.exports = App;
const fs = require('fs');

const express = require('express');
const app = express();
const nunjucks = require('nunjucks');

app.use(express.static('static'));

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
    app.get(`${file.replace(/index/g, '')}`, (req, res) => {
      res.render(`${file.replace(/^\//, '')}`);
    });
  });

app.listen(4000, () => {
  console.log('🚀 port is 4000');
});

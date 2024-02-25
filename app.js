const fs = require('fs');

const jwt = require('jsonwebtoken');
const jwtSecret = 'blarblar...'; // TODO: 🔥 secret setting

const moment = require('moment');

const express = require('express');
const app = express();
const nunjucks = require('nunjucks');

app.use(express.static('static'));
app.use(express.json()); // JSON parser
app.use(express.urlencoded({ extended: false} )); // 'Content-Type': 'application/x-www-form-urlencoded'

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


const login = (email, password) => {
  if (email !== 'ts.lee@gmail.com') return false;
  if (password !== '1234') return false;

  return true;
}

app.post('/auth', (req, res) => {
  const { email, password } = req.body;

  if (!login(email, password)) {
    res.sendStatus(401).send({
      message: 'Unauthorized'
    });
    return;
  }
  
  res.json({
    access: jwt.sign({
      email,
      type: 'access',
    }, jwtSecret, {
      expiresIn: '20m',
    }),
    refresh: jwt.sign({
      email,
      type: 'refresh',
    }, jwtSecret, {
      expiresIn: '20d',
    }),
  });
});

app.post('/auth/refresh', (req, res) => {
  const { refresh } = req.body;

  try {
    const payload = jwt.verify(refresh, jwtSecret);

    if (moment().isAfter(payload.exp * 1000)) throw Error();
    const {email} = payload;

    res.json({
      access: jwt.sign({
        email,
        type: 'access',
      }, jwtSecret, {
        expiresIn: '20m',
      })
    })
  } catch(err) {
    console.log(err);
    res.sendStatus(401).send({
      message: 'Unauthorized'
    });
  }
});

app.listen(4000, () => {
  console.log('🚀 port is 4000');
});

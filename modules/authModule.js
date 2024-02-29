const jwt = require('jsonwebtoken');
const jwtSecret = 'blarblar...'; // TODO: 🔥 secret setting

const moment = require('moment');

const authModule = (app) => {
  app.get('/components/login-form', (req, res) => {
    // throw Error();
    // res.sendStatus(404);
    res.render('components/login-form');
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
    
    res.status(201).json({
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
  
      res.status(201).json({
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
  
  app.post('/auth/verify', (req, res) => {
    const { access } = req.body;
  
    try {
      const payload = jwt.verify(access, jwtSecret);
  
      if (moment().isAfter(payload.exp * 1000)) throw Error();
  
      res.sendStatus(204).send();
    } catch(err) {
      console.log(err);
      res.sendStatus(401).send({
        message: 'Unauthorized'
      });
    }
  });
  
  app.get('/profile', (req, res) => {
    res.json({
      email: '',
    });
  });
}

module.exports = authModule;
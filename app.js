const App = require('./classes/App');

const authModule = require('./modules/authModule');
const hzModule = require('./modules/hzModule');

(function boot() {
  new App()
    .nunjucks()
    .session()
    .regist(authModule)
    .regist(hzModule)
    .listen(4000);
})();

const App = require('./classes/App');

const authModule = require('./modules/authModule');

(function boot() {
  new App()
    .nunjucks()
    .regist(authModule)
    .listen(4000);
})();

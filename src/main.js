import Vue from 'vue';
import BootstrapVue from 'bootstrap-vue';
import VuePapaParse from 'vue-papa-parse';
import App from './App.vue';

Vue.use(VuePapaParse);
Vue.use(BootstrapVue);

import './plugins/table.js';
import './plugins/vselect.js';
import './plugins/toasted.js';

import moment from 'moment';
Vue.prototype.$moment = moment;

Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App),
}).$mount('#app');

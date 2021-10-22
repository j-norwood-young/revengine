import Vue from 'vue';
import VueRouter from 'vue-router';
import VueConfirmDialog from 'vue-confirm-dialog'
import Multiselect from 'vue-multiselect'
import "vue-multiselect/dist/vue-multiselect.min.css"
import Home from './components/Home.vue';
import store from './store';
import router from "./router"
import { BootstrapVue } from 'bootstrap-vue'
import 'bootstrap-vue/dist/bootstrap-vue.css'
// import linkify from 'vue-linkify'
// import "./assets/css/style.less"
import DatePicker from 'vue2-datepicker';
import 'vue2-datepicker/index.css';
// import BigNumber from "./components/BigNumber.vue"

class App {
    constructor(context) {
        Vue.use(VueRouter);
        Vue.use(BootstrapVue)
        Vue.use(VueConfirmDialog)
        Vue.component('VueConfirmDialog', VueConfirmDialog.default)
        Vue.component('MultiSelect', Multiselect)
        Vue.component('DatePicker', DatePicker)
        // Vue.component("big-number", BigNumber)
        // Vue.directive('linkified', linkify)
        
        return new Vue({
            el: "#App",
            store,
            router,
            render: h => h(Home)
        })
    }
}

export default App;
import { createApp } from "vue";
import { createVfm } from "vue-final-modal";
import "vue-final-modal/style.css";
import App from "./App.vue";
import router from "./router";
import "./style.css";

const app = createApp(App);
app.use(router);
app.use(createVfm());
app.mount("#app");

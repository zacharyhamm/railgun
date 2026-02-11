import { createApp } from "vue";
import { createVfm } from "vue-final-modal";
import "vue-final-modal/style.css";
import App from "./App.vue";
import "./style.css";

const app = createApp(App);
app.use(createVfm());
app.mount("#app");

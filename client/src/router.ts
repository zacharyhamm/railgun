import { createRouter, createWebHistory } from "vue-router";
import ProjectDetail from "./components/ProjectDetail.vue";
import ProjectList from "./components/ProjectList.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: ProjectList },
    { path: "/projects/:projectId", component: ProjectDetail },
  ],
});

export default router;

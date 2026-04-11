import '@fontsource/rubik-dirt/400.css'
import '@fontsource/momo-trust-display/400.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import './styles/main.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import App from './App.vue'

createApp(App).use(createPinia()).use(router).mount('#app')

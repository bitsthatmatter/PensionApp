// Installs Temporal on globalThis for environments without native support.
// Domain code imports Temporal directly from temporal-polyfill instead.
import 'temporal-polyfill/global'

export default defineNuxtPlugin(() => {})

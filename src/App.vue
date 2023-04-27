<script setup lang="ts">
import { onMounted } from "vue";
// @ts-ignore
import { startDemo } from "./demo.js";

// @ts-ignore
// import { getWindowAI } from 'window.ai';

onMounted(async () => {
  startDemo();

  // @ts-ignore
  // const ai = await getWindowAI();
});
</script>

<template>
  <div>
  </div>
</template>

<style scoped>
#divInfo {
  padding: 8px;
  position: fixed;
  background: white;
}
</style>

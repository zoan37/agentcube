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
  <div id="divInfo">
    drag and drop <a href="https://www.mixamo.com/" target="_blank" rel="noopener noreferrer">mixamo</a> animation
    (.fbx)<br />
  </div>
</template>

<style scoped>
#divInfo {
  padding: 8px;
  position: fixed;
  background: white;
}
</style>

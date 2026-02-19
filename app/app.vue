<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<style>
/* Remove browser default dashed border/outline on draggable elements */
[draggable="true"] {
  outline: none !important;
  border: none;
  -webkit-user-drag: element;
}
[draggable="true"]:focus,
[draggable="true"]:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
</style>

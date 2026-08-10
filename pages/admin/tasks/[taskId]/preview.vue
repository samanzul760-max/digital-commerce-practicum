<template><LearnecAppShell role="ADMIN"><LearnecWorkOrderPreview :task-id="taskId" /></LearnecAppShell></template>
<script setup lang="ts">const taskId=String(useRoute().params.taskId)</script>

<template>
  <div class="community-logo" :class="[`variant-${variant}`, { 'with-text': showText }]">
    <!-- Brandmark with text built-in -->
    <template v-if="variant === 'brandmark'">
      <svg
        :width="computedWidth"
        :height="computedHeight"
        viewBox="0 0 200 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform="translate(4, 8)">
          <rect width="32" height="32" rx="8" fill="#111111" />
          <path d="M16 8L8 14H11V23C11 23.55 11.45 24 12 24H20C20.55 24 21 23.55 21 23V14H24L16 8Z" fill="#FFFFFF" />
          <rect x="13" y="16" width="2.5" height="2.5" rx="0.5" fill="#111111" />
          <rect x="16.5" y="16" width="2.5" height="2.5" rx="0.5" fill="#111111" />
          <rect x="13" y="19.5" width="2.5" height="2.5" rx="0.5" fill="#111111" />
          <rect x="16.5" y="19.5" width="2.5" height="2.5" rx="0.5" fill="#10B981" />
        </g>
        <text
          x="44"
          y="29"
          font-family="Cal Sans, Inter, -apple-system, sans-serif"
          font-size="18"
          font-weight="600"
          letter-spacing="-0.5"
          fill="#111111"
        >
          community<tspan fill="#10B981">.</tspan>
        </text>
        <rect x="146" y="16" width="46" height="18" rx="9" fill="#F5F5F5" />
        <text
          x="169"
          y="28.5"
          text-anchor="middle"
          font-family="Inter, -apple-system, sans-serif"
          font-size="11"
          font-weight="500"
          fill="#6B7280"
        >
          affairs
        </text>
      </svg>
    </template>

    <!-- Cal-Solid: Flagship Squircle -->
    <template v-else-if="variant === 'solid'">
      <svg
        :width="size"
        :height="size"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="64" height="64" rx="16" fill="#111111" />
        <path
          d="M32 17L18 28.5H23V45C23 46.1046 23.8954 47 25 47H39C40.1046 47 41 46.1046 41 45V28.5H46L32 17Z"
          fill="#FFFFFF"
        />
        <rect x="26.5" y="31.5" width="4.5" height="4.5" rx="1" fill="#111111" />
        <rect x="33" y="31.5" width="4.5" height="4.5" rx="1" fill="#111111" />
        <rect x="26.5" y="38" width="4.5" height="4.5" rx="1" fill="#111111" />
        <rect x="33" y="38" width="4.5" height="4.5" rx="1" fill="#10B981" />
      </svg>
    </template>

    <!-- Cal-Line: Hairline Wireframe -->
    <template v-else-if="variant === 'line'">
      <svg
        :width="size"
        :height="size"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="12" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="1.5" />
        <path d="M19 28L32 17L45 28" stroke="#111111" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="23" y="27" width="18" height="19" rx="3" stroke="#111111" stroke-width="2.25" />
        <line x1="28" y1="24.5" x2="28" y2="28" stroke="#111111" stroke-width="2" stroke-linecap="round" />
        <line x1="36" y1="24.5" x2="36" y2="28" stroke="#111111" stroke-width="2" stroke-linecap="round" />
        <circle cx="28.5" cy="33.5" r="1.5" fill="#111111" />
        <circle cx="35.5" cy="33.5" r="1.5" fill="#111111" />
        <circle cx="28.5" cy="39.5" r="1.5" fill="#111111" />
        <circle cx="35.5" cy="39.5" r="1.5" fill="#10B981" />
      </svg>
    </template>

    <!-- Cal-Circle: Circle Monogram -->
    <template v-else-if="variant === 'circle'">
      <svg
        :width="size"
        :height="size"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="32" cy="32" r="32" fill="#111111" />
        <path
          d="M42.5 22C39.5 18.5 35 17 30.5 17C21.5 17 15.5 23.5 15.5 32C15.5 40.5 21.5 47 30.5 47C35 47 39.5 45.5 42.5 42"
          stroke="#FFFFFF"
          stroke-width="3.5"
          stroke-linecap="round"
        />
        <path d="M26 32L32 27L38 32" stroke="#FFFFFF" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="32" cy="36.5" r="2.25" fill="#10B981" />
      </svg>
    </template>

    <!-- Optional Label -->
    <span v-if="showText && variant !== 'brandmark'" class="logo-title">
      {{ text }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'solid' | 'line' | 'circle' | 'brandmark'
    size?: number | string
    showText?: boolean
    text?: string
  }>(),
  {
    variant: 'solid',
    size: 32,
    showText: false,
    text: '社区综合事务管理系统'
  }
)

const computedWidth = computed(() => {
  if (typeof props.size === 'number') {
    return (props.size / 32) * 150
  }
  return '150px'
})

const computedHeight = computed(() => {
  return props.size
})
</script>

<style scoped>
.community-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  vertical-align: middle;
  line-height: 1;
}

.logo-title {
  font-family: 'Cal Sans', 'Inter', -apple-system, sans-serif;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: #111111;
  font-size: 16px;
}
</style>

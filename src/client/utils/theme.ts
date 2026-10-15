import { type Ref, onBeforeUnmount, ref } from 'vue'

/** The OS / browser color scheme, kept current while the component lives. */
export function useColorScheme(): Ref<'light' | 'dark'> {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const scheme = ref<'light' | 'dark'>(query.matches ? 'dark' : 'light')
  const onChange = (event: MediaQueryListEvent) => (scheme.value = event.matches ? 'dark' : 'light')
  query.addEventListener('change', onChange)
  onBeforeUnmount(() => query.removeEventListener('change', onChange))
  return scheme
}

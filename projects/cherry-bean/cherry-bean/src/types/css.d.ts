// CSS imports used by the Expo template (global.css, *.module.css) — type
// stubs so bare `tsc --noEmit` passes; Metro handles the actual loading.
declare module '*.module.css' {
  const styles: Record<string, string>;
  export default styles;
}

declare module '*.css';

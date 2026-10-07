// vite.config.ts
import { defineConfig } from "file:///C:/Users/saake/Downloads/Studentkare-main/Studentkare-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/saake/Downloads/Studentkare-main/Studentkare-main/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\saake\\Downloads\\Studentkare-main\\Studentkare-main";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "react-native", replacement: "react-native-web" },
      { find: "@", replacement: path.resolve(__vite_injected_original_dirname, "./src") }
    ],
    extensions: [".web.tsx", ".web.ts", ".web.jsx", ".web.js", ".tsx", ".ts", ".jsx", ".js"]
  },
  define: {
    global: "window",
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production")
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "react-native-web", "./src/lib/sentry"]
  },
  test: {
    // jsdom, so a screen's behaviour — focus moves, accessible names, live
    // regions — can be asserted instead of only its construction.
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test/setup.ts"],
    // .kilo holds stale git worktrees; their copies of the suite were being
    // collected and run alongside the real one.
    exclude: ["**/node_modules/**", "**/dist/**", ".kilo/**", "**/.kilo/**"],
    css: false
  },
  server: {
    port: 3e3,
    host: true,
    proxy: {
      "/api": { target: process.env.CARE_API_TARGET || "http://127.0.0.1:8000", changeOrigin: false }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxzYWFrZVxcXFxEb3dubG9hZHNcXFxcU3R1ZGVudGthcmUtbWFpblxcXFxTdHVkZW50a2FyZS1tYWluXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxzYWFrZVxcXFxEb3dubG9hZHNcXFxcU3R1ZGVudGthcmUtbWFpblxcXFxTdHVkZW50a2FyZS1tYWluXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9zYWFrZS9Eb3dubG9hZHMvU3R1ZGVudGthcmUtbWFpbi9TdHVkZW50a2FyZS1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgZGVkdXBlOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxyXG4gICAgYWxpYXM6IFtcclxuICAgICAgeyBmaW5kOiAncmVhY3QtbmF0aXZlJywgcmVwbGFjZW1lbnQ6ICdyZWFjdC1uYXRpdmUtd2ViJyB9LFxyXG4gICAgICB7IGZpbmQ6ICdAJywgcmVwbGFjZW1lbnQ6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpIH0sXHJcbiAgICBdLFxyXG4gICAgZXh0ZW5zaW9uczogWycud2ViLnRzeCcsICcud2ViLnRzJywgJy53ZWIuanN4JywgJy53ZWIuanMnLCAnLnRzeCcsICcudHMnLCAnLmpzeCcsICcuanMnXSxcclxuICB9LFxyXG4gIGRlZmluZToge1xyXG4gICAgZ2xvYmFsOiAnd2luZG93JyxcclxuICAgIF9fREVWX186IEpTT04uc3RyaW5naWZ5KHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpLFxyXG4gIH0sXHJcbiAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICBpbmNsdWRlOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJywgJ3JlYWN0LW5hdGl2ZS13ZWInLCAnLi9zcmMvbGliL3NlbnRyeSddLFxyXG4gIH0sXHJcbiAgdGVzdDoge1xyXG4gICAgLy8ganNkb20sIHNvIGEgc2NyZWVuJ3MgYmVoYXZpb3VyIFx1MjAxNCBmb2N1cyBtb3ZlcywgYWNjZXNzaWJsZSBuYW1lcywgbGl2ZVxyXG4gICAgLy8gcmVnaW9ucyBcdTIwMTQgY2FuIGJlIGFzc2VydGVkIGluc3RlYWQgb2Ygb25seSBpdHMgY29uc3RydWN0aW9uLlxyXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXHJcbiAgICBnbG9iYWxzOiBmYWxzZSxcclxuICAgIHNldHVwRmlsZXM6IFsnLi9zcmMvdGVzdC9zZXR1cC50cyddLFxyXG4gICAgLy8gLmtpbG8gaG9sZHMgc3RhbGUgZ2l0IHdvcmt0cmVlczsgdGhlaXIgY29waWVzIG9mIHRoZSBzdWl0ZSB3ZXJlIGJlaW5nXHJcbiAgICAvLyBjb2xsZWN0ZWQgYW5kIHJ1biBhbG9uZ3NpZGUgdGhlIHJlYWwgb25lLlxyXG4gICAgZXhjbHVkZTogWycqKi9ub2RlX21vZHVsZXMvKionLCAnKiovZGlzdC8qKicsICcua2lsby8qKicsICcqKi8ua2lsby8qKiddLFxyXG4gICAgY3NzOiBmYWxzZSxcclxuICB9LFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogMzAwMCxcclxuICAgIGhvc3Q6IHRydWUsXHJcbiAgICBwcm94eToge1xyXG4gICAgICAnL2FwaSc6IHsgdGFyZ2V0OiBwcm9jZXNzLmVudi5DQVJFX0FQSV9UQVJHRVQgfHwgJ2h0dHA6Ly8xMjcuMC4wLjE6ODAwMCcsIGNoYW5nZU9yaWdpbjogZmFsc2UgfSxcclxuICAgIH0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNFcsU0FBUyxvQkFBb0I7QUFDelksT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsU0FBUztBQUFBLElBQ1AsUUFBUSxDQUFDLFNBQVMsV0FBVztBQUFBLElBQzdCLE9BQU87QUFBQSxNQUNMLEVBQUUsTUFBTSxnQkFBZ0IsYUFBYSxtQkFBbUI7QUFBQSxNQUN4RCxFQUFFLE1BQU0sS0FBSyxhQUFhLEtBQUssUUFBUSxrQ0FBVyxPQUFPLEVBQUU7QUFBQSxJQUM3RDtBQUFBLElBQ0EsWUFBWSxDQUFDLFlBQVksV0FBVyxZQUFZLFdBQVcsUUFBUSxPQUFPLFFBQVEsS0FBSztBQUFBLEVBQ3pGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixRQUFRO0FBQUEsSUFDUixTQUFTLEtBQUssVUFBVSxRQUFRLElBQUksYUFBYSxZQUFZO0FBQUEsRUFDL0Q7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyxTQUFTLGFBQWEsb0JBQW9CLG9CQUFvQixrQkFBa0I7QUFBQSxFQUM1RjtBQUFBLEVBQ0EsTUFBTTtBQUFBO0FBQUE7QUFBQSxJQUdKLGFBQWE7QUFBQSxJQUNiLFNBQVM7QUFBQSxJQUNULFlBQVksQ0FBQyxxQkFBcUI7QUFBQTtBQUFBO0FBQUEsSUFHbEMsU0FBUyxDQUFDLHNCQUFzQixjQUFjLFlBQVksYUFBYTtBQUFBLElBQ3ZFLEtBQUs7QUFBQSxFQUNQO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRLEVBQUUsUUFBUSxRQUFRLElBQUksbUJBQW1CLHlCQUF5QixjQUFjLE1BQU07QUFBQSxJQUNoRztBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=

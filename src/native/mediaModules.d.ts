// Canvas art imported by shared screens (src/design-system/art/canvasAssets.ts).
// Metro bundles these as assets and an import gives the asset's module id, which
// React Native's <Image source> takes directly (BoardArt handles both shapes).
declare module '*.png' {
  const asset: number;
  export default asset;
}
declare module '*.jpg' {
  const asset: number;
  export default asset;
}
declare module '*.mp4' {
  const asset: number;
  export default asset;
}

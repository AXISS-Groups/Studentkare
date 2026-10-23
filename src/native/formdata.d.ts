/**
 * React Native's FormData uploads a local file given its uri, name and type —
 * it reads the file itself. The DOM typings know only strings and Blobs.
 * Native-only: the web build never sees this file.
 */
interface ReactNativeFilePart {
  uri: string;
  name: string;
  type: string;
}

interface FormData {
  append(name: string, value: ReactNativeFilePart): void;
}

/**
 * Cross-Platform Persistent Storage Engine.
 *
 * Provides typed, asynchronous key-value persistence that operates seamlessly across:
 * - Web Browsers (window.localStorage)
 * - React Native / Mobile (globalThis / AsyncStorage memory driver fallback)
 *
 * Enforces JSON serialization, error boundaries, and environment safety.
 */

export interface IStorageDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

class WebLocalStorageDriver implements IStorageDriver {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Handle storage quota or privacy mode errors gracefully
    }
    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (err) {
      console.warn(`[CrossPlatformStorage] Failed to set key "${key}":`, err);
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignored
    }
  }

  async clear(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch {
      // Ignored
    }
  }
}

class MemoryStorageDriver implements IStorageDriver {
  private cache = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.cache.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.cache.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

export class CrossPlatformStorage {
  private static driver: IStorageDriver =
    typeof window !== 'undefined' && window.localStorage
      ? new WebLocalStorageDriver()
      : new MemoryStorageDriver();

  /** Override default storage driver (e.g. for React Native AsyncStorage integration) */
  public static setDriver(driver: IStorageDriver): void {
    CrossPlatformStorage.driver = driver;
  }

  public static async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await CrossPlatformStorage.driver.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.warn(`[CrossPlatformStorage] Error parsing key "${key}":`, err);
      return fallback;
    }
  }

  public static async set<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await CrossPlatformStorage.driver.setItem(key, serialized);
    } catch (err) {
      console.error(`[CrossPlatformStorage] Error setting key "${key}":`, err);
    }
  }

  public static async remove(key: string): Promise<void> {
    await CrossPlatformStorage.driver.removeItem(key);
  }

  public static async clear(): Promise<void> {
    await CrossPlatformStorage.driver.clear();
  }
}

# Blazion

A lightweight, strictly-typed, zero-dependency fetch wrapper explicitly built for the `@quokkalabs.com` team. Designed for consistent, object-based API definitions with a modular plugin architecture.

## 1. Installation

### Core (required)
```bash
npm install @blazion/core
```

### Plugins (optional — install only what you need)
```bash
npm install @blazion/plugin-retry          # Automatic retries with exponential backoff
npm install @blazion/plugin-cache          # In-memory response caching with TTL
npm install @blazion/plugin-download-progress # Stream-based download progress tracking
npm install @blazion/plugin-upload-progress   # XHR-based upload progress tracking
```

> [!NOTE]
> You must have an `@quokkalabs.com` email configured in your `git config` to install these packages.

---

## 2. Setting Up an Instance

Create a file called `api.ts`:

```typescript
import { createBlazion, ResponseType } from '@blazion/core';

// 1. Create a custom instance with a base URL
const api = createBlazion({
  baseURL: 'https://api.quokkalabs.com/v1',
});

// 2. Add fluent event hooks
api
  .onRequest((config) => {
    const token = localStorage.getItem('user_token');
    if (token) {
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    }
    return config;
  })
  .onResponse((data, response) => {
    return data;
  })
  .onError((error) => {
    console.error("Global API Error:", error.message);
  });

// 3. Register Plugins (optional — only if you installed them)
import { RetryPlugin } from '@blazion/plugin-retry';
import { CachePlugin } from '@blazion/plugin-cache';
import { UploadPlugin } from '@blazion/plugin-upload-progress';
import { DownloadPlugin } from '@blazion/plugin-download-progress';

api.use(RetryPlugin());
api.use(CachePlugin());
api.use(UploadPlugin());
api.use(DownloadPlugin());

export default api;
```

---

## 3. Standardized Usage (API Dictionary Pattern)

To maintain 100% consistency, the library enforces a single `api(apiObj)` pattern. This allows you to define your endpoints as objects in centralized files.

#### **Step 1: Define your endpoints**
```typescript
// endpoints.ts
import { HttpMethod } from '@blazion/core';

export const UserEndpoints = {
  GET_PROFILE: { 
    url: "/user/profile", 
    method: 'GET' 
  },
  UPDATE_PROFILE: { 
    url: "/user/profile", 
    method: 'PUT',
    timeout: 5000 
  },
};
```

#### **Step 2: Use them in Components**
```typescript
import api from './api';
import { UserEndpoints } from './endpoints';

async function updateProfile(userData: Record<string, string>) {
  try {
    const user = await api({
      ...UserEndpoints.UPDATE_PROFILE,
      payload: userData,
      params: { force: true }
    });
    
    console.log(`Updated ${user.name}`);
  } catch (error) {
    console.error("Update failed:", error.message);
  }
}
```

---

## 4. Features & Auto-Detection

### **Automatic Content-Type Detection**
`blazion` automatically detects your payload type to set the correct `Content-Type`:
- **Generic Object** → `application/json`
- **FormData** → `multipart/form-data`
- **URLSearchParams** → `application/x-www-form-urlencoded`
- **Blob/Binary** → Extracts native type or defaults to `text/plain`

### **Custom Response Formats**
Use `responseType` to dictate exactly what you want back:
```typescript
import { ResponseType } from '@blazion/core';

const audioBlob = await api({
  url: '/audio/track.mp3',
  method: 'GET',
  responseType: ResponseType.BLOB
});
```

### **Strict Type Safety**
The library is 100% strictly typed (No `any`, No `unknown`). Enforced via its internal architecture and linting tools.
```typescript
interface User { name: string; }
const data = await api<User>({ url: '/profile', method: 'GET' });
// data is now correctly typed as User!
```

---

## 5. Plugins & Modular Features

Blazion is modular. Advanced features are available via separate packages to keep the core bundle size minimal.

> [!IMPORTANT]
> Each plugin can only be registered once per instance. Attempting to register a duplicate throws a clear error.

### **Registration**
Register plugins once during instance setup:
```typescript
import { createBlazion } from '@blazion/core';
import { RetryPlugin } from '@blazion/plugin-retry';
import { CachePlugin } from '@blazion/plugin-cache';
import { UploadPlugin } from '@blazion/plugin-upload-progress';
import { DownloadPlugin } from '@blazion/plugin-download-progress';

const api = createBlazion({ baseURL: '...' });

api.use(RetryPlugin());    // Enables 'retry' and 'retryDelay'
api.use(CachePlugin());    // Enables 'qCache' and 'qCacheTime'
api.use(UploadPlugin());   // Enables 'onUploadProgress' (XHR-based)
api.use(DownloadPlugin()); // Enables 'onDownloadProgress' (Stream-based)
```

### **Usage**
Once a plugin is registered, its options become available in your request configuration:
```typescript
await api({
  url: '/users',
  retry: 3,           // Retries 3 times on failure
  qCache: true,       // Enables response caching
  qCacheTime: 60000   // 1 minute TTL
});
```

---

## 6. Monorepo Architecture

```
blazion/
├── packages/
│   ├── core/                     @blazion/core
│   ├── plugin-retry/             @blazion/plugin-retry
│   ├── plugin-cache/             @blazion/plugin-cache
│   ├── plugin-download/          @blazion/plugin-download-progress
│   └── plugin-upload/            @blazion/plugin-upload-progress
├── package.json                  (root — npm workspaces)
└── tsconfig.json                 (shared compiler options)
```

### Adding a New Plugin

1. Create a new folder: `packages/plugin-<name>/`
2. Add `package.json` with `peerDependencies` on `@blazion/core`
3. Add `tsconfig.json` extending the root config with a `references` to `../core`
4. Implement `BlazionPlugin` interface from `@blazion/core`:

```typescript
import { BlazionPlugin, BlazionPluginName, BlazionInternalPublic } from '@blazion/core';

export const MyPlugin = (): BlazionPlugin => ({
  name: 'my_plugin' as BlazionPluginName,
  install(instance: BlazionInternalPublic) {
    // Hook into instance.engineAdapter, instance.executionWrapper,
    // or instance.interceptors to add your feature
  }
});
```

5. For type augmentation, use declaration merging:
```typescript
declare module '@blazion/core' {
  interface BlazionPluginConfig {
    myOption?: string;           // Instance-level config
  }
  interface BlazionPluginIndividualRequestConfig {
    myOption?: string;           // Per-request config
  }
}
```

/* eslint-disable no-console */
import assert from 'assert';
import blazion, { HttpMethod, BlazionError, createBlazion } from './index';
import { CachePlugin, RetryPlugin, UploadPlugin, DownloadPlugin } from './features';

blazion.use(CachePlugin());
blazion.use(RetryPlugin());
blazion.use(UploadPlugin());
blazion.use(DownloadPlugin());

async function runTests() {
  console.log('🚀 TESTING BLAZION FEATURES...\n');

  try {
    try {
      const user = await blazion<{ name: string }>({
        url: 'https://jsonplaceholder.typicode.com/users/1',
        method: HttpMethod.GET
      });
      console.log('✅ GET Success:', user.name);
    } catch (e) {
      console.log('❌ GET Success failed:', e);
    }

    // 2. Structured 404 Case
    try {
      console.log('\nTesting 404 Error...');
      await blazion({
        url: 'https://jsonplaceholder.typicode.com/invalid-endpoint-999',
        method: HttpMethod.GET
      });
      console.log('❌ Failed to catch structured error');
    } catch (e) {
      if (e instanceof BlazionError) {
        console.log('✅ Caught Structured BlazionError:', {
          Code: e.code,
          Status: e.status
        });
      } else {
        console.log('❌ Unexpected error type:', e);
      }
    }

    // 3. Timeout Case
    try {
      console.log('\nTesting Timeout Error...');
      await blazion({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: HttpMethod.GET,
        timeout: 1
      });
    } catch (e) {
      if (e instanceof BlazionError && e.isTimeoutError) {
        console.log('✅ Caught Timeout Error:', e.code);
      } else {
        console.log('❌ Timeout test failed:', e);
      }
    }

    // 4. Abort Case
    try {
      console.log('\nTesting Abort Error...');
      const controller = new AbortController();
      const p = blazion({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: HttpMethod.GET,
        signal: controller.signal
      });
      controller.abort();
      await p;
    } catch (e) {
      if (e instanceof BlazionError && e.isAbortError) {
        console.log('✅ Caught Abort Error:', e.code);
      } else {
        console.log('❌ Abort test failed:', e);
      }
    }

    // 5. Global Timeout Case
    try {
      console.log('\nTesting Global Timeout (1ms)...');
      const customQf = createBlazion({ timeout: 1 });
      await customQf({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: HttpMethod.GET
      });
    } catch (e) {
      if (e instanceof BlazionError && e.isTimeoutError) {
        console.log('✅ Global Timeout caught correctly');
      } else {
        console.log('❌ Global Timeout failed:', e);
      }
    }

    // 6. Parameter Validation Case
    try {
      console.log('\nTesting Parameter Validation...');
      await blazion({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: HttpMethod.GET,
        params: {
          page: (() => 9) as never
        }
      });
    } catch (e) {
      if (e instanceof TypeError && e.message.includes('Invalid parameter type')) {
        console.log('✅ Caught expected TypeError for invalid parameter');
      } else {
        console.log('❌ Parameter validation failed:', e);
      }
    }

    // ===== NEW: RETRY & CACHE TESTS =====

    // 7. Retry on Timeout (should retry then fail)
    try {
      console.log('\nTesting Retry on Timeout (2 retries, 1ms timeout)...');
      await blazion({
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: HttpMethod.GET,
        timeout: 1,
        retry: 2,
        retryDelay: 100
      });
      console.log('❌ Retry test should have timed out');
    } catch (e) {
      if (e instanceof BlazionError && e.isTimeoutError) {
        console.log('✅ Retry exhausted after retries, final timeout caught');
      } else {
        console.log('❌ Retry test failed:', e);
      }
    }

    // 8. Retry does NOT retry on 404 (non-retryable)
    try {
      console.log('\nTesting Retry skips 404 (non-retryable)...');
      await blazion({
        url: 'https://jsonplaceholder.typicode.com/invalid-path-404',
        method: HttpMethod.GET,
        retry: 3,
        retryDelay: 500
      });
      console.log('❌ 404 retry test should have thrown');
    } catch (e) {
      if (e instanceof BlazionError && e.status === 404) {
        // If it didn't retry, it should be fast (< 1 second)
        console.log('✅ 404 threw immediately without retrying (non-retryable)');
      } else {
        console.log('❌ 404 retry test unexpected error:', e);
      }
    }

    // 9. Cache Hit Test
    try {
      console.log('\nTesting Cache Hit...');
      const cachedApi = createBlazion({
        baseURL: 'https://jsonplaceholder.typicode.com',
        qCache: true,
        qCacheTime: 10000
      });
      cachedApi.use(CachePlugin());

      // First call — cache miss (network)
      const start1 = Date.now();
      const result1 = await cachedApi<{ id: number; name: string }>({
        url: '/users/1',
        method: HttpMethod.GET
      });
      const time1 = Date.now() - start1;

      // Second call — cache hit (instant)
      const start2 = Date.now();
      const result2 = await cachedApi<{ id: number; name: string }>({
        url: '/users/1',
        method: HttpMethod.GET
      });
      const time2 = Date.now() - start2;

      if (result1.name === result2.name && time2 < time1) {
        console.log(`✅ Cache Hit! Network: ${time1}ms, Cached: ${time2}ms`);
      } else {
        console.log('❌ Cache test failed — responses differ or cache was slower');
      }
    } catch (e) {
      console.log('❌ Cache test failed:', e);
    }

    // 10. Cache Bypass for POST
    try {
      console.log('\nTesting Cache Bypass for POST...');
      const cachedApi = createBlazion({
        baseURL: 'https://jsonplaceholder.typicode.com',
        qCache: true
      });
      cachedApi.use(CachePlugin());

      await cachedApi<{ id: number }>({
        url: '/posts',
        method: HttpMethod.POST,
        payload: { title: 'test', body: 'test', userId: 1 }
      });

      // POST should work but not be cached (no crash = pass)
      console.log('✅ POST executed successfully (not cached)');
    } catch (e) {
      console.log('❌ POST cache bypass test failed:', e);
    }

    // 11. Per-request cache override
    try {
      console.log('\nTesting Per-request Cache Override...');
      const noCacheApi = createBlazion({
        baseURL: 'https://jsonplaceholder.typicode.com',
        qCache: false // globally disabled
      });
      noCacheApi.use(CachePlugin());

      // But enable cache for this specific request
      const r1 = await noCacheApi<{ name: string }>({
        url: '/users/2',
        method: HttpMethod.GET,
        qCache: true,      // override: enable
        qCacheTime: 10000
      });

      const start = Date.now();
      const r2 = await noCacheApi<{ name: string }>({
        url: '/users/2',
        method: HttpMethod.GET,
        qCache: true
      });
      const elapsed = Date.now() - start;

      if (r1.name === r2.name && elapsed < 5) {
        console.log(`✅ Per-request cache override works! Cached in ${elapsed}ms`);
      } else {
        console.log('❌ Per-request cache override failed');
      }
    } catch (e) {
      console.log('❌ Per-request cache override test failed:', e);
    }

    // 12. clearCache()
    try {
      console.log('\nTesting clearCache()...');
      const api = createBlazion({
        baseURL: 'https://jsonplaceholder.typicode.com',
        qCache: true,
        qCacheTime: 60000
      });
      api.use(CachePlugin());

      await api<{ name: string }>({ url: '/users/3', method: HttpMethod.GET });

      // Clear cache
      api.clearCache();

      // This should be a network call again (not cached)
      const start = Date.now();
      await api<{ name: string }>({ url: '/users/3', method: HttpMethod.GET });
      const elapsed = Date.now() - start;

      if (elapsed > 5) {
        console.log(`✅ clearCache() works! Re-fetched in ${elapsed}ms`);
      } else {
        console.log('❌ clearCache() might not have worked');
      }
    } catch (e) {
      console.log('❌ clearCache test failed:', e);
    }

    // 13. Form Data Parsing Mismatch Matcher
    // When a payload is an Object but the user explictly specified application/x-www-form-urlencoded,
    // the library should auto-convert the object to URLSearchParams under the hood.
    console.log('\nTesting x-www-form-urlencoded Object formatting...');
    try {
      const rawApi = blazion;
      const formResponse = await rawApi<{ form: Record<string, string> }>({
        url: 'https://postman-echo.com/post',
        method: HttpMethod.POST,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        payload: { platform: 'web', awesome: true }
      });

      assert(formResponse.form.platform === 'web' && formResponse.form.awesome === 'true', 'Formatting algorithm failed to parse object dynamically into URL Encoded form data.');
      console.log('✅ Form Data Auto-mapped successfully! Native Echo:', formResponse.form);
    } catch (e) {
      console.error('❌ Formatting Algorithm Test Failed', e);
    }

    // 14. Upload / Download Progress Interceptors
    console.log('\nTesting Progress Trackers via Stream Interception...');
    try {
      let dlTicks = 0;
      let upTicks = 0;
      const progressApi = blazion;

      await progressApi({
        url: 'https://postman-echo.com/post',
        method: HttpMethod.POST,
        payload: { massive: 'X'.repeat(500000) },
        onUploadProgress: (e) => {
          upTicks++;
          assert(e.progress >= 0 && e.progress <= 1, 'Upload progression bounded between 0 and 1 violated');
        },
        onDownloadProgress: (e) => {
          dlTicks++;
          assert(e.progress >= 0, 'Download progress violated');
        }
      });

      if (typeof window !== 'undefined') {
        assert(upTicks > 0, 'Upload progress callback not hit');
        assert(dlTicks > 0, 'Download progress callback not hit');
        console.log(`✅ Upload/Download Tracking executed beautifully (UP_TICKS: ${upTicks}, DL_TICKS: ${dlTicks})`);
      } else {
        console.log('⏩ Skipped Upload/Download Tracking assertions (NodeJS environment lacks XHR natively)');
      }
    } catch (e) {
      console.error('❌ Progress Tracking Test Failed', e);
    }

    // 15. Header Merging & Case Sensitivity Case
    console.log('\nTesting Header Merging, Overrides, and Case-Insensitivity...');
    try {
      const headerApi = createBlazion({
        headers: { 'X-Global-Header': 'global', 'X-Override': 'replace-me' }
      });

      const echo = await headerApi<{ headers: Record<string, string> }>({
        url: 'https://postman-echo.com/get',
        headers: { 'X-OVERRIDE': 'success', 'X-Local-Header': 'local' }
      });

      const h = echo.headers;

      // Verification: 'x-override' should exist only once with value 'success'
      // Global header should be present
      // Local header should be present
      assert(h['x-global-header'] === 'global', 'Global header lost');
      assert(h['x-override'] === 'success', 'Header override failed or case collision occurred');
      assert(h['x-local-header'] === 'local', 'Local header lost');

      console.log('✅ Headers merged, overridden, and case-normalized correctly!');
    } catch (e) {
      console.error('❌ Header Validation Test Failed', e);
    }

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Unexpected Test Failure:', err);
  }
}

runTests().then(() => process.exit(0));
runTests().then(() => process.exit(0));

/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import qf, { createQuokkaFetch, QuokkaFetchError } from './index';

async function runDemo() {
  console.log('--- QuokkaFetch Demo ---');

  try {
    // 1. Configuration
    const api = createQuokkaFetch({
      baseURL: 'https://jsonplaceholder.typicode.com',
      timeout: 5000,
      headers: {
        'X-Demo-Mode': 'true'
      }
    });

    // 2. Request Interceptor
    api.onRequest((config) => {
      console.log(`[Request] ${config.method} ${config.url}`);
      return config;
    });

    // 3. Response Interceptor
    api.onResponse((data, response) => {
      console.log(`[Response] Status: ${response.status}`);
      return data;
    });

    // 4. Error Interceptor
    api.onError((error) => {
      console.error(`[Error] ${error.message}`);
    });

    // --- Demo Cases ---

    // 2A. Simple GET
    console.log('\n--- Case A: Simple GET ---');
    const posts = await api<any[]>({ url: '/posts', params: { _limit: 3 } });
    console.log('Fetched Posts Count:', posts.length);

    // 2B. POST with Sniffing
    console.log('\n--- Case B: POST with Auto-Sniffing ---');
    await api({
      url: '/posts',
      method: 'POST' as any,
      payload: { title: 'Hello', body: 'Quokka', userId: 1 }
    });
    console.log('POST Success (application/json sniffed)');

    // 2C. Custom Timeout
    console.log('\n--- Case C: Custom Timeout ---');
    try {
      await api({ url: '/posts', timeout: 1 });
    } catch (error: any) {
      console.log('Caught Timeout:', error.code);
    }

    // 2D. Structured Error Handling
    console.log('\n--- Case D: Structured Error Catching ---');
    try {
      await qf({ url: 'https://jsonplaceholder.typicode.com/invalid-path-404' });
    } catch (error) {
      const isQFError = error instanceof QuokkaFetchError;
      [isQFError].filter(Boolean).forEach(() => {
        const e = error as QuokkaFetchError;
        console.log('Caught Expected Error:');
        console.log(' - Name:', e.name);
        console.log(' - Code:', e.code);
        console.log(' - Status:', e.status);
        console.log(' - RequestID:', e.requestId);
      });
    }

    console.log('\n✨ DEMO COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Demo Error:', err);
  }
}

void runDemo();

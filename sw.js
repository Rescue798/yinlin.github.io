const CACHE_NAME = 'music-cache-v2';
const AUDIO_CACHE_NAME = 'audio-cache-v2';

// 添加缓存优先策略
const cacheFirst = async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
};

// 优化音频缓存策略
const audioStrategy = async (request) => {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const cached = await cache.match(request);
    
    // 如果缓存存在且未过期，直接返回
    if (cached) {
        const cacheAge = Date.now() - (new Date(cached.headers.get('date')).getTime());
        if (cacheAge < 24 * 60 * 60 * 1000) return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (error) {
        return cached || Response.error();
    }
};

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    if (url.pathname.endsWith('.mp3')) {
        event.respondWith(audioStrategy(event.request));
    } else {
        event.respondWith(cacheFirst(event.request));
    }
}); 
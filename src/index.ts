declare const BUCKET: KVNamespace

const GET_WAIT = 1000
const MAX_GETS = 60

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
}

addEventListener('fetch', (event) => {
    event.respondWith(handler(event))
})

async function handler(event: FetchEvent): Promise<Response> {
    const url = new URL(event.request.url)
    const id = url.pathname.slice(1)
    if (id.length < 6) {
        return new Response(null, {status: 400})
    }
    switch (event.request.method) {
        case 'POST':
            console.log('put', id)
            await BUCKET.put(id, event.request.body, {expirationTtl: 300})
            return new Response(null, {status: 200})
        case 'GET':
            console.log('read', id)
            return handleGet(id)
        case 'OPTIONS':
            return handleOptions()
        default:
            return new Response(null, {status: 405})
    }
}

async function handleGet(id: string): Promise<Response> {
    let tries = 0,
        rv
    for (;;) {
        rv = await BUCKET.get(id, 'stream')
        if (rv !== null || ++tries > MAX_GETS) break
        await sleep(GET_WAIT)
    }
    console.log(rv === null ? 'miss' : 'hit', tries)
    return new Response(rv, {status: rv === null ? 408 : 200, headers: CORS})
}

function handleOptions() {
    return new Response(null, {
        headers: {
            ...CORS,
            Allow: 'GET, POST, OPTIONS',
        },
    })
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

function backoff(tries: number): number {
    return Math.min(Math.pow(tries * 10, 2), 10 * 1000)
}

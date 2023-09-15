import { KVNamespace, R2Bucket } from '@cloudflare/workers-types'
import { zValidator } from '@hono/zod-validator'
import { Hono, MiddlewareHandler } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { cors } from 'hono/cors'
import { z } from 'zod'

const DEFAULT_LIBRARY = 'scoutsheirbrug'

function generateId(length: number) {
	const bytes = crypto.getRandomValues(new Uint8Array(length + 2))
	return btoa(String.fromCharCode(...bytes))
		.replace(/[+/=]/g, '')
		.substring(0, length)
		.padEnd(length, '0')
}

type Env = {
	KV: KVNamespace,
	BUCKET: R2Bucket,
	DEFAULT_SECRET: string,
}

type Library = {
	id: string,
	secret: string,
	timestamp: string,
	albums: Album[],
}

type Album = {
	id: string,
	name: string,
	cover?: string,
	timestamp: string,
	public: boolean,
	photos: Photo[],
}

type Photo = {
	id: string,
	author?: string | undefined,
	timestamp: string,
}

const app = new Hono<{ Bindings: Env }>().basePath('/api')

app.use('/*', cors({
	origin: '*',
	maxAge: 86400,
}))

app.options('*', (c) => {
	return c.text('', 204)
})

const getLibrary: MiddlewareHandler<{
	Bindings: Env,
	Variables: { library: Library, authorized: boolean },
}> = async (c, next) => {
	const libraryId = c.req.query('library')
	if (!libraryId || !libraryId.match(/^[A-Za-z0-9_-]+$/)) {
		return c.text('Expected a valid "library" search parameter', 400)
	}
	let libraryData = await c.env.KV.get(`library-${libraryId}`)
	if (libraryData === null && libraryId === DEFAULT_LIBRARY) {
		libraryData = JSON.stringify({
			id: DEFAULT_LIBRARY,
			secret: c.env.DEFAULT_SECRET,
			timestamp: new Date().toISOString(),
			albums: [],
		})
		await c.env.KV.put(`library-${libraryId}`, libraryData)
	}
	if (libraryData === null) {
		return c.text(`Library "${libraryId}" not found`, 404)
	}
	const library = JSON.parse(libraryData) as Library
	c.set('library', library)
	const secret = c.req.query('secret')
	const authorized = library.secret === undefined || secret === library.secret
	c.set('authorized', authorized)
	if (!authorized) {
		library.albums = library.albums.filter(a => a.public)
	}
	await next()
}

app.get('/library', getLibrary, async (c) => {
	const { library, authorized } = c.var
	let result: Omit<Library, 'secret'> & { secret?: string, authorized?: boolean } = library
	result.authorized = authorized
	delete result.secret
	return c.json(result)
})

const postAlbumSchema = z.object({
	name: z.string(),
	timestamp: z.string().optional(),
	public: z.boolean().optional(),
})
app.post('/album', getLibrary, zValidator('json', postAlbumSchema), async (c) => {
	const { library, authorized } = c.var
	if (!authorized) {
		return c.text(`Unauthorized to access library "${library.id}"`, 401)
	}
	const body = c.req.valid('json')
	if (library.albums.find(a => a.name === body.name)) {
		return c.text(`Album with name "${body.name}" already exists`, 400)
	}
	const albumId = generateId(16)
	const album = {
		id: albumId,
		name: body.name,
		timestamp: body.timestamp ?? new Date().toISOString(),
		public: body.public ?? false,
		photos: [],
	}
	library.albums.push(album)
	await c.env.KV.put(`library-${library.id}`, JSON.stringify(library))
	return c.json(album)
})

const patchAlbumSchema = postAlbumSchema.extend({
	cover: z.string().or(z.null()),
	photos: z.array(z.object({
		id: z.string(),
		author: z.string().optional(),
		timestamp: z.string().optional(),
	})),
}).partial()
app.patch('/album/:id', getLibrary, zValidator('json', patchAlbumSchema), async (c) => {
	const albumId = c.req.param('id')
	const { library, authorized } = c.var
	if (!authorized) {
		return c.text(`Unauthorized to access library "${library.id}"`, 401)
	}
	const body = c.req.valid('json')
	const album = library.albums.find(a => a.id === albumId)
	if (!album) {
		return c.text(`Album "${albumId}" not found`, 404)
	}
	if (body.name) {
		album.name = body.name
	}
	if (body.timestamp) {
		album.timestamp = body.timestamp
	}
	if (body.photos !== undefined) {
		const deletedPhotos = album.photos.filter(p => !body.photos!.find(q => q.id === p.id))
		album.photos = body.photos.map(p => {
			const photo = album.photos.find(q => q.id === p.id)
			return { ...photo, ...p, timestamp: p.timestamp ?? photo?.timestamp ?? new Date().toISOString() }
		})
		for (const photo of deletedPhotos) {
			if (album.cover === photo.id) {
				album.cover = undefined
			}
			await c.env.BUCKET.delete(photo.id)
			await c.env.BUCKET.delete(`thumb_${photo.id}`)
		}
	}
	if (body.cover && album.photos.some(p => p.id === body.cover)) {
		album.cover = body.cover
	} else if (body.cover === null) {
		delete album.cover
	}
	if (body.public !== undefined) {
		album.public = body.public
	}
	await c.env.KV.put(`library-${library.id}`, JSON.stringify(library))
	return c.json(album)
})

app.delete('/album/:id', getLibrary, async (c) => {
	const albumId = c.req.param('id')
	const { library, authorized } = c.var
	if (!authorized) {
		return c.text(`Unauthorized to access library "${library.id}"`, 401)
	}
	const albumIndex = library.albums.findIndex(a => a.id === albumId)
	if (albumIndex === -1) {
		return c.text(`Album "${albumId}" not found`, 404)
	}
	library.albums.splice(albumIndex, 1)
	await c.env.KV.put(`library-${library.id}`, JSON.stringify(library))
	return c.text('')
})

app.post('/photo', getLibrary, async (c) => {
	const { library, authorized } = c.var
	if (!authorized) {
		return c.text(`Unauthorized to access library "${library.id}"`, 401)
	}
	const formData = await c.req.formData()
	const file = formData.get('file')
	if (!(file instanceof File)) {
		return c.text(`Expected "file" to be a File`, 400)
	}
	const thumbnail = formData.get('thumbnail')
	if (!(thumbnail instanceof File)) {
		return c.text(`Expected "thumbnail" to be a File`, 400)
	}
	const photoId = generateId(16)
	await c.env.BUCKET.put(photoId, file as any, {
		httpMetadata: {
			contentType: file.type,
		},
	})
	await c.env.BUCKET.put(`thumb_${photoId}`, thumbnail as any, {
		httpMetadata: {
			contentType: thumbnail.type,
		},
	})
	const photo = {
		id: photoId,
		timestamp: formData.get('timestamp')?.toString() ?? new Date().toISOString(),
	}
	return c.json(photo)
})

app.get('/photo/:id', async (c) => {
	const photoId = c.req.param('id')
	const size = c.req.query('size')
	let objectId: string
	if (size === 'original') {
		objectId = photoId
	} else if (size === 'thumbnail') {
		objectId = `thumb_${photoId}`
	} else {
		return c.text('Expected a valid "size" search parameter', 400)
	}
	const photo = await c.env.BUCKET.get(objectId)
	if (photo === null) {
		return c.text('Photo not found', 404)
	}
	console.log('Returning photo', photo.size)
	const status = photo.body ? 200 : 304
	return c.body(photo.body as any, status, {
		'Cache-Control': 'public, max-age=604800, immutable',
		'Content-Type': photo.httpMetadata?.contentType ?? 'image/jpeg',
		'Content-Length': photo.size.toFixed(),
		'Etag': photo.httpEtag,
	})
})

export const onRequest = handle(app)

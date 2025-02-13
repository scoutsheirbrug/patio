import { KVNamespace, R2Bucket } from '@cloudflare/workers-types'
import { zValidator } from '@hono/zod-validator'
import * as jwt from '@tsndr/cloudflare-worker-jwt'
import { Hono, MiddlewareHandler } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import { cors } from 'hono/cors'
import { z } from 'zod'

declare const crypto: import('@cloudflare/workers-types').Crypto

function generateId(length: number) {
	const bytes = crypto.getRandomValues(new Uint8Array(length + 2))
	return btoa(String.fromCharCode(...bytes))
		.replace(/[+/=]/g, '')
		.substring(0, length)
		.padEnd(length, '0')
}

function createSlug(name: string) {
	return name.toLocaleLowerCase()
		.replace(/[^a-z0-9]/g, '-')
		.replace(/\-\-+/g, '-')
		.replace(/^\-/, '')
		.replace(/\-$/, '')
}

type Env = {
	KV: KVNamespace,
	BUCKET: R2Bucket,
	ADMIN_SECRET: string,
	TOKEN_SECRET: string,
}

type Root = {
	users?: string[],
	libraries?: string[],
}

type User = {
	username: string,
	password?: string,
	library_access: string[],
	admin_access: boolean,
	created_by?: string,
	timestamp?: string,
}

function hasLibraryAccess(libraryId: string, actor: User | undefined) {
	return actor?.admin_access || actor?.library_access.includes(libraryId) || false
}

function safeUser(user: User, actor: User | undefined) {
	const result: User = { ...user }
	delete result.password
	if (!actor?.admin_access) {
		delete result.created_by
		delete result.timestamp
	}
	return result
}

type Library = {
	id: string,
	created_by?: string,
	timestamp?: string,
} & ({
	type?: 'albums',
	albums: Album[],
} | {
	type: 'photos',
	photos: Photo[],
})

function safeLibrary(library: Library, actor: User | undefined) {
	if (!actor?.admin_access) {
		delete library.created_by
		delete library.timestamp
	}
	if (!library.type) {
		library.type = 'albums'
	}
	if (!hasLibraryAccess(library.id, actor)) {
		if (library.type === 'albums') {
			library.albums = library.albums.map(a => safeAlbum(a, actor))
		} else if (library.type === 'photos') {
			library.photos = library.photos.map(p => safePhoto(p, actor))
		}
	}
	return library
}

type Album = {
	id: string,
	name: string,
	slug?: string,
	cover?: string,
	public: boolean,
	date: string,
	created_by?: string,
	timestamp?: string,
	photos: Photo[],
}

function safeAlbum(album: Album, actor: User | undefined) {
	if (!actor?.admin_access) {
		delete album.created_by
		delete album.timestamp
		album.photos = album.photos.map(p => safePhoto(p, actor))
	}
	return album
}

type Photo = {
	id: string,
	uploaded_by?: string,
	timestamp?: string,
}

function safePhoto(photo: Photo, actor: User | undefined) {
	if (!actor?.admin_access) {
		delete photo.uploaded_by
		delete photo.timestamp
	}
	return photo
}

const app = new Hono<{
	Bindings: Env,
	Variables: { user: User | undefined },
}>().basePath('/api')

app.use('*', cors({
	origin: '*',
	maxAge: 86400,
}))

app.use('*', async (c, next) => {
	const auth = c.req.header('Authorization')
	let user: User | undefined
	if (auth?.startsWith('Bearer ')) {
		const token = auth.slice(7)
		const isValid = await jwt.verify(token, c.env.TOKEN_SECRET)
		if (!isValid) {
			return c.text('Invalid token', 401)
		}
		const { payload } = jwt.decode(token)
		if (typeof payload.username !== 'string') {
			return c.text('Malformed token', 401)
		}
		const userData = await c.env.KV.get(`user-${payload.username}`)
		if (userData === null) {
			return c.text('User from token not found ', 401)
		}
		user = safeUser(JSON.parse(userData) as User, undefined)
	} else if (c.env.ADMIN_SECRET !== undefined && auth === c.env.ADMIN_SECRET) {
		user = {
			username: 'admin',
			admin_access: true,
			library_access: [],
		}
	}
	c.set('user', user)
	await next()
})

app.options('*', (c) => {
	return c.text('', 204)
})

// Source: https://gist.github.com/chrisveness/770ee96945ec12ac84f134bf538d89fb

async function hashPassword(password: string, iterations = 1e4) {
	const pwUtf8 = new TextEncoder().encode(password)
	const pwKey = await crypto.subtle.importKey('raw', pwUtf8, 'PBKDF2', false, ['deriveBits'])
	const saltUint8 = crypto.getRandomValues(new Uint8Array(16))
	const params = { name: 'PBKDF2', hash: 'SHA-256', salt: saltUint8, iterations: iterations }
	const keyBuffer = await crypto.subtle.deriveBits(params, pwKey, 256)
	const keyArray = Array.from(new Uint8Array(keyBuffer))
	const saltArray = Array.from(new Uint8Array(saltUint8))
	const iterHex = ('000000' + iterations.toString(16)).slice(-6)
	const iterArray = iterHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
	const compositeArray = ([] as number[]).concat(saltArray, iterArray, keyArray)
	const compositeStr = compositeArray.map(byte => String.fromCharCode(byte)).join('')
	return btoa('v01' + compositeStr)
}

async function verifyPassword(plain: string, hash: string) {
	const compositeStr = atob(hash)
	const version = compositeStr.slice(0, 3)
	const saltStr = compositeStr.slice(3, 19)
	const iterStr = compositeStr.slice(19, 22)
	const keyStr = compositeStr.slice(22, 54)
	if (version != 'v01') throw new Error('Invalid key')
	const saltUint8 = new Uint8Array(saltStr.match(/./g)!.map(ch => ch.charCodeAt(0)))
	const iterHex = iterStr.match(/./g)!.map(ch => ch.charCodeAt(0).toString(16)).join('')
	const iterations = parseInt(iterHex, 16)
	const pwUtf8 = new TextEncoder().encode(plain)
	const pwKey = await crypto.subtle.importKey('raw', pwUtf8, 'PBKDF2', false, ['deriveBits'])
	const params = { name: 'PBKDF2', hash: 'SHA-256', salt: saltUint8, iterations: iterations }
	const pwKeyBuffer = await crypto.subtle.deriveBits(params, pwKey, 256)
	const keyBuffer = new Uint8Array(keyStr.match(/./g)!.map(ch => ch.charCodeAt(0)))
	return crypto.subtle.timingSafeEqual(pwKeyBuffer, keyBuffer)
}

app.get('/user', async (c) => {
	const { user: admin } = c.var
	if (!admin?.admin_access) {
		return c.text('Unauthorized to access users', 401)
	}
	const rootData = await c.env.KV.get('root') ?? '{}'
	const root = JSON.parse(rootData) as Root
	return c.json(root.users ?? [])
})

const postUserSchema = z.object({
	username: z.string().min(1).refine(s => /^[A-Za-z0-9._-]+$/.test(s)),
	password: z.string(),
	library_access: z.array(z.string()),
	admin_access: z.boolean(),
})
app.post('/user', zValidator('json', postUserSchema), async (c) => {
	const { user: admin } = c.var
	if (!admin?.admin_access) {
		return c.text('Unauthorized to create user', 401)
	}
	const body = c.req.valid('json')
	const existing = await c.env.KV.get(`user-${body.username}`)
	if (existing !== null) {
		return c.text(`User with username "${body.username}" already exists`, 400)
	}
	const passwordHash = await hashPassword(body.password)
	const user: User = {
		username: body.username,
		password: passwordHash,
		library_access: body.library_access,
		admin_access: body.admin_access,
		created_by: admin.username,
		timestamp: new Date().toISOString(),
	}
	await c.env.KV.put(`user-${user.username}`, JSON.stringify(user))
	const rootData = await c.env.KV.get('root') ?? '{}'
	const root = JSON.parse(rootData) as Root
	if (!root.users) root.users = []
	root.users.push(user.username)
	await c.env.KV.put('root', JSON.stringify(root))
	return c.json(safeUser(user, admin))
})

const patchUserSchema = postUserSchema.omit({
	username: true,
	password: true,
}).partial()
app.patch('/user/:username', zValidator('json', patchUserSchema), async (c) => {
	const { user: admin } = c.var
	const username = c.req.param('username')
	if (!admin?.admin_access) {
		return c.text(`Unauthorized to access user "${username}"`, 401)
	}
	const userData = await c.env.KV.get(`user-${username}`)
	if (userData === null) {
		return c.text(`User "${username}" not found`, 404)
	}
	const user = JSON.parse(userData) as User
	const body = c.req.valid('json')
	if (body.admin_access !== undefined) {
		if (admin.username === user.username) {
			return c.text(`Unauthorized to modify "admin_access" of yourself`, 401)
		}
		user.admin_access = body.admin_access
	}
	if (body.library_access !== undefined) {
		user.library_access = body.library_access
	}
	await c.env.KV.put(`user-${user.username}`, JSON.stringify(user))
	return c.json(safeUser(user, admin))
})

app.delete('/user/:username', async (c) => {
	const { user: admin } = c.var
	const username = c.req.param('username')
	if (!admin?.admin_access) {
		return c.text(`Unauthorized to delete user "${username}"`, 401)
	}
	if (admin.username === username) {
		return c.text(`Unauthorized to delete yourself`, 401)
	}
	await c.env.KV.delete(`user-${username}`)
	const rootData = await c.env.KV.get('root') ?? '{}'
	const root = JSON.parse(rootData) as Root
	if (!root.users) root.users = []
	root.users = root.users.filter(u => u !== username)
	await c.env.KV.put('root', JSON.stringify(root))
	return c.text('')
})

app.get('/user/:username', async (c) => {
	const { user: authUser } = c.var
	const username = c.req.param('username')
	const userData = await c.env.KV.get(`user-${username}`)
	if (userData === null) {
		return c.text(`User "${username}" not found`, 404)
	}
	const user = JSON.parse(userData) as User
	if (!authUser?.admin_access && (authUser === undefined || authUser.username !== user.username)) {
		return c.text(`Unauthorized to access user "${user.username}"`, 401)
	}
	return c.json(safeUser(user, authUser))
})

const loginSchema = z.object({
	username: z.string(),
	password: z.string(),
})
app.post('/login', zValidator('json', loginSchema), async (c) => {
	const body = c.req.valid('json')
	const username = body.username
	const userData = await c.env.KV.get(`user-${username}`)
	if (userData === null) {
		return c.text(`User "${username}" not found`, 404)
	}
	const user = JSON.parse(userData) as User
	const matches = await verifyPassword(body.password, user.password!)
	if (!matches) {
		return c.text(`Incorrect password`, 401)
	}
	const token = await jwt.sign({
		username: body.username,
		exp: Math.floor(Date.now() / 1000) + (2 * (60 * 60)), // 2 hours
	}, c.env.TOKEN_SECRET)
	return c.json({
		token: token,
		user: safeUser(user, user),
	})
})

const getLibrary: MiddlewareHandler<{
	Bindings: Env,
	Variables: {
		user: User,
		library: Library,
		authorized: boolean,
	} | {
		user: undefined,
		library: Library,
		authorized: false,
	},
}> = async (c, next) => {
	const libraryId = c.req.query('library')
	if (!libraryId || !libraryId.match(/^[A-Za-z0-9_-]+$/)) {
		return c.text('Expected a valid "library" search parameter', 400)
	}
	let libraryData = await c.env.KV.get(`library-${libraryId}`)
	if (libraryData === null) {
		return c.text(`Library "${libraryId}" not found`, 404)
	}
	const library = JSON.parse(libraryData) as Library
	if (!library.type) {
		library.type = 'albums'
	}
	c.set('library', library)
	const user = c.var.user
	const authorized = user?.admin_access || user?.library_access.includes(library.id) || false
	c.set('authorized', authorized)
	if (!authorized) {
		if (library.type === 'albums') {
			library.albums = library.albums.filter(a => a.public)
		}
	}
	await next()
}

const postLibrarySchema = z.object({
	id: z.string().min(1).refine(s => /^[A-Za-z0-9._-]+$/.test(s)),
	type: z.enum(['albums', 'photos']),
})
app.post('/library', zValidator('json', postLibrarySchema), async (c) => {
	const { user } = c.var
	if (!user?.admin_access) {
		return c.text('Unauthorized to create library', 401)
	}
	const body = c.req.valid('json')
	const library: Library = {
		id: body.id,
		created_by: user.username,
		timestamp: new Date().toISOString(),
		...body.type === 'albums'
			? { type: 'albums', albums: [] }
			: { type: 'photos', photos: [] }
	}
	await c.env.KV.put(`library-${library.id}`, JSON.stringify(library))
	const rootData = await c.env.KV.get('root') ?? '{}'
	const root = JSON.parse(rootData) as Root
	if (!root.libraries) root.libraries = []
	root.libraries.push(library.id)
	await c.env.KV.put('root', JSON.stringify(root))
	return c.json(safeLibrary(library, user))
})

const patchLibrarySchema = z.object({
	photos: z.array(z.object({
		id: z.string(),
	})),
})
app.patch('/library', getLibrary, zValidator('json', patchLibrarySchema), async (c) => {
	const { user, library, authorized } = c.var
	if (!authorized) {
		return c.text(`Unauthorized to access library "${library.id}"`, 401)
	}
	if (library.type !== 'photos') {
		return c.text('This library is not of type "photos"', 400)
	}
	const body = c.req.valid('json')
	if (body.photos !== undefined) {
		const deletedPhotos = library.photos.filter(p => !body.photos!.find(q => q.id === p.id))
		library.photos = body.photos.map(p => {
			const photo = library.photos.find(q => q.id === p.id)
			return {
				...photo,
				...p,
				uploaded_by: user.username,
				timestamp: new Date().toISOString(),
			} satisfies Photo
		})
		for (const photo of deletedPhotos) {
			await c.env.BUCKET.delete([photo.id, `thumb_${photo.id}`, `preview_${photo.id}`])
		}
	}
	await c.env.KV.put(`library-${library.id}`, JSON.stringify(library))
	return c.json(safeLibrary(library, user))
})

app.get('/library', async (c, next) => {
	if (!c.req.query('library')) {
		const { user: actor } = c.var
		const rootData = await c.env.KV.get('root') ?? '{}'
		const root = JSON.parse(rootData) as Root
		const allLibraries = root.libraries ?? []
		return c.json(allLibraries.filter(l => hasLibraryAccess(l, actor)))
	}
	await next()
}, getLibrary, async (c) => {
	const { user, library, authorized } = c.var
	let result: Library & { authorized?: boolean } = library
	result.authorized = authorized
	return c.json(safeLibrary(library, user))
})

app.delete('/library/:id', async (c) => {
	const { user: admin } = c.var
	const libraryId = c.req.param('id')
	if (!admin?.admin_access) {
		return c.text(`Unauthorized to delete library "${libraryId}"`, 401)
	}
	let libraryData = await c.env.KV.get(`library-${libraryId}`)
	if (libraryData === null) {
		return c.text(`Library "${libraryId}" not found`, 404)
	}
	const library = JSON.parse(libraryData) as Library
	if (library.type === 'albums' && library.albums.length > 0) {
		return c.text(`Not allowed to delete library with albums`, 400)
	} else if (library.type === 'photos' && library.photos.length > 0) {
		return c.text(`Not allowed to delete library with photos`, 400)
	}
	await c.env.KV.delete(`library-${libraryId}`)
	const rootData = await c.env.KV.get('root') ?? '{}'
	const root = JSON.parse(rootData) as Root
	if (!root.libraries) root.libraries = []
	root.libraries = root.libraries.filter(l => l !== libraryId)
	await c.env.KV.put('root', JSON.stringify(root))
	return c.text('')
})

const postAlbumSchema = z.object({
	name: z.string(),
	slug: z.string().optional(),
	public: z.boolean().optional(),
	date: z.string().optional(),
})
app.post('/album', getLibrary, zValidator('json', postAlbumSchema), async (c) => {
	const { user, library, authorized } = c.var
	if (!authorized) {
		return c.text(`Unauthorized to access library "${library.id}"`, 401)
	}
	if (library.type !== 'albums') {
		return c.text('This library is not of type "albums"', 400)
	}
	const body = c.req.valid('json')
	if (library.albums.find(a => a.name === body.name)) {
		return c.text(`Album with name "${body.name}" already exists`, 400)
	}
	const slug = body.slug ?? createSlug(body.name)
	if (library.albums.find(a => a.slug === slug)) {
		return c.text(`Album with slug "${slug}" already exists`, 400)
	}
	const albumId = generateId(16)
	const album: Album = {
		id: albumId,
		name: body.name,
		slug: slug,
		public: body.public ?? false,
		date: body.date ?? new Date().toISOString().substring(0, 10),
		created_by: user.username,
		timestamp: new Date().toISOString(),
		photos: [],
	}
	library.albums.push(album)
	library.albums.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
	await c.env.KV.put(`library-${library.id}`, JSON.stringify(library))
	return c.json(safeAlbum(album, user))
})

const patchAlbumSchema = postAlbumSchema.extend({
	cover: z.string().or(z.null()),
	photos: z.array(z.object({
		id: z.string(),
	})),
}).partial()
app.patch('/album/:id', getLibrary, zValidator('json', patchAlbumSchema), async (c) => {
	const albumId = c.req.param('id')
	const { user, library, authorized } = c.var
	if (!authorized) {
		return c.text(`Unauthorized to access library "${library.id}"`, 401)
	}
	if (library.type !== 'albums') {
		return c.text('This library is not of type "albums"', 400)
	}
	const body = c.req.valid('json')
	const album = library.albums.find(a => a.id === albumId)
	if (!album) {
		return c.text(`Album "${albumId}" not found`, 404)
	}
	if (body.name) {
		if (library.albums.find(a => a !== album && a.name === body.name)) {
			return c.text(`Album with name "${body.name}" already exists`, 400)
		}
		album.name = body.name
	}
	if (body.slug) {
		if (library.albums.find(a => a !== album && a.slug === body.slug)) {
			return c.text(`Album with slug "${body.slug}" already exists`, 400)
		}
		album.slug = body.slug
	}
	if (body.photos !== undefined) {
		const deletedPhotos = album.photos.filter(p => !body.photos!.find(q => q.id === p.id))
		album.photos = body.photos.map(p => {
			const photo = album.photos.find(q => q.id === p.id)
			return {
				...photo,
				...p,
				uploaded_by: user.username,
				timestamp: new Date().toISOString(),
			} satisfies Photo
		})
		for (const photo of deletedPhotos) {
			if (album.cover === photo.id) {
				album.cover = undefined
			}
			await c.env.BUCKET.delete([photo.id, `thumb_${photo.id}`, `preview_${photo.id}`])
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
	if (body.date) {
		album.date = body.date
	}
	library.albums.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
	await c.env.KV.put(`library-${library.id}`, JSON.stringify(library))
	return c.json(safeAlbum(album, user))
})

app.delete('/album/:id', getLibrary, async (c) => {
	const albumId = c.req.param('id')
	const { library, authorized } = c.var
	if (!authorized) {
		return c.text(`Unauthorized to access library "${library.id}"`, 401)
	}
	if (library.type !== 'albums') {
		return c.text('This library is not of type "albums"', 400)
	}
	const albumIndex = library.albums.findIndex(a => a.id === albumId)
	if (albumIndex === -1) {
		return c.text(`Album "${albumId}" not found`, 404)
	}
	for (const photo of library.albums[albumIndex].photos) {
		await c.env.BUCKET.delete([photo.id, `thumb_${photo.id}`, `preview_${photo.id}`])
	}
	library.albums.splice(albumIndex, 1)
	await c.env.KV.put(`library-${library.id}`, JSON.stringify(library))
	return c.text('')
})

function getObjectId(id: string, size?: string) {
	if (size === 'original') return id
	if (size === 'thumbnail') return `thumb_${id}`
	if (size === 'preview') return `preview_${id}`
	return undefined
}

app.post('/photo', async (c) => {
	const { user } = c.var
	if (!user) {
		return c.text(`Unauthorized to upload photo`, 401)
	}
	const photoId = generateId(16)
	const formData = await c.req.formData()
	for (const size of ['original', 'thumbnail', 'preview'] as const) {
		const file = formData.get(size)
		if (!(file instanceof File)) {
			return c.text(`Expected "${size}" to be a File`, 400)
		}
		const objectId = getObjectId(photoId, size)!
		await c.env.BUCKET.put(objectId, file as any, {
			httpMetadata: {
				contentType: file.type,
			},
		})
	}
	const photo: Photo = {
		id: photoId,
		uploaded_by: user.username,
		timestamp: new Date().toISOString(),
	}
	return c.json(safePhoto(photo, user))
})

app.get('/photo/:id', async (c) => {
	const photoId = c.req.param('id')
	const size = c.req.query('size')
	let objectId = getObjectId(photoId, size)
	if (objectId === undefined) {
		return c.text('Expected a valid "size" search parameter', 400)
	}
	const photo = await c.env.BUCKET.get(objectId)
	if (photo === null) {
		return c.text('Photo not found', 404)
	}
	const status = photo.body ? 200 : 304
	return c.body(photo.body as any, status, {
		'Cache-Control': 'public, max-age=604800, immutable',
		'Content-Type': photo.httpMetadata?.contentType ?? 'image/jpeg',
		'Content-Length': photo.size.toFixed(),
		'Etag': photo.httpEtag,
	})
})

export const onRequest = handle(app)

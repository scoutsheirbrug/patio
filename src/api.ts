const API_URL = '/api'

export interface ApiUser {
	username: string,
	library_access: string[],
	admin_access: boolean,
}

export interface ApiLibrary {
	id: string,
	timestamp: string,
	authorized: boolean,
	albums: ApiAlbum[],
}

export interface ApiAlbum {
	id: string,
	name: string,
	cover: string | null,
	public: boolean,
	timestamp: string,
	photos: ApiPhoto[],
}

export interface ApiPhoto {
	id: string,
	author: string | null,
	timestamp: string,
}

export class Api {
	constructor(private readonly token?: string) {}

	private get authHeaders(): HeadersInit {
		if (!this.token) return {}
		return { 'Authorization': `Bearer ${this.token}` }
	}

	get hasToken() {
		return this.token !== undefined
	}

	async login(username: string, password: string) {
		const response = await fetch(`${API_URL}/login`, {
			method: 'POST',
			body: JSON.stringify({
				username,
				password,
			}),
			headers: this.authHeaders,
		})
		return await response.json() as { token: string, user: ApiUser }
	}

	async getUser(username: string) {
		const response = await fetch(`${API_URL}/user/${username}`, {
			headers: this.authHeaders,
		})
		return await response.json() as ApiUser
	}

	async getLibrary(libraryId: string) {
		const response = await fetch(`${API_URL}/library?library=${libraryId}`, {
			headers: this.authHeaders,
		})
		return await response.json() as ApiLibrary
	}
	
	async postAlbum(libraryId: string, albumName: string) {
		const response = await fetch(`${API_URL}/album?library=${libraryId}`, {
			method: 'POST',
			headers: {
				...this.authHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				name: albumName,
			})
		})
		return await response.json() as ApiAlbum
	}
	
	async patchAlbum(libraryId: string, albumId: string, changes: Partial<ApiAlbum>) {
		const response = await fetch(`${API_URL}/album/${albumId}?library=${libraryId}`, {
			method: 'PATCH',
			headers: {
				...this.authHeaders,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(changes),
		})
		return await response.json() as ApiAlbum
	}
	
	async deleteAlbum(libraryId: string, albumId: string) {
		await fetch(`${API_URL}/album/${albumId}?library=${libraryId}`, {
			method: 'DELETE',
			headers: this.authHeaders,
		})
	}
	
	async postPhoto(libraryId: string, photos: { original: Blob, thumbnail: Blob, preview: Blob }) {
		const data = new FormData()
		data.append("original", photos.original)
		data.append("thumbnail", photos.thumbnail)
		data.append("preview", photos.preview)
		const response = await fetch(`${API_URL}/photo?library=${libraryId}`, {
			method: 'POST',
			body: data,
			headers: this.authHeaders,
		})
		return await response.json() as ApiPhoto
	}

	getPhotoUrl(photoId: string, size: 'original' | 'thumbnail' | 'preview') {
		return `${API_URL}/photo/${photoId}?size=${size}`
	}
}

const API_URL = '/api'

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

export async function getLibrary(libraryId: string, secret: string) {
	const response = await fetch(`${API_URL}/library?library=${libraryId}&secret=${secret}`)
	return await response.json() as ApiLibrary
}

export async function postAlbum(libraryId: string, secret: string, albumName: string) {
	const response = await fetch(`${API_URL}/album?library=${libraryId}&secret=${secret}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			name: albumName,
		})
	})
	return await response.json() as ApiAlbum
}

export async function patchAlbum(libraryId: string, secret: string, albumId: string, changes: Partial<ApiAlbum>) {
	const response = await fetch(`${API_URL}/album/${albumId}?library=${libraryId}&secret=${secret}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(changes),
	})
	return await response.json() as ApiAlbum
}

export async function deleteAlbum(libraryId: string, secret: string, albumId: string) {
	await fetch(`${API_URL}/album/${albumId}?library=${libraryId}&secret=${secret}`, {
		method: 'DELETE',
	})
}

export async function postPhoto(libraryId: string, secret: string, photo: File, thumbnail: Blob) {
	const data = new FormData()
	data.append("file", photo)
	data.append("thumbnail", thumbnail)
	const response = await fetch(`${API_URL}/photo?library=${libraryId}&secret=${secret}`, {
		method: 'POST',
		body: data,
	})
	return await response.json() as ApiPhoto
}

export function getPhotoUrl(id: string, size: 'original' | 'thumbnail') {
	return `${API_URL}/photo/${id}?size=${size}`
}

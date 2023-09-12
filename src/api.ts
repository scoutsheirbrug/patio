import { createThumbnail } from './utils'

const API_URL = '/api'

export interface ApiLibrary {
	id: string,
	albums: ApiAlbum[],
	timestamp: string,
}

export interface ApiAlbum {
	id: string,
	name: string,
	photos: ApiPhoto[],
	cover: string | null,
	timestamp: string,
}

export interface ApiPhoto {
	id: string,
	author: string | null,
	timestamp: string,
}

export async function getLibrary(libraryId: string) {
	const response = await fetch(`${API_URL}/library/${libraryId}`)
	return await response.json() as ApiLibrary
}

export async function verifySecret(libraryId: string, secret: string) {
	const response = await fetch(`${API_URL}/verify?library=${libraryId}&secret=${secret}`, {
		method: 'POST',
	})
	const data = await response.json() as { authorized: boolean }
	return data.authorized
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

export async function postPhoto(libraryId: string, secret: string, albumId: string, photo: File) {
	const thumbnail = await createThumbnail(photo, { size: 256, quality: 90 })
	const data = new FormData()
	data.append("file", photo)
	data.append("thumbnail", thumbnail)
	const response = await fetch(`${API_URL}/photo?library=${libraryId}&secret=${secret}&album=${albumId}`, {
		method: 'POST',
		body: data,
	})
	return await response.json() as ApiPhoto
}

export async function deletePhoto(libraryId: string, secret: string, albumId: string, photoId: string) {
	await fetch(`${API_URL}/photo/${photoId}?library=${libraryId}&album=${albumId}&secret=${secret}`, {
		method: 'DELETE',
	})
}

export function getPhotoUrl(id: string, large = false) {
	return `${API_URL}/photo/${large ? '' : 'thumb_'}${id}`
}

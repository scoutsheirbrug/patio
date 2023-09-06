const API_URL = 'https://scoutsheirbrug-fotos.mirostuyven.workers.dev'

export interface ApiLibrary {
    id: string
    albums: ApiAlbum[]
    timestamp: string
}

export interface ApiAlbum {
    id: string
    name: string
    photos: ApiPhoto[]
    cover: string | null
    timestamp: string
}

export interface ApiPhoto {
    id: string
    author: string | null
    timestamp: string
}

export async function getLibrary(libraryId: string) {
    const response = await fetch(`${API_URL}/library/${libraryId}`)
    return await response.json() as ApiLibrary
}

export async function postPhoto(libraryId: string, albumId: string, secret: string, payload: BodyInit) {
    const response = await fetch(`${API_URL}/photo?library=${libraryId}&album=${albumId}&secret=${secret}`, {
        method: 'POST',
        body: payload,
    })
    return await response.json() as ApiPhoto
}

export function getObjectUrl(id: string) {
    return `${API_URL}/object/${id}`
}

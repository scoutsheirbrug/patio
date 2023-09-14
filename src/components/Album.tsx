import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ApiAlbum, deletePhoto, getPhotoUrl, patchAlbum, postPhoto } from '../api'
import { useLibrary } from '../hooks/useLibrary'
import { EditableText } from './EditableText'
import { Icons } from './Icons'

type Props = {
	album: ApiAlbum,
}
export function Album({ album }: Props) {
	const { library, secret, authorized, changeAlbum } = useLibrary()

	const fileInput = useRef<HTMLInputElement>(null)

	const onRename = useCallback(async (name: string) => {
		if (name === album.name || name.length === 0) return
		const newAlbum = await patchAlbum(library.id, secret, album.id, { name })
		changeAlbum(album.id, newAlbum)
	}, [library, secret, album, changeAlbum])

	const onChangeVisibility = useCallback(async (isPublic: boolean) => {
		if (isPublic === album.public) return
		const newAlbum = await patchAlbum(library.id, secret, album.id, { public: isPublic })
		changeAlbum(album.id, newAlbum)
	}, [library, secret, album, changeAlbum])

	const onChangeCover = useCallback(async (id: string | null) => {
		const newAlbum = await patchAlbum(library.id, secret, album.id, { cover: id })
		if (!newAlbum.cover) newAlbum.cover = null
		changeAlbum(album.id, newAlbum)
	}, [library, secret, album, changeAlbum])

	const onDeletePhoto = useCallback(async (id: string) => {
		await deletePhoto(library.id, secret, album.id, id)
		changeAlbum(album.id, { photos: album.photos.filter(p => p.id !== id) })
	}, [library, secret, album, changeAlbum])

	const onUploadPhoto = useCallback(async () => {
		if (secret === undefined) return
		if (!fileInput.current) return
		const file = fileInput.current?.files?.[0]
		if (!file) return
		const photo = await postPhoto(library.id, secret, album.id, file)
		changeAlbum(album.id, { photos: [...album.photos, photo] })
	}, [fileInput, library, secret, album, changeAlbum])

	const dragArea = useRef<HTMLDivElement>(null)
	const dragOrigin = useRef<[number, number]>()
	const dragCandidate = useRef<string>()
	const [dragId, setDragId] = useState<string>()
	const [dragTarget, setDragTarget] = useState<number>()

	const dragStart = useCallback((id: string, e: MouseEvent) => {
		setDragId(id)
		dragOrigin.current = [e.clientX, e.clientY]
	}, [])

	const dragMove = useCallback((e: MouseEvent) => {
		if (dragArea.current === null || dragOrigin.current === undefined) return
		const area = dragArea.current.getBoundingClientRect()
		const tiles = 4
		const tileSize = area.width / tiles
		const x = Math.floor((e.clientX - area.x) / tileSize)
		const y = Math.floor((e.clientY - area.y) / tileSize)
		const targetIndex = x + y * tiles
		setDragTarget(Math.max(0, Math.min(album.photos.length - 1, targetIndex)))
	}, [album])

	const dragSortedPhotos = useMemo(() => {
		if (dragId === undefined || dragTarget === undefined) {
			return album.photos
		}
		const originIndex = album.photos.findIndex(p => p.id === dragId)
		if (originIndex === -1 || originIndex === dragTarget) {
			return album.photos
		}
		const copy = album.photos.slice()
		const moved = copy.splice(originIndex, 1)
		copy.splice(dragTarget, 0, moved[0])
		return copy
	}, [album, dragId, dragTarget])

	useEffect(() => {
		const dragEnd = () => {
			if (dragSortedPhotos !== album.photos) {
				patchAlbum(library.id, secret, album.id, { photos: dragSortedPhotos })
					.then(a => changeAlbum(album.id, a))
				changeAlbum(album.id, { photos: dragSortedPhotos }) // optimistic update
			}
			dragCandidate.current = undefined
			dragOrigin.current = undefined
			setDragId(undefined)
			setDragTarget(undefined)
		}
		window.addEventListener('mouseup', dragEnd)
		return () => window.removeEventListener('mouseup', dragEnd)
	}, [library, secret, album, dragSortedPhotos])

	return <div>
		<EditableText class="font-bold text-2xl w-full" value={album.name} onChange={onRename} editable={authorized} />
		<div class="flex gap-4 mt-1">
			<span>{album.photos.length} Foto's</span>
			<button class="flex items-center" onClick={() => onChangeVisibility(!album.public)}>
				{album.public ? Icons.globe : Icons.lock}
				<span class="ml-1">{album.public ? 'Openbaar' : 'Verborgen'}</span>
			</button>
		</div>
		<div ref={dragArea} class="flex flex-wrap gap-1 mt-4" onMouseMove={dragMove}>
			{dragSortedPhotos.map(p => <div key={p.id} class="photo-container relative group" onMouseDown={e => dragStart(p.id, e)}>
				<img class={`absolute w-full h-full select-none object-cover bg-gray-100 transition-transform ${p.id === dragId ? 'scale-90' : ''}`} src={getPhotoUrl(p.id)} />
				{p.id === dragId && <div class="absolute w-full h-full bg-white bg-opacity-50" />}
				{authorized && <>
					<div class="absolute w-8 h-8 p-2 top-[2px] right-[36px] fill-gray-800 cursor-pointer hidden group-hover:block bg-gray-200 hover:bg-gray-300 rounded-lg" onClick={() => onChangeCover(album.cover === p.id ? null : p.id)} onMouseDown={e => e.stopPropagation()}>{album.cover === p.id ? Icons.pin_slash : Icons.pin}</div>
					<div class="absolute w-8 h-8 p-2 top-[2px] right-[2px] fill-red-800 cursor-pointer hidden group-hover:block bg-gray-200 hover:bg-gray-300 rounded-lg" onClick={() => onDeletePhoto(p.id)} onMouseDown={e => e.stopPropagation()}>{Icons.trash}</div>
				</>}
			</div>)}
			{authorized && <div class="photo-container relative">
				<input class="hidden" ref={fileInput} type="file" accept="image/png, image/jpeg" onInput={onUploadPhoto} />
				<div class="absolute w-full h-full cursor-pointer bg-gray-200 hover:bg-gray-300 flex justify-center items-center text-4xl font-bold text-gray-600" onClick={secret === undefined ? undefined : (() => fileInput.current?.click())}>
					{Icons.plus}
				</div>
			</div>}
		</div>
	</div>
}

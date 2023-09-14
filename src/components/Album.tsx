import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ApiAlbum, deleteAlbum, getPhotoUrl, patchAlbum, postPhoto } from '../api'
import { useLibrary } from '../hooks/useLibrary'
import { EditableText } from './EditableText'
import { Icons } from './Icons'

type Props = {
	album: ApiAlbum,
}
export function Album({ album }: Props) {
	const { library, secret, authorized, changeLibrary, changeAlbum } = useLibrary()

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

  const onDeleteAlbum = useCallback(async () => {
    if (album.photos.length > 0) {
      const confirmed = confirm(`Weet je zeker dat je "${album.name}" en alle ${album.photos.length} foto's definitief wilt verwijderen?`)
      if (!confirmed) return
    }
    await deleteAlbum(library.id, secret, album.id)
    changeLibrary({ albums: library.albums?.filter(a => a.id !== album.id) ?? [] })
  }, [library, secret, album, changeLibrary])

	const onChangeCover = useCallback(async (id: string | null) => {
		const newAlbum = await patchAlbum(library.id, secret, album.id, { cover: id })
		if (!newAlbum.cover) newAlbum.cover = null
		changeAlbum(album.id, newAlbum)
	}, [library, secret, album, changeAlbum])

	const onDeletePhotos = useCallback(async (ids: string[]) => {
		const remainingPhotos = album.photos.filter(p => !ids.includes(p.id))
		if (ids.length > 1) {
			const confirmed = confirm(`Weet je zeker dat je ${album.photos.length} foto's definitief wilt verwijderen?`)
      if (!confirmed) return
		}
		await patchAlbum(library.id, secret, album.id, { photos: remainingPhotos })
		changeAlbum(album.id, { photos: remainingPhotos, cover: remainingPhotos.find(p => p.id === album.cover) ? album.cover : null })
	}, [library, secret, album, changeAlbum])

	const onUploadPhoto = useCallback(async () => {
		if (secret === undefined) return
		if (!fileInput.current) return
		const file = fileInput.current?.files?.[0]
		if (!file) return
		const photo = await postPhoto(library.id, secret, album.id, file)
		changeAlbum(album.id, { photos: [...album.photos, photo], cover: !album.cover ? photo.id : album.cover })
	}, [fileInput, library, secret, album, changeAlbum])

	const dragArea = useRef<HTMLDivElement>(null)
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [dragId, setDragId] = useState<string>()
	const [dragTarget, setDragTarget] = useState<number>()

	const dragStart = useCallback((id: string) => {
		setDragId(id)
	}, [selectedIds])

	const dragMove = useCallback((e: MouseEvent) => {
		if (dragId === undefined || dragArea.current === null) {
			return
		}
		const area = dragArea.current.getBoundingClientRect()
		const tiles = 4
		const tileSize = area.width / tiles
		const x = Math.floor((e.clientX - area.x) / tileSize)
		const y = Math.floor((e.clientY - area.y) / tileSize)
		const targetIndex = x + y * tiles
		setDragTarget(Math.max(0, Math.min(album.photos.length - 1, targetIndex)))
		if (!selectedIds.includes(dragId)) {
			setSelectedIds([dragId])
		}
	}, [album, selectedIds, dragId])

	const dragSortedPhotos = useMemo(() => {
		if (dragId === undefined || dragTarget === undefined) {
			return album.photos
		}
		const dragSource = album.photos.findIndex(p => p.id === dragId)
		const movingIds = [...selectedIds, dragId]
		const beforePhotos = album.photos.filter((p, i) => !movingIds.includes(p.id) && i < dragTarget + (dragTarget > dragSource ? 1 : 0))
		const selectedPhotos = album.photos.filter(p => movingIds.includes(p.id))
		const afterPhotos = album.photos.filter((p, i) => !movingIds.includes(p.id) && i > dragTarget - (dragTarget < dragSource ? 1 : 0))
		return [...beforePhotos, ...selectedPhotos, ...afterPhotos]
	}, [album, selectedIds, dragId, dragTarget])

	useEffect(() => {
		const onMouseUp = (e: MouseEvent) => {
			if (dragSortedPhotos !== album.photos) {
				patchAlbum(library.id, secret, album.id, { photos: dragSortedPhotos })
					.then(a => changeAlbum(album.id, a))
				changeAlbum(album.id, { photos: dragSortedPhotos }) // optimistic update
			} else if (dragId === undefined) {
				setSelectedIds([])
			} else {
				if (e.ctrlKey) {
					setSelectedIds(selectedIds.includes(dragId) ? selectedIds.filter(id => id !== dragId) : [...selectedIds, dragId])
				} else if (e.shiftKey) {
					const firstIndex = album.photos.findIndex(p => p.id === selectedIds[0])
					const lastIndex = album.photos.findIndex(p => p.id === dragId)
					const toSelect = album.photos.slice(Math.min(firstIndex, lastIndex), Math.max(firstIndex, lastIndex) + 1).map(p => p.id).filter(id => !selectedIds.includes(id))
					setSelectedIds([...selectedIds, ...toSelect])
				} else {
					setSelectedIds([dragId])
				}
			}
			setDragId(undefined)
			setDragTarget(undefined)
		}
		if (authorized) {
			window.addEventListener('mouseup', onMouseUp)
			return () => {
				window.removeEventListener('mouseup', onMouseUp)
			}
		}
	}, [library, secret, authorized, album, selectedIds, dragId, dragSortedPhotos])

	useEffect(() => {
		const deletedIds = selectedIds.filter(id => !album.photos.find(p => p.id === id))
		if (deletedIds.length > 0) {
			setSelectedIds(selectedIds.filter(id => !deletedIds.includes(id)))
		}
	}, [album, selectedIds])

	return <div>
		<div class="flex gap-4">
			<EditableText class="font-bold text-2xl w-full" value={album.name} onChange={onRename} editable={authorized} />
			{authorized && <>
				<button class="flex items-center hover:underline ml-auto" onClick={() => onChangeVisibility(!album.public)}>
					{album.public ? Icons.globe : Icons.lock}
					<span class="ml-1">{album.public ? 'Openbaar' : 'Verborgen'}</span>
				</button>
				<button class="flex items-center whitespace-nowrap hover:underline text-red-800 fill-red-800" onClick={onDeleteAlbum}>
					{Icons.trash}
					<span class="ml-1">Verwijder album</span>
				</button>
			</>}
		</div>
		<div class="flex gap-4 mt-1 flex-wrap" onMouseUp={e => e.stopPropagation()}>
			<span>{album.photos.length} Foto's</span>
			<button class="flex items-center hover:underline" onClick={() => setSelectedIds(selectedIds.length === 0 ? album.photos.map(p => p.id) : [])}>
				{selectedIds.length === 0 ? Icons.issue_closed : Icons.x_circle}
				<span class="ml-1">{selectedIds.length === 0 ? 'Selecteer alles' : 'Deselecteer alles'}</span>
			</button>
			{selectedIds.length === 1 && <button class="flex items-center hover:underline" onClick={() => onChangeCover(album.cover === selectedIds[0] ? null : selectedIds[0])}>
				{album.cover === selectedIds[0] ? Icons.pin_slash : Icons.pin}
				<span class="ml-1">{album.cover === selectedIds[0] ? 'Verwijder albumcover' : 'Maak albumcover'}</span>
			</button>}
			{selectedIds.length > 0 && <button class="flex items-center hover:underline text-red-800 fill-red-800" onClick={() => onDeletePhotos(selectedIds)}>
				{Icons.trash}
				<span class="ml-1">Verwijder {selectedIds.length === 1 ? 'foto' : `${selectedIds.length} foto\'s`}</span>
			</button>}
		</div>
		<div ref={dragArea} class="flex flex-wrap gap-1 mt-4" onMouseMove={authorized ? dragMove : undefined}>
			{dragSortedPhotos.map(p => <div key={p.id} class="photo-container relative group" onMouseDown={authorized ? (() => dragStart(p.id)) : undefined}>
				<img class={`absolute w-full h-full select-none object-cover pointer-events-none bg-gray-100 transition-transform ${p.id === dragId || selectedIds.includes(p.id) ? 'scale-90' : ''}`} src={getPhotoUrl(p.id)} />
				<div class={`absolute w-full h-full pointer-events-none ${selectedIds.includes(p.id) ? 'bg-blue-500 bg-opacity-40' : ''}`} />
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

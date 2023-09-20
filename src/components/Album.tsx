import { Link, route } from 'preact-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ApiAlbum, ApiLibrary, ApiPhoto } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useLibrary } from '../hooks/useLibrary'
import { processPhoto } from '../utils'
import { Action } from './Action'
import { Actionbar } from './Actionbar'
import { DetailActions } from './DetailActions'
import { EditableText } from './EditableText'
import { Icons } from './Icons'
import { ProgressiveImage } from './ProgressiveImage'

type Props = {
	library: ApiLibrary,
	album: ApiAlbum,
	photo?: ApiPhoto,
}
export function Album({ library, album, photo }: Props) {
	const { api, isAuthorized } = useAuth()
	const { changeLibrary, changeAlbum } = useLibrary()
  const authorized = isAuthorized(library.id)

	const fileInput = useRef<HTMLInputElement>(null)
	const [uploadProgress, setUploadProgress] = useState<{ loading: boolean, preview?: string }[]>([])

	const onRename = useCallback(async (name: string) => {
		if (name === album.name || name.length === 0) return
		const newAlbum = await api.patchAlbum(library.id, album.id, { name })
		changeAlbum(album.id, newAlbum)
	}, [api, library, album, changeAlbum])

	const onChangeDate = useCallback(async (str: string) => {
		const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
		if (!match) return
		const date = `${match[3]}-${match[2]}-${match[1]}`
		const newAlbum = await api.patchAlbum(library.id, album.id, { date })
		changeAlbum(album.id, newAlbum)
	}, [api, library, album, changeAlbum])

	const onChangeVisibility = useCallback(async (isPublic: boolean) => {
		if (isPublic === album.public) return
		const newAlbum = await api.patchAlbum(library.id, album.id, { public: isPublic })
		changeAlbum(album.id, newAlbum)
	}, [api, library, album, changeAlbum])

  const onDeleteAlbum = useCallback(async () => {
    if (album.photos.length > 0) {
      const confirmed = confirm(`Weet je zeker dat je "${album.name}" en alle ${album.photos.length} foto's definitief wilt verwijderen?`)
      if (!confirmed) return
    }
    await api.deleteAlbum(library.id, album.id)
    changeLibrary({ albums: library.albums?.filter(a => a.id !== album.id) ?? [] })
		route(`/${library.id}`)
  }, [api, library, album, changeLibrary])

	const onChangeCover = useCallback(async (id: string | null) => {
		const newAlbum = await api.patchAlbum(library.id, album.id, { cover: id })
		if (!newAlbum.cover) newAlbum.cover = null
		changeAlbum(album.id, newAlbum)
	}, [api, library, album, changeAlbum])

	const onDeletePhotos = useCallback(async (ids: string[]) => {
		const remainingPhotos = album.photos.filter(p => !ids.includes(p.id))
		if (ids.length > 1) {
			const confirmed = confirm(`Weet je zeker dat je ${ids.length} foto's definitief wilt verwijderen?`)
      if (!confirmed) return
		}
		await api.patchAlbum(library.id, album.id, { photos: remainingPhotos })
		changeAlbum(album.id, { photos: remainingPhotos, cover: remainingPhotos.find(p => p.id === album.cover) ? album.cover : null })
	}, [api, library, album, changeAlbum])

	const onUploadPhoto = useCallback(async () => {
		if (!fileInput.current) return
		const files: File[] = []
		for (const file of fileInput.current?.files ?? []) {
			files.push(file)
		}
		if (files.length === 0) return
		setUploadProgress(files.map(() => ({ loading: true })))
		try {
			const photos: ApiPhoto[] = []
			for (let i = 0; i < files.length; i += 1) {
				const file = files[i]
				try {
					const { processed, thumbnail, preview } = await processPhoto(file)
					setUploadProgress(progress => progress.map((p, j) => i === j ? ({ loading: true, preview: URL.createObjectURL(thumbnail)}) : p))
					const photo = await api.postPhoto(library.id, { original: processed, thumbnail, preview })
					setUploadProgress(progress => progress.map((p, j) => i === j ? ({ loading: false, preview: p.preview }) : p))
					photos.push(photo)
				} catch (e) {
					console.error(`Failed to process photo ${file.name}:`, e)
				}
			}
			if (photos.length > 0) {
				await api.patchAlbum(library.id, album.id, { photos: [...album.photos, ...photos] })
				changeAlbum(album.id, { photos: [...album.photos, ...photos], cover: !album.cover ? photos[0].id : album.cover })
			}
		} finally {
			setUploadProgress([])
			fileInput.current.value = ''
		}
	}, [api, library, album, changeAlbum, fileInput])

	const onViewPhoto = useCallback((id: string | undefined, e?: MouseEvent) => {
		if (id === undefined) {
			route(`/${library.id}/${album.slug ?? album.id}`)
		} else {
			route(`/${library.id}/${album.slug ?? album.id}/${id}`)
		}
		e?.stopPropagation()
	}, [library, album])

	const dragArea = useRef<HTMLDivElement>(null)
	const lastId = useRef<string>()
	const [selectedIds, setSelectedIds] = useState<string[]>([])
	const [dragId, setDragId] = useState<string>()
	const [dragTarget, setDragTarget] = useState<number>()

	const dragStart = useCallback((id: string) => {
		setDragId(id)
	}, [selectedIds])

	const dragMove = useCallback((e: MouseEvent | TouchEvent) => {
		if (dragId === undefined || dragArea.current === null) {
			return
		}
		const area = dragArea.current.getBoundingClientRect()
		const tiles = Number(document.body.style.getPropertyValue('--photo-grid'))
		const tileSize = area.width / tiles
		const point = e instanceof MouseEvent ? e : e.touches[0]
		const x = Math.floor((point.clientX - area.x) / tileSize)
		const y = Math.floor((point.clientY - area.y) / tileSize)
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
		const onMouseUp = (e: MouseEvent | TouchEvent) => {
			if (dragSortedPhotos !== album.photos) {
				api.patchAlbum(library.id, album.id, { photos: dragSortedPhotos })
					.then(a => changeAlbum(album.id, a))
				changeAlbum(album.id, { photos: dragSortedPhotos }) // optimistic update
			} else if (dragId === undefined) {
				setSelectedIds([])
			} else {
				if (e.ctrlKey) {
					setSelectedIds(selectedIds.includes(dragId) ? selectedIds.filter(id => id !== dragId) : [...selectedIds, dragId])
				} else if (e.shiftKey && lastId.current) {
					const firstIndex = album.photos.findIndex(p => p.id === lastId.current)
					const lastIndex = album.photos.findIndex(p => p.id === dragId)
					const toSelect = album.photos.slice(Math.min(firstIndex, lastIndex), Math.max(firstIndex, lastIndex) + 1).map(p => p.id).filter(id => !selectedIds.includes(id))
					setSelectedIds([...selectedIds, ...toSelect])
				} else {
					setSelectedIds([dragId])
				}
			}
			lastId.current = dragId
			setDragId(undefined)
			setDragTarget(undefined)
		}
		if (authorized) {
			window.addEventListener('mouseup', onMouseUp)
			window.addEventListener('touchend', onMouseUp)
			return () => {
				window.removeEventListener('mouseup', onMouseUp)
				window.removeEventListener('touchend', onMouseUp)
			}
		}
	}, [api, library, authorized, album, selectedIds, dragId, dragSortedPhotos])

	useEffect(() => {
		const deletedIds = selectedIds.filter(id => !album.photos.find(p => p.id === id))
		if (deletedIds.length > 0) {
			setSelectedIds(selectedIds.filter(id => !deletedIds.includes(id)))
			if (selectedIds.length === deletedIds.length) {
				lastId.current = undefined
			}
		}
	}, [album, selectedIds])

	useEffect(() => {
		const onResize = () => {
			if (document.body.clientWidth >= 1024) {
				document.body.style.setProperty('--photo-grid', '6')
			} else if (document.body.clientWidth >= 768) {
				document.body.style.setProperty('--photo-grid', '5')
			} else {
				document.body.style.setProperty('--photo-grid', '4')
			}
		}
		onResize()
		window.addEventListener('resize', onResize)
		return () => window.removeEventListener('resize', onResize)
	}, [])

	return <>
		<div class="flex gap-y-1 flex-col md:flex-row">
			<EditableText class="font-bold text-2xl w-full" value={album.name} onChange={onRename} editable={authorized} />
			{authorized && <div class="flex gap-4 gap-y-1 flex-wrap md:flex-nowrap">
				<div class="ml-auto hidden md:block"></div>
				<Action icon="calendar" clickable>
					<EditableText class="max-w-[100px]" value={new Date(album.date ?? new Date()).toLocaleDateString('nl-BE')} onChange={onChangeDate} editable nopencil />
				</Action>
				<Action icon={album.public ? 'globe' : 'lock'} onClick={() => onChangeVisibility(!album.public)}>
					{album.public ? 'Openbaar' : 'Verborgen'}
				</Action>
				<Action icon="trash" onClick={onDeleteAlbum} danger>Verwijder album</Action>
			</div>}
		</div>
		<div class={`py-2 ${!photo && authorized ? 'sticky bg-white z-10 top-0' : ''}`} onMouseUp={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
			<Actionbar>
				<span>{album.photos.length} Foto's</span>
				{authorized && <>
					<Action icon={selectedIds.length === 0 ? 'issue_closed' : 'x_circle'} onClick={() => setSelectedIds(selectedIds.length === 0 ? album.photos.map(p => p.id) : [])}>
						{selectedIds.length === 0 ? 'Selecteer alles' : 'Deselecteer alles'}
					</Action>
					{selectedIds.length === 1 && <Action icon={album.cover === selectedIds[0] ? 'pin_slash' : 'pin'} onClick={() => onChangeCover(album.cover === selectedIds[0] ? null : selectedIds[0])}>
						{album.cover === selectedIds[0] ? 'Verwijder albumcover' : 'Maak albumcover'}
					</Action>}
					{selectedIds.length > 0 && <Action icon="trash" onClick={() => onDeletePhotos(selectedIds)} danger>
						Verwijder {selectedIds.length === 1 ? 'foto' : `${selectedIds.length} foto\'s`}
					</Action>}
				</>}
			</Actionbar>
		</div>
		<div ref={dragArea} class="flex flex-wrap gap-1 mt-2" onMouseMove={authorized ? dragMove : undefined} onTouchMove={authorized ? dragMove : undefined}>
			{dragSortedPhotos.map(p => <Link key={p.id} class="photo-container relative" href={authorized ? undefined : `/${library.id}/${album.slug ?? album.id}/${p.id}`} onMouseDown={authorized ? (() => dragStart(p.id)) : undefined} onTouchStart={authorized ? (() => dragStart(p.id)) : undefined}>
				<img class={`absolute w-full h-full select-none object-cover pointer-events-none bg-gray-100 transition-transform ${p.id === dragId || selectedIds.includes(p.id) ? 'scale-90' : ''}`} src={api.getPhotoUrl(p.id, 'thumbnail')} alt="" />
				<div class={`absolute w-full h-full pointer-events-none ${selectedIds.includes(p.id) ? 'bg-blue-500 bg-opacity-40' : ''}`} />
				{authorized && <Link class="absolute w-8 h-8 top-[2px] right-[2px] flex justify-center items-center fill-white bg-black bg-opacity-30 rounded-md cursor-pointer hover:bg-opacity-50 transition-opacity" href={`/${library.id}/${album.slug ?? album.id}/${p.id}`} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} >{Icons.screen_full}</Link>}
			</Link>)}
			{uploadProgress.map(progress => <div class="photo-container relative">
				{progress.preview === undefined
					? <div class="absolute w-full h-full bg-gradient-to-br bg-gray-200" />
					: <img class="absolute w-full h-full select-none object-cover pointer-events-none bg-gray-200" src={progress.preview} />}
				{progress.loading && <div class="absolute w-full h-full flex justify-center items-center">
					<div class="w-12 h-12 border-gray-600 border-4 border-b-transparent rounded-full animate-spin" ></div>
				</div>}
			</div>)}
			{authorized && <div class="photo-container relative">
				<input class="hidden" ref={fileInput} type="file" accept="image/png, image/jpeg" multiple onInput={onUploadPhoto} disabled={uploadProgress.length > 0} />
				<div class={`absolute w-full h-full bg-gray-200 ${uploadProgress.length > 0 ? '' : 'hover:bg-gray-300 cursor-pointer'} flex justify-center items-center text-4xl font-bold text-gray-600`} onClick={authorized && (() => fileInput.current?.click())}>
					{Icons.plus}
				</div>
			</div>}
		</div>
		{photo && <div class="fixed top-0 left-0 w-full h-full p-2 flex items-center justify-center bg-black bg-opacity-80" onClick={() => route(`/${library.id}/${album.id}`)}>
			<ProgressiveImage class="w-auto max-h-full" width={1024} initial={api.getPhotoUrl(photo.id, 'preview')} detailed={api.getPhotoUrl(photo.id, 'original')} onClick={e => e.stopPropagation()} />
			<DetailActions album={album.photos.map(p => p.id)} id={photo.id} changeId={onViewPhoto} downloadUrl={api.getPhotoUrl(photo.id, 'original')} />
		</div>}
	</>
}

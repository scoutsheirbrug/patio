import { ComponentChildren } from 'preact'
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ApiPhoto } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useSearchParam } from '../hooks/useSearchParams'
import { processPhoto } from '../utils'
import { Action } from './Action'
import { Actionbar } from './Actionbar'
import { DetailActions } from './DetailActions'
import { Icons } from './Icons'
import { ProgressiveImage } from './ProgressiveImage'

type Props = {
	authorized: boolean
	photos: ApiPhoto[],
	changePhotos: (changes: ApiPhoto[]) => Promise<void>,
	selectedActions?: (selectedIds: string[]) => ComponentChildren,
}
export function PhotoCollection({ authorized, photos, changePhotos, selectedActions }: Props) {
	const { api } = useAuth()

	const [photoId, changePhoto] = useSearchParam('foto')
	useEffect(() => {
		document.documentElement.classList.toggle('overflow-hidden', photoId !== undefined)
	}, [photoId])

	const fileInput = useRef<HTMLInputElement>(null)
	const [uploadProgress, setUploadProgress] = useState<{ loading: boolean, preview?: string }[]>([])

	const onDeletePhotos = useCallback(async (ids: string[]) => {
		const remainingPhotos = photos.filter(p => !ids.includes(p.id))
		if (ids.length > 1) {
			const confirmed = confirm(`Weet je zeker dat je ${ids.length} foto's definitief wilt verwijderen?`)
			if (!confirmed) return
		}
		console.log('DELETE', ids, remainingPhotos)
		await changePhotos(remainingPhotos)
	}, [photos, changePhotos])

	const onUploadPhoto = useCallback(async () => {
		if (!fileInput.current) return
		const files: File[] = []
		for (const file of fileInput.current?.files ?? []) {
			files.push(file)
		}
		if (files.length === 0) return
		setUploadProgress(files.map(() => ({ loading: true })))
		try {
			const newPhotos: ApiPhoto[] = []
			for (let i = 0; i < files.length; i += 1) {
				const file = files[i]
				try {
					const { processed, thumbnail, preview } = await processPhoto(file)
					setUploadProgress(progress => progress.map((p, j) => i === j ? ({ loading: true, preview: URL.createObjectURL(thumbnail)}) : p))
					const photo = await api.postPhoto({ original: processed, thumbnail, preview })
					setUploadProgress(progress => progress.map((p, j) => i === j ? ({ loading: false, preview: p.preview }) : p))
					newPhotos.push(photo)
				} catch (e) {
					console.error(`Failed to process photo ${file.name}:`, e)
				}
			}
			if (newPhotos.length > 0) {
				await changePhotos([...photos, ...newPhotos])
			}
		} finally {
			setUploadProgress([])
			fileInput.current.value = ''
		}
	}, [api, photos, changePhotos, fileInput])

	const onViewPhoto = useCallback((id: string | undefined, e?: MouseEvent) => {
		changePhoto(id)
		e?.stopPropagation()
	}, [changePhoto])

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
		setDragTarget(Math.max(0, Math.min(photos.length - 1, targetIndex)))
		if (!selectedIds.includes(dragId)) {
			setSelectedIds([dragId])
		}
	}, [photos, selectedIds, dragId])

	const dragSortedPhotos = useMemo(() => {
		if (dragId === undefined || dragTarget === undefined) {
			return photos
		}
		const dragSource = photos.findIndex(p => p.id === dragId)
		const movingIds = [...selectedIds, dragId]
		const beforePhotos = photos.filter((p, i) => !movingIds.includes(p.id) && i < dragTarget + (dragTarget > dragSource ? 1 : 0))
		const selectedPhotos = photos.filter(p => movingIds.includes(p.id))
		const afterPhotos = photos.filter((p, i) => !movingIds.includes(p.id) && i > dragTarget - (dragTarget < dragSource ? 1 : 0))
		return [...beforePhotos, ...selectedPhotos, ...afterPhotos]
	}, [photos, selectedIds, dragId, dragTarget])

	useEffect(() => {
		const onMouseUp = (e: MouseEvent | TouchEvent) => {
			if (dragSortedPhotos !== photos) {
				changePhotos(dragSortedPhotos)
			} else if (dragId === undefined) {
				setSelectedIds([])
			} else {
				if (e.ctrlKey) {
					setSelectedIds(selectedIds.includes(dragId) ? selectedIds.filter(id => id !== dragId) : [...selectedIds, dragId])
				} else if (e.shiftKey && lastId.current) {
					const firstIndex = photos.findIndex(p => p.id === lastId.current)
					const lastIndex = photos.findIndex(p => p.id === dragId)
					const toSelect = photos.slice(Math.min(firstIndex, lastIndex), Math.max(firstIndex, lastIndex) + 1).map(p => p.id).filter(id => !selectedIds.includes(id))
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
	}, [api, authorized, photos, selectedIds, dragId, dragSortedPhotos])

	useEffect(() => {
		const deletedIds = selectedIds.filter(id => !photos.find(p => p.id === id))
		if (deletedIds.length > 0) {
			setSelectedIds(selectedIds.filter(id => !deletedIds.includes(id)))
			if (selectedIds.length === deletedIds.length) {
				lastId.current = undefined
			}
		}
	}, [photos, selectedIds])

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
		<div class={`py-2 ${!photoId && authorized ? 'sticky bg-white z-10 top-0' : ''}`} onMouseUp={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()}>
			<Actionbar>
				<span>{photos.length} Foto's</span>
				{authorized && <>
					<Action icon={selectedIds.length === 0 ? 'issue_closed' : 'x_circle'} onClick={() => setSelectedIds(selectedIds.length === 0 ? photos.map(p => p.id) : [])}>
						{selectedIds.length === 0 ? 'Selecteer alles' : 'Deselecteer alles'}
					</Action>
					{selectedActions?.(selectedIds)}
					{selectedIds.length > 0 && <Action icon="trash" onClick={() => onDeletePhotos(selectedIds)} danger>
						Verwijder {selectedIds.length === 1 ? 'foto' : `${selectedIds.length} foto\'s`}
					</Action>}
				</>}
			</Actionbar>
		</div>
		<div ref={dragArea} class="flex flex-wrap gap-1 mt-2" onMouseMove={authorized ? dragMove : undefined} onTouchMove={authorized ? dragMove : undefined}>
			{dragSortedPhotos.map(p => <div key={p.id} class="photo-container relative" onClick={authorized ? undefined : () => changePhoto(p.id)} onMouseDown={authorized ? (() => dragStart(p.id)) : undefined} onTouchStart={authorized ? (() => dragStart(p.id)) : undefined}>
				<img class={`absolute w-full h-full select-none object-cover pointer-events-none bg-gray-100 transition-transform ${p.id === dragId || selectedIds.includes(p.id) ? 'scale-90' : ''}`} src={api.getPhotoUrl(p.id, 'thumbnail')} alt="" />
				<div class={`absolute w-full h-full pointer-events-none ${selectedIds.includes(p.id) ? 'bg-blue-500 bg-opacity-40' : ''}`} />
				{authorized && <div class="absolute w-8 h-8 top-[2px] right-[2px] flex justify-center items-center fill-white bg-black bg-opacity-30 rounded-md cursor-pointer hover:bg-opacity-50 transition-opacity" onClick={() => changePhoto(p.id)} onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} >{Icons.screen_full}</div>}
			</div>)}
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
		{photoId && <div class="fixed top-0 left-0 w-full h-full p-2 flex items-center justify-center bg-black bg-opacity-80" onClick={() => changePhoto(undefined)}>
			<ProgressiveImage class="w-auto max-h-full" width={1024} initial={api.getPhotoUrl(photoId, 'preview')} detailed={api.getPhotoUrl(photoId, 'original')} onClick={e => e.stopPropagation()} />
			<DetailActions ids={photos.map(p => p.id)} id={photoId} changeId={onViewPhoto} downloadUrl={api.getPhotoUrl(photoId, 'original')} />
		</div>}
	</>
}

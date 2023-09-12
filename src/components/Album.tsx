import { useCallback, useRef } from 'preact/hooks'
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
	}, [album, changeAlbum])

	const onChangeCover = useCallback(async (id: string | null) => {
		const newAlbum = await patchAlbum(library.id, secret, album.id, { cover: id })
		if (!newAlbum.cover) newAlbum.cover = null
		changeAlbum(album.id, newAlbum)
	}, [album, changeAlbum])

	const onDeletePhoto = useCallback(async (id: string) => {
		await deletePhoto(library.id, secret, album.id, id)
		changeAlbum(album.id, { photos: album.photos.filter(p => p.id !== id) })
	}, [album, changeAlbum])

	const onUploadPhoto = useCallback(async () => {
		if (secret === undefined) return
		if (!fileInput.current) return
		const file = fileInput.current?.files?.[0]
		if (!file) return
		const photo = await postPhoto(library.id, secret, album.id, file)
		changeAlbum(album.id, { photos: [...album.photos, photo] })
	}, [fileInput, album, changeAlbum])

	return <div>
		<EditableText class="font-bold text-2xl" value={album.name} onChange={onRename} editable={authorized} />
		<span>{album.photos.length} Foto's</span>
		<div class="flex flex-wrap gap-1 mt-4">
			{album.photos.map(p => <div key={p.id} class="photo-container relative group">
				<img class="absolute w-full h-full object-cover bg-gray-100" src={getPhotoUrl(p.id)} />
				{authorized && <>
					<div class="absolute w-8 h-8 p-2 top-[2px] right-[36px] fill-gray-800 cursor-pointer hidden group-hover:block bg-gray-200 hover:bg-gray-300 rounded-lg" onClick={() => onChangeCover(album.cover === p.id ? null : p.id)}>{album.cover === p.id ? Icons.pin_slash : Icons.pin}</div>
					<div class="absolute w-8 h-8 p-2 top-[2px] right-[2px] fill-red-800 cursor-pointer hidden group-hover:block bg-gray-200 hover:bg-gray-300 rounded-lg" onClick={() => onDeletePhoto(p.id)}>{Icons.trash}</div>
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

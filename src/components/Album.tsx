import { route } from 'preact-router'
import { useCallback } from 'preact/hooks'
import { ApiAlbum, ApiLibrary, ApiPhoto } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useLibrary } from '../hooks/useLibrary'
import { Action } from './Action'
import { EditableText } from './EditableText'
import { PhotoCollection } from './PhotoCollection'

type Props = {
	library: ApiLibrary & { type: 'albums' },
	album: ApiAlbum,
}
export function Album({ library, album }: Props) {
	const { api, isAuthorized } = useAuth()
	const { changeLibrary, changeAlbum } = useLibrary()
  const authorized = isAuthorized(library.id)

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

	const changePhotos = useCallback(async (photos: ApiPhoto[]) => {
		api.patchAlbum(library.id, album.id, { photos })
		changeAlbum(album.id, { photos, cover: !album.cover ? photos[0].id : album.cover })
	}, [api, album, changeAlbum])

	const selectedActions = useCallback((selectedIds: string[]) => {
		if (selectedIds.length === 1) {
			return <Action icon={album.cover === selectedIds[0] ? 'pin_slash' : 'pin'} onClick={() => onChangeCover(album.cover === selectedIds[0] ? null : selectedIds[0])}>
				{album.cover === selectedIds[0] ? 'Verwijder albumcover' : 'Maak albumcover'}
			</Action>
		}
		return <></>
	}, [onChangeCover])

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
		<PhotoCollection authorized={authorized} photos={album.photos} changePhotos={changePhotos} selectedActions={selectedActions} />
	</>
}

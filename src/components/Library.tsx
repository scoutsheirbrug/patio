import { useCallback, useRef, useState } from 'preact/hooks'
import { deleteAlbum, getPhotoUrl, patchAlbum, postAlbum } from '../api'
import { useLibrary } from '../hooks/useLibrary'
import { EditableText } from './EditableText'
import { Icons } from './Icons'

type Props = {
  onSelect: (id: string) => void,
}
export function Library({ onSelect }: Props) {
  const { library, secret, authorized, changeLibrary, changeAlbum } = useLibrary()

	const onRenameAlbum = useCallback(async (id: string, name: string) => {
    const album = library.albums?.find(a => a.id === id)
    if (!album || name === album.name || name.length === 0) return
		const newAlbum = await patchAlbum(library.id, secret, album.id, { name })
		changeAlbum(album.id, newAlbum)
	}, [library, changeAlbum])

  const onDeleteAlbum = useCallback(async (id: string) => {
    const album = library.albums?.find(a => a.id === id)
    if (album === undefined) return
    if (album.photos.length > 0) {
      const confirmed = confirm(`Weet je zeker dat je "${album.name}" en alle ${album.photos.length} foto's definitief wilt verwijderen?`)
      if (!confirmed) return
    }
    await deleteAlbum(library.id, secret, id)
    changeLibrary({ albums: library.albums?.filter(a => a.id !== id) ?? [] })
  }, [library])

  const addRef = useRef<HTMLInputElement>(null)
  const [newName, setNewName] = useState<string>()

  const startEditing = useCallback(() => {
    setNewName('')
		setTimeout(() => {
			addRef.current?.select()
		})
  }, [])

  const onAdd = useCallback(async (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (secret !== undefined && newName && newName.length > 0) {
        const album = await postAlbum(library.id, secret, newName)
        changeLibrary({ albums: [...library.albums ?? [], album] })
      }
      setNewName(undefined)
    }
  }, [library, newName])

  return <div class="flex flex-wrap gap-2">
    {library.albums?.map(a => <div key={a.id} class="w-64">
      <div class="relative group h-64 cursor-pointer" onClick={() => onSelect(a.id)}>
        {a.cover
          ? <img class="absolute w-full h-full rounded-lg object-cover" src={getPhotoUrl(a.cover)} />
          : <div class="absolute w-full h-full bg-gradient-to-br from-gray-200 to-slate-300 rounded-lg" />}
        {authorized && <>
          <div class="absolute w-8 h-8 p-2 top-[2px] right-[2px] fill-red-800 cursor-pointer hidden group-hover:block bg-gray-200 hover:bg-gray-300 rounded-lg" onClick={(e) => { onDeleteAlbum(a.id); e.stopPropagation() }}>{Icons.trash}</div>
        </>}
      </div>
      <EditableText class="font-bold text-2xl mt-1 w-full" value={a.name} onChange={name => onRenameAlbum(a.id, name)} editable={authorized} />
      <span>{a.photos.length} Foto's</span>
    </div>)}
    {authorized && <div class="cursor-pointer" onClick={newName !== undefined ? undefined : startEditing}>
      <div class="w-64 h-64 bg-gray-100 rounded-lg flex justify-center items-center text-4xl font-bold text-gray-600">{Icons.plus}</div>
      {newName !== undefined && <input ref={addRef} class="w-64 font-bold text-2xl mt-1 outline-none border-b border-gray-300 bg-gray-50 min-w-0" value={newName} onInput={e => setNewName((e.target as HTMLInputElement).value)} onKeyDown={onAdd} onBlur={() => setNewName(undefined)} />}
    </div>}
  </div>
}

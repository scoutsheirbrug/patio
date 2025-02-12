import { Link } from 'preact-router'
import { useCallback, useRef, useState } from 'preact/hooks'
import { ApiLibrary } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useLibrary } from '../hooks/useLibrary'
import { Icons } from './Icons'

type Props = {
  library: ApiLibrary & { type: 'albums' },
}
export function LibraryAlbums({ library }: Props) {
  const { api, isAuthorized } = useAuth()
  const { changeLibrary } = useLibrary()
  const authorized = isAuthorized(library.id)

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
      if (newName && newName.length > 0) {
        const album = await api.postAlbum(library.id, newName)
        changeLibrary({ albums: [...library.albums ?? [], album] })
      }
      setNewName(undefined)
    }
  }, [api, library, newName])

  return <div class="flex flex-wrap gap-2">
    {library.albums?.map(a => <div key={a.id} class="w-64">
      <Link class="block relative group h-64 cursor-pointer" href={`/${library.id}/${a.slug ?? a.id}`}>
        {a.cover
          ? <img class="absolute w-full h-full rounded-lg object-cover" src={api.getPhotoUrl(a.cover, 'thumbnail')} />
          : <div class="absolute w-full h-full bg-gradient-to-br from-gray-200 to-slate-300 rounded-lg" />}
      </Link>
      <div class="flex items-center [&>svg]:shrink-0 [&>svg]:mr-1 mt-1">
        {!a.public && Icons.lock}
        <span class="font-bold text-2xl w-full">{a.name}</span>
      </div>
      <span>{a.photos.length} Foto's</span>
    </div>)}
    {authorized && <div class="cursor-pointer" onClick={newName !== undefined ? undefined : startEditing}>
      <div class="w-64 h-64 bg-gray-100 rounded-lg flex justify-center items-center text-4xl font-bold text-gray-600">{Icons.plus}</div>
      {newName !== undefined && <input ref={addRef} class="w-64 font-bold text-2xl mt-1 outline-none border-b border-gray-300 bg-gray-50 min-w-0" value={newName} onInput={e => setNewName((e.target as HTMLInputElement).value)} onKeyDown={onAdd} onBlur={() => setNewName(undefined)} />}
    </div>}
  </div>
}

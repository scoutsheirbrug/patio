import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'
import { ApiLibrary, getLibrary } from './api'
import { Library } from './components/Library'
import { Album } from './components/Album'

const LIBRARY_ID = 'scoutsheirbrug'

export function App() {
  const [library, setLibrary] = useState<ApiLibrary>()
  useEffect(() => {
    getLibrary(LIBRARY_ID).then(library => {
      setLibrary(library)
    })
  }, [])
  const [secret, setSecret] = useState(localStorage.getItem('secret') ?? undefined)

  const storeSecret = useCallback((secret: string) => {
    console.log('Storing secret...', secret)
    setSecret(secret)
    localStorage.setItem('secret', secret)
  }, [])

  const [albumId, setAlbumId] = useState<string>()
  const album = useMemo(() => {
    return library?.albums.find(a => a.id === albumId)
  }, [library, albumId])

  return <main class="p-6">
    <div class="mb-4">
      <input class="hidden" type="text" value={LIBRARY_ID} />
      <input class="py-1 px-2 bg-gray-200 rounded-md" type="password" value={secret} onChange={e => storeSecret((e.target as HTMLInputElement).value)} />
    </div>
    {library === undefined
      ? <>Loading library...</>
      : album === undefined
        ? <Library library={library} onSelect={setAlbumId} onAdd={(name) => console.log(name)} />
        : <>
          <button class="py-2 hover:underline" onClick={() => setAlbumId(undefined)}>⇦ Alle albums</button>
          <Album album={album} />
        </>}
  </main>
}

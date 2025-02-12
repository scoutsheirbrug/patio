import { useCallback } from 'preact/hooks'
import { ApiLibrary, ApiPhoto } from '../api'
import { useAuth } from '../hooks/useAuth'
import { useLibrary } from '../hooks/useLibrary'
import { PhotoCollection } from './PhotoCollection'

type Props = {
  library: ApiLibrary & { type: 'photos' },
}
export function LibraryPhotos({ library }: Props) {
  const { api, isAuthorized } = useAuth()
  const { changeLibrary } = useLibrary()
  const authorized = isAuthorized(library.id)

  const changePhotos = useCallback(async (photos: ApiPhoto[]) => {
    api.patchLibrary(library.id, { photos })
    changeLibrary({ photos })
  }, [api, library, changeLibrary])

  console.log(library, authorized)

  return <div>
    <PhotoCollection authorized={authorized} photos={library.photos} changePhotos={changePhotos} />
  </div>
}

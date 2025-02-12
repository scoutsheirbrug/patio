import { ApiLibrary } from '../api'
import { LibraryAlbums } from './LibraryAlbums'
import { LibraryPhotos } from './LibraryPhotos'

type Props = {
  library: ApiLibrary,
}
export function Library({ library }: Props) {
  if (library.type === 'albums') {
    return <LibraryAlbums library={library} />
  }
  if (library.type === 'photos') {
    return <LibraryPhotos library={library} />
  }
  return <></>
}

import 'jimp/browser/lib/jimp.js'

declare var Jimp: any

type ThumbnailOptions = {
	size: number,
	quality?: number,
}
export async function createThumbnail(photo: File, { size, quality }: ThumbnailOptions) {
	const buffer = await photo.arrayBuffer()
	const jimp = await Jimp.read(buffer)
	jimp.cover(size, size)
	if (quality) {
		jimp.quality(quality)
	}
	const result = await new Promise<Uint8Array>((res, rej) => {
		jimp.getBuffer(Jimp.MIME_JPEG, (err: any, buffer: any) => {
			if (err) rej(err)
			res(buffer)
		})
	})
	return new Blob([result])
}

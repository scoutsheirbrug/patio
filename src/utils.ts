import 'jimp/browser/lib/jimp.js'
import piexifjs from 'piexifjs'

declare var Jimp: any

export async function processPhoto(photo: File) {
	const buffer = await photo.arrayBuffer()
	const processedJimp = await Jimp.read(buffer)

	const thumbnailJimp = processedJimp.clone()
	thumbnailJimp.cover(256, 256)
	thumbnailJimp.quality(90)

	const previewJimp = processedJimp.clone()
	previewJimp.resize(1024, Jimp.AUTO)
	previewJimp.quality(30)

	const [processed, thumbnail, preview] = await Promise.all(
		[processedJimp, thumbnailJimp, previewJimp].map(async jimp => {
			const preUrl: string = await jimp.getBase64Async(Jimp.MIME_JPEG)
			const postUrl = piexifjs.remove(preUrl)
			const postString = atob(postUrl.substring(23))
			const postArray = Array.from(postString).map(char => char.charCodeAt(0))
			return new Blob([new Uint8Array(postArray)], { type: 'image/jpeg' })
		})
	)
	return { processed, thumbnail, preview }
}

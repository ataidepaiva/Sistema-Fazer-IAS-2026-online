declare module "docx-merger" {
	export default class DocxMerger {
		constructor(options: { pageBreak: boolean }, buffers: Buffer[])
		save(type: "nodebuffer", callback: (data: Buffer) => void): void
	}
}

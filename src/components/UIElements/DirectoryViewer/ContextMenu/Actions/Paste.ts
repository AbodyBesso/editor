import { DirectoryWrapper } from '../../DirectoryView/DirectoryWrapper'
import { clipboard } from './Copy'
import { App } from '/@/App'
import { AnyDirectoryHandle, AnyHandle } from '/@/components/FileSystem/Types'
import { BaseWrapper } from '/@/components/UIElements/DirectoryViewer/Common/BaseWrapper'
import { basename, extname } from '/@/utils/path'

export const PasteAction = (directoryWrapper: DirectoryWrapper) => ({
	icon: 'mdi-content-paste',
	name: 'actions.paste.name',
	description: 'actions.paste.description',
	onTrigger: async () => {
		if (!clipboard.item) return
		const handleToPaste = clipboard.item

		const app = await App.getApp()
		const project = app.project

		if (!directoryWrapper.isOpen.value) await directoryWrapper.open()

		let newHandle: AnyHandle
		if (handleToPaste.kind === 'file') {
			const newName = findSuitableFileName(
				handleToPaste.name,
				directoryWrapper
			)

			newHandle = await directoryWrapper.handle.getFileHandle(newName, {
				create: true,
			})
			await app.fileSystem.copyFileHandle(handleToPaste, newHandle)
		} else if (handleToPaste.kind === 'directory') {
			app.windows.loadingWindow.open()

			const newName = findSuitableFolderName(
				handleToPaste.name,
				directoryWrapper
			)

			newHandle = await directoryWrapper.handle.getDirectoryHandle(
				newName,
				{ create: true }
			)
			await app.fileSystem.copyFolderByHandle(handleToPaste, newHandle)

			app.windows.loadingWindow.close()
		} else {
			// @ts-ignore
			throw new Error('Invalid handle kind: ' + handleToPaste.kind)
		}

		await directoryWrapper.refresh()
		if (newHandle) await project.updateHandle(newHandle)
	},
})

function findSuitableFileName(
	name: string,
	directoryWrapper: DirectoryWrapper
) {
	const children = directoryWrapper.children.value
	const fileExt = extname(name)
	let newName = basename(name, fileExt)

	while (children?.find((child) => child.name === newName + fileExt)) {
		if (!newName.includes(' copy')) {
			// 1. Add "copy" to the end of the name
			newName = `${newName} copy`
		} else {
			// 2. Add a number to the end of the name
			// Get the current name
			const number = parseInt(newName.match(/copy (\d+)/)?.[1] ?? '1')
			// Remove the last number and add the new one
			newName = newName.replace(/ copy \d+$/, '') + ` copy ${number + 1}`
		}
	}

	return newName + fileExt
}
function findSuitableFolderName(
	name: string,
	directoryWrapper: DirectoryWrapper
) {
	const children = directoryWrapper.children.value
	let newName = name

	while (children?.find((child) => child.name === newName)) {
		if (!newName.endsWith(' copy')) {
			// 1. Add "copy" to the end of the name
			newName = `${newName} copy`
		} else {
			// 2. Add a number to the end of the name
			const number = parseInt(newName.match(/copy (\d+)/)![1])
			newName = `${newName} copy ${number + 1}`
		}
	}

	return newName
}

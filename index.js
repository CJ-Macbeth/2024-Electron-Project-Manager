const path = require('path');
const fsp = require('fs').promises;
const electron = require('electron');

const File_Symbol = Symbol();

const File_New = async function (Path) {
	return await fsp.copyFile(path.join(__dirname, 'index.epm24'), Path).then(() => return Path);
}
const File_Open = async function (Path) {
	let window = new electron.browserWindow({webPreferences: {
		nodeIntegration: false,
		sandbox: true,
		contextIsolation: true,
		preload: path.join(__dirname, 'application.preload.js')
	});
	window[File_Symbol] = Path;
	window.setMenuBarVisibility(false);
	window.loadFile('application.html');
	window.webContents.on('will-navigate', E => E.preventDefault());
}
const File_Save = async function (Path, Data) {
	let File = Data.map(Node => JSON.stringify(Node)).join('\n');
	return await fsp.writeFile(Path).then(() => {return true});
}
const File_Load = async function (Path, Data) {
	let File = await fsp.readFile(Path).then(File => {
		return File.toString('utf8').split('\n').map(Line => {
			try {return JSON.parse(Line)} catch {return null}
		})
	});
}

const IPC_Response = function (Message, E) {
	if (E) {
		console.log('Project Manager Error Encountered:');
		console.log(E);
	}
	return {status: E ? false : true, body: Message};
}

function init() {
	electron.ipcMain.handle('file:new', async () => {
		let File = electron.BrowserWindow.fromWebContents(E.sender)[File_Symbol];
		if (!File) return IPC_Response('Failed to identify IPC sender', true);
		else return await electron.dialog.showSaveDialog({
			title: 'Create a New Project File'
		}).then(async R => {
			if (R.cancelled) return IPC_Response(false);
			else return File_New(R.filePath).then(File_Open).then(IPC_Response);
		}).catch(E => {
			return IPC_Response(E, true);
		});
	});
	electron.ipcMain.handle('file:open', async () => {
		let File = electron.BrowserWindow.fromWebContents(E.sender)[File_Symbol];
		if (!File) return IPC_Response('Failed to identify IPC sender', true);
		else return await electron.dialog.showSaveDialog({
			title: 'Open an Existing Project File',
			properties: ['multiSelections'],
			filters: {extensions: ['epm24']}
		}).then(R => {
			if (R.cancelled) return IPC_Response(false);
			let Paths = R.filePaths.map(File_Open);
			await Promises.all(Paths);
			if (Paths.every(Path => Path == true)) return IPC_Response(true);
			else return IPC_Response(false);
		}).catch(E => {
			return IPC_Response(E, true);
		});
	});
	electron.ipcMain.handle('file:save', async (E, Data) => {
		let File = electron.BrowserWindow.fromWebContents(E.sender)[File_Symbol];
		if (!File) return IPC_Response('Failed to identify IPC sender', true);
		else return await File_Save(File, Data);
	});
	electron.ipcMain.handle('file:load', async () => {
		let File = electron.BrowserWindow.fromWebContents(E.sender)[File_Symbol];
		if (!File) return IPC_Response('Failed to identify IPC sender', true);
		else return await File_Load(File);
	});
	let window = new electron.browserWindow({webPreferences: {
		nodeIntegration: false,
		sandbox: true,
		contextIsolation: true,
		preload: path.join(__dirname, 'launcher.preload.js')
	});
	window.setMenuBarVisibility(false);
	window.loadFile('launcher.html');
	window.webContents.on('will-navigate', E => E.preventDefault());
}
electron.app.whenReady().then(init);

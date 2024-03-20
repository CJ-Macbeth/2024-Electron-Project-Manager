const path = require('path');
const fsp = require('fs').promises;
const electron = require('electron');
const Extension = require(path.join(__dirname, 'Extension'));

const File_Symbol = Symbol();

const File_New = async function (Path) {
	return await fsp.copyFile(path.join(__dirname, 'index.epm24'), Path).then(() => {return Path});
}
const File_Open = async function (Path) {
	let window = new electron.BrowserWindow({webPreferences: {
		nodeIntegration: false,
		sandbox: true,
		contextIsolation: true,
		preload: path.join(__dirname, 'application.preload.js')
	}});
	window[File_Symbol] = Path;
	window.setMenuBarVisibility(false);
	window.loadFile('application.html');
	window.webContents.on('will-navigate', E => E.preventDefault());
	return true;
}
const File_Save = async function (Path, Data) {
	let File = Data.map(Node => JSON.stringify(Node)).join('\n');
	return await fsp.writeFile(Path, File).then(() => {return true});
}
const File_Load = async function (Path, Data) {
	let File = await fsp.readFile(Path).then(File => {
		return File.toString('utf8').split('\n').map(Line => {
			try {return JSON.parse(Line)} catch (E) {return null}
		})
	});
	return File;
}

const Link_Open = function (Link) {
	import('open').then(open => open.default(Link));
	return true;
}

const IPC_Response = function (Message, E) {
	if (E) {
		console.log('IPC Error Encountered:', Message);
	}
	return {status: E ? false : true, body: Message};
}

async function init() {
	electron.ipcMain.handle('file:new', async E => {
		let File = electron.BrowserWindow.fromWebContents(E.sender)[File_Symbol];
		if (!File) return IPC_Response('Failed to identify IPC sender', true);
		else return await electron.dialog.showSaveDialog({
			title: 'Create a New Project File'
		}).then(async R => {
			if (R.canceled) return IPC_Response(false);
			else return File_New(Extension(R.filePath,'epm24',true)).then(File_Open).then(IPC_Response);
		}).catch(E => {
			return IPC_Response(E, true);
		});
	});
	electron.ipcMain.handle('file:open', async E => {
		let File = electron.BrowserWindow.fromWebContents(E.sender)[File_Symbol];
		if (!File) return IPC_Response('Failed to identify IPC sender', true);
		else return await electron.dialog.showOpenDialog({
			title: 'Open an Existing Project File',
			properties: ['multiSelections'],
			filters: [{name: 'Project File', extensions: ['epm24']}]
		}).then(async R => {
			if (R.canceled) return IPC_Response(false);
			let Errors = [];
			let Paths = R.filePaths.map(File_Path => File_Open(File_Path).catch(e => {
				Errors.push(e);
				return false;
			}));
			return await Promise.allSettled(Paths).then(Results => {
				if (Results.every(Result => Result.value == true)) return IPC_Response(true);
				else return IPC_Response(Errors, true);
			});
		}).catch(E => {
			return IPC_Response(E, true);
		});
	});
	electron.ipcMain.handle('file:save', async (E, Data) => {
		let File = electron.BrowserWindow.fromWebContents(E.sender)[File_Symbol];
		if (!File) return IPC_Response('Failed to identify IPC sender', true);
		else return await File_Save(File, Data).then(IPC_Response).catch(E => {
			return IPC_Response(E, true);
		});
	});
	electron.ipcMain.handle('file:load', async E => {
		let File = electron.BrowserWindow.fromWebContents(E.sender)[File_Symbol];
		if (!File) return IPC_Response('Failed to identify IPC sender', true);
		else return await File_Load(File).then(IPC_Response).catch(E => {
			return IPC_Response(E, true);
		});
	});
	electron.ipcMain.handle('link:new', async E => {
		let File = electron.BrowserWindow.fromWebContents(E.sender)[File_Symbol];
		if (!File) return IPC_Response('Failed to identify IPC Sender', true);
		else return await electron.dialog.showOpenDialog({
			title: 'Select a File or Directory to Link in the Project File'
		}).then(R => {
			if (R.canceled) return IPC_Response(false);
			else return IPC_Response(R.filePaths[0]);
		}).catch(E => {
			return IPC_Response(E, true);
		});
	});
	electron.ipcMain.handle('link:open', async (E, Link) => {
		let File = electron.BrowserWindow.fromWebContents(E.sender)[File_Symbol];
		if (!File) return IPC_Response('Failed to identify IPC Sender', true);
		let Done = Link_Open(Link)
		return Done ? IPC_Response(Done) : IPC_Response(Done, false);
	});
	let window = new electron.BrowserWindow({webPreferences: {
		nodeIntegration: false,
		sandbox: true,
		contextIsolation: true,
		preload: path.join(__dirname, 'launcher.preload.js')
	}});
	window.setMenuBarVisibility(false);
	window.loadFile('launcher.html');
	window.webContents.on('will-navigate', E => E.preventDefault());
	window[File_Symbol] = true;
}
electron.app.whenReady().then(init);

const path = require('path');
const fsp = require('fs').promises;
const electron = require('electron');
const Extension = require(path.join(__dirname, 'Extension'));

if (require('electron-squirrel-startup')) electron.app.quit();

const File_Symbol = Symbol();

const File_New = async function (Path) {
	return await fsp.copyFile(path.join(__dirname, 'index.4mica'), Path).then(() => {return Path});
}
const File_Open = async function (Path) {
	let window = new electron.BrowserWindow({webPreferences: {
		additionalArguments: ['--formica-file=' + Path],
		nodeIntegration: false,
		contextIsolation: true,
		sandbox: false,
		preload: path.join(__dirname, 'application.preload.js'),
		icon: path.join(__dirname, 'icon.png')
	}});
	window[File_Symbol] = Path;
	window.setMenuBarVisibility(false);
	window.loadFile('application.html');
	window.webContents.on('will-navigate', E => E.preventDefault());
	return true;
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
	electron.ipcMain.handle('log:error', (E, e) => console.log(e));
	electron.ipcMain.handle('file:new', async E => {
		let File = electron.BrowserWindow.fromWebContents(E.sender)[File_Symbol];
		if (!File) return IPC_Response('Failed to identify IPC sender', true);
		else return await electron.dialog.showSaveDialog({
			title: 'Create a New Project File'
		}).then(async R => {
			if (R.canceled) return IPC_Response(false);
			else return File_New(Extension(R.filePath,'4mica',true)).then(File_Open).then(IPC_Response);
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
			filters: [{name: 'Project File', extensions: ['4mica']}]
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
	if (process.argv.length > 2) {
		let Paths = process.argv.slice(2);
		for (let i = 0, l = Paths.length; i < l; i++) await File_Open(Paths[i]);
	} else {
		let window = new electron.BrowserWindow({webPreferences: {
			nodeIntegration: false,
			sandbox: true,
			contextIsolation: true,
			preload: path.join(__dirname, 'launcher.preload.js'),
			icon: path.join(__dirname, 'icon.png')
		}});
		window.setMenuBarVisibility(false);
		window.loadFile('launcher.html');
		window.webContents.on('will-navigate', E => E.preventDefault());
		window[File_Symbol] = true;
	}
}
electron.Menu.setApplicationMenu(null);
electron.app.whenReady().then(init);

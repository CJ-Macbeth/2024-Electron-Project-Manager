const electron = require('electron');
const v8 = require('v8');
const fsp = require('fs').promises;
const path = require('path');
const Path = [...process.argv].find(arg => arg.match(/--formica-file/)).split('=')[1];
electron.contextBridge.exposeInMainWorld('IPC', {
	Error_Log: async E => {
		return await electron.ipcRenderer.invoke('log:error', E);
	},
	Error_Export: async E => {
		let File = '';
		E.forEach(Entry => File += Entry + '\n\n');
		await fsp.writeFile(Path + '.' + Date.now() + '.log', File + '\n');
	},
	File_New: async () => {
		return new Promise ((Resolve, Reject) => {
			electron.ipcRenderer.invoke('file:new').then(R => R.status ? Resolve(R.body) : Reject(R.body));
		});
	},
	File_Open: async () => {
		return new Promise ((Resolve, Reject) => {
			electron.ipcRenderer.invoke('file:open').then(R => R.status ? Resolve(R.body) : Reject(R.body));
		});
	},
	File_Save: async Data => {
		let binary_data = v8.serialize(Data);
		await fsp.writeFile(Path, binary_data);
		return true;
	},
	File_Crash: async Data => {
		let binary_data = v8.serialize(Data);
		await fsp.writeFile(Path + '.crash', binary_data);
		return true;
	},
	File_Name: Path,
	File_Load: async () => {
		return await fsp.readFile(Path).then(buff => v8.deserialize(buff));
	},
	Link_New: async () => {
		return new Promise ((Resolve, Reject) => {
			electron.ipcRenderer.invoke('link:new').then(R => R.status ? Resolve(R.body) : Reject(R.body));
		});
	},
	Link_Open: async Link => {
		return new Promise ((Resolve, Reject) => {
			electron.ipcRenderer.invoke('link:open', Link).then(R => R.status ? Resolve(R.body) : Reject(R.body));
		});
	}
});

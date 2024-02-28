const electron = require('electron');
electron.contextBridge.exposeInMainWorld('IPC', {
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
		return new Promse ((Resolve, Reject) => {
			electron.ipcRenderer.invoke('file:save', Data).then(R => R.status ? Resolve(R.body) : Reject(R.body));
		});
	},
	File_Load: async () => {
		return new Promise ((Resolve, Reject) => {
			electron.ipcRenderer.invoke('file:load').then(R => R.status ? Resolve(R.body) : Reject(R.body));
		});
	}
});

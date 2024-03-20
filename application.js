var GUI, My_Edit, My_View;
const Menu_Boilerplate = [{}, {}, {
	'n': {
		Name: 'New File',
		Function: IPC.File_New
	},
	'o': {
		Name: 'Open File',
		Function: IPC.File_Open
	},
	's': {
		Name: 'Save File',
		Function: () => IPC.File_Save(My_File.Export())
	}
}, {}, [{
	Name: '2024 Electron Project Manager'
}, {
	Name: 'created by CJ Macbeth'
}]];
const Menu = new MGUI.Menu(...Menu_Boilerplate);
const init = async function () {
	GUI = new MGUI(document.getElementById('Menu'));
	let Data = await IPC.File_Load();
	My_Edit = new Edit(Data);
	My_View = new View(My_Edit, document.getElementById('Workspace'), GUI);
}

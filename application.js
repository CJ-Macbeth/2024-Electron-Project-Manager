var GUI, My_File;
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
	//GUI.Navigate(Menu);
	let Data = await IPC.File_Load();
	//My_File = new File(document.getElementById('Workspace'), Data, GUI, Menu_Boilerplate);
	My_File = new File(Data);
	My_Tab = new Tab(My_File, document.getElementById('Workspace'), GUI);
}

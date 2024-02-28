const File = function (Container, Data) {
	this.Container = Container;
	this.Data = Data.map(Element => {
		if (Element.Children.length > 0) Element.Children = Element.Children.map(Child => Data[Child]);
	});
	this.Mode = this.Minimal_Checklist_Mode;
	this.Save = null;
	this.Prepare_Menus();
	this.Chain = [];
	this.Navigate(0);
}
File.prototype.Navigate = function (Index) {
	// check value
	if (typeof Index == 'number') {
		this.Chain.push(this.Node);
		this.Node = this.Data[Index];
	} else {
		this.Node = this.Chain.pop();
	}
	if (this.Save) this.Save();
	this.Container.innerHTML = '';
	this.Draw();
}
File.prototype.Draw = function (Node) {
	this.Mode();
}
File.prototype.Title = function (Title) {
	this.Node.Title = Title;
}
File.prototype.Statement = function (Statement) {
	this.Node.Statement = Statement;
}
File.prototype.Periodicity = function (Options) {}
File.prototype.Check = function (Index) {
	this.Node.Periodicity = true; // changes periodicity to COMPLETED/checked
}
File.prototype.New_Node = function () {
	// return index
}
File.prototype.Remove_Node = function (Index) {}
File.prototype.New_Child = function (Index) {}
File.prototype.Move_Child = function (Index, Up) {}
File.prototype.Remove_Child = function (Index) {}
File.prototype.New_Note = function (Note) {}
File.prototype.Modify_Note = function (Index, Note) {}
File.prototype.Move_Note = function (Index, Up) {}
File.prototype.Remove_Note = function (Index) {}
File.prototype.New_Link = function (Link) {}
File.prototype.Modify_Link = function (Index) {}
File.prototype.Move_Link = function (Index, Up) {}
File.prototype.Remove_Link = function (Index) {}
File.prototype.Checklist_Mode = function () {}
File.prototype.Minimal_Checklist_Mode = function () {}
File.prototype.Expanded_Checklist_Mode = function () {}
File.prototype.Kanban_Mode = function () {}
File.prototype.Export = function () {
	// translate Children from reference to index for saving
}
File.prototype.Prepare_Menus = function () {
	this.Menus = Object.create(null);
	this.Menus.File_Save = {
		Name: 'Save File',
		Function: () => {}
	};
	this.Menus.Navigate_Back = {
		Name: 'Navigate Back',
		Function: this.Navigate
	};
}

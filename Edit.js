//
// Node(Index)
// Node_Add(Options)
// Node_Modify(Options, Index)
// Node_Remove(Index)
// Node_Search(Search, Depth, Index)
// Node_Orphans(Include_Root)
// Child_Add(Child_Index, Parent_Index)
// Child_Move(Child_Index, Target, Index)
// Child_Remove(Child_Index, Index)
// Link_Add(Link, Index)
// Link_Modify(Link_Index, Link, Index)
// Link_Move(Link_Index, Target, Index)
// Link_Remove(Link_Index, Index)
// Sketch_Add(Options, Index)
// Sketch_Modify(Sketch_Index, Options, Index)
// Sketch_Remove(Sketch_Index, Index)
// Log_Add(Log, Index)
// Log_Modify(Log_Index, Log, Index)
// Log_Move(Log_Index, Target, Index)
// Log_Remove(Log_Index, Index)
//
// what to do:
// -> change the save function: save as direct data
// -> fix cut and paste
// -> fix click to navigate tree
// -> stop backup on cut
// -> disable Menu
//
const Edit = function (Data) {
	this.Increment = 0;
	this.References = new Map();
	this.Data = Data.map(Node => this.Node_Tool({}, Node));
}
Edit.prototype.Identify_Node = function (Reference, Internal) {
	if (Internal) {
		let Index = this.Data.indexOf(Reference);
		if (Index === -1) throw new Edit.Error('Failed to identify Node from Reference provided');
		else return Index;
	} else {
		let Pair = [...this.References].find(([Key, Value]) => Value === Reference);
		if (!Pair) throw new Edit.Error('Failed to identify Node from References provided');
		else return Pair[0];
	}
}
Edit.prototype.Export = async function () {
	return this.Data;
}
Edit.prototype.Node = async function (Index) {
	let Node = this.Identify_Node(Index);
	return this.Node_Tool(Node, false, false, true, true);
}
Edit.prototype.Node_Add = async function (Options) {
	let Shell = this.Node_Tool(Options, Object.create(null), true);
	this.Data.push(Shell);
	return this.References.get(Shell);
}
Edit.prototype.Node_Modify = async function (Options, Index) {
	let Node = this.Identify_Node(Index);
	return this.Node_Tool(Options, Node);
}
Edit.prototype.Node_Remove = async function (Index) {
	let Node = this.Identify_Node(Index);
	Data_Index = this.Identify_Node(Node, true);
	this.Data.splice(Data_Index, 1)[0];
	this.Data.forEach(node => node.Children = node.Children.filter(Child => Child != Node));
	return true;
}
Edit.prototype.Node_Search = async function (Search, Depth, Index) {
	Node = this.Identify_Node(Index);
	let Matches = new Set();
	let Checked = [];
	let Dive = (Remaining_Depth, Current_Node) => {
		if (Checked.includes(Current_Node)) return;
		else Checked.push(Current_Node);
		Current_Node.Children.forEach(Child => {
			if (
				Child.Title.match(Search) ||
				(Child.Statement &&
				Child.Statement.match(Search))
			) Matches.add(Child);
		});
		if (Remaining_Depth > 0) Current_Node.Children.forEach(Child => Dive(Remaining_Depth - 1, Child));
	}
	Dive(Depth, Node);
	return [...new Set(Matches)].map(Node => this.References.get(Node));
}
Edit.prototype.Node_Orphans = async function (Include_Root) {
	let Parented = new Set();
	let Everyone = new Set(this.Data);
	this.Data.forEach(Node => Node.Children.forEach(Child => Parented.add(Child)));
	let Orphans = Everyone.difference(Parented);
	let Sorted_Orphans = [...Orphans].sort((A, B) => this.Identify_Node(A, true) < this.Identify_Node(B, true) ? -1 : 1);
	if (Include_Root && !Sorted_Orphans.includes(this.Data[0])) Sorted_Orphans.unshift(this.Data[0]);
	return Sorted_Orphans.map(Orphan => this.References.get(Orphan));
}
Edit.prototype.Child_Add = async function (Child_Index, Parent_Index)  {
	let Child = this.Identify_Node(Child_Index);
	let Parent = this.Identify_Node(Parent_Index);
	if (!Parent.Children.includes(Child)) Parent.Children.push(Child);
	return Parent.Children.indexOf(Child);
}
Edit.prototype.Child_Move = async function (Child_Index, Target, Index) {
	let Node = this.Identify_Node(Index);
	if (
		!Number.isInteger(Child_Index) ||
		Child_Index < 0 ||
		Child_Index >= Node.Children.length
	) throw new Edit.Error('Invalid Child_Index provided');
	if (Target === true) Target = Child_Index - 1;
	else if (Target === false) Target = Child_Index + 1;
	else if (
		!Number.isInteger(Target) ||
		Target < 0 ||
		Target >= Node.Children.length
	) throw new Edit.Error('Invalid Target provided');
	let Child = Node.Children.splice(Child_Index, 1)[0];
	Node.Children.splice(Target, 0, Child);
	return Target;
}
Edit.prototype.Child_Remove = async function (Child_Index, Index) {
	let Node = this.Identify_Node(Index);
	if (
		!Number.isInteger(Child_Index) ||
		Child_Index < 0 ||
		Child_Index >= Node.Children.length
	) throw new Edit.Error('Invalid Child_Index provided');
	let Child = Node.Children.splice(Child_Index, 1)[0];
	return this.References.get(Child);
}
Edit.prototype.Link_Add = async function (Link, Index) {
	if (typeof Link != 'string' || Link.trim().length == 0) throw new Edit.Error('Invalid Link provided');
	let Node = this.Identify_Node(Index);
	let Link_Length = Node.Links.push(Link.trim());
	return Link_Length - 1;
}
Edit.prototype.Link_Modify = async function (Link_Index, Link, Index) {
	if (typeof Link != 'string' || Link.trim().length == 0) return false;
	let Node = this.Identify_Node(Index);
	if (
		!Number.isInteger(Link_Index) ||
		Link_Index < 0 ||
		Link_Index >= Node.Links.length
	) throw new Edit.Error('Invalid Link_Index provided');
	Node.Links[Link_Index] = Link.trim();
	return Link_Index;
}
Edit.prototype.Link_Move = async function (Link_Index, Target, Index) {
	let Node = this.Identify_Node(Index);
	if (
		!Number.isInteger(Link_Index) ||
		Link_Index < 0 ||
		Link_Index >= Node.Links.length
	) throw new Edit.Error('Invalid Link_Index provided');
	if (Target === true) Target = Link_Index - 1;
	else if (Target === false) Target = Link_Index + 1;
	else if (
		!Number.isInteger(Target) ||
		Target < 0 ||
		Target >= Node.Links.length
	) throw new Edit.Error('Invalid Target provided');

	let Link = Node.Links.splice(Link_Index, 1)[0];
	Node.Links.splice(Target, 0, Link);
	return Target;
}
Edit.prototype.Link_Remove = async function (Link_Index, Index) {
	let Node = this.Identify_Node(Index);
	if (
		!Number.isInteger(Link_Index) ||
		Link_Index < 0 ||
		Link_Index >= Node.Links.length
	) throw new Edit.Error('Invalid Link_Index provided');
	let Link = Node.Links.splice(Link_Index, 1)[0];
	return Link;
}
Edit.prototype.Sketch_Add = async function (Options, Index) {	
	let Node = this.Identify_Node(Index);
	let Entry = this.Sketch_Tool(Options, false, true);
	let Sketch_Length = Node.Sketch.push(Entry);
	return Sketch_Length - 1;
}
Edit.prototype.Sketch_Modify = async function (Sketch_Index, Options, Index) {
	let Node = this.Identify_Node(Index);
	if (
		!Number.isInteger(Sketch_Index) ||
		Sketch_Index < 0 ||
		Sketch_Index >= Node.Sketch.length
	) throw new Edit.Error('Invalid Sketch_Index provided');
	this.Sketch_Tool(Options, Node.Sketch[Sketch_Index], false);
	return Sketch_Index;
}
Edit.prototype.Sketch_Remove = async function (Sketch_Index, Index) {
	let Node = this.Identify_Node(Index);
	if (
		!Number.isInteger(Sketch_Index) ||
		Sketch_Index < 0 ||
		Sketch_Index >= Node.Sketch.length
	) throw new Edit.Error('Invalid Sketch_Index provided');
	let Entry = Node.Sketch.splice(Sketch_Index, 1)[0];
	return this.Sketch_Tool(Entry, false, false);
}
Edit.prototype.Log_Add = async function (Log, Index) {
	if (typeof Log != 'string' || Log.trim().length == 0) throw new Edit.Error('Invalid Log provided');
	let Node = this.Identify_Node(Index);
	let Log_Length = Node.Log.push(Log.trim());
	return Log_Length - 1;
}
Edit.prototype.Log_Modify = async function (Log_Index, Log, Index) {
	if (typeof Log != 'string' || Log.trim().length == 0) return false;
	let Node = this.Identify_Node(Index);
	if (
		!Number.isInteger(Log_Index) ||
		Log_Index < 0 ||
		Log_Index >= Node.Log.length
	) throw new Edit.Error('Invalid Log_Index provided');
	Node.Log[Log_Index] = Log.trim();
	return Log_Index;
}
Edit.prototype.Log_Move = async function (Log_Index, Target, Index) {
	let Node = this.Identify_Node(Index);
	if (
		!Number.isInteger(Log_Index) ||
		Log_Index < 0 ||
		Log_Index >= Node.Log.length
	) throw new Edit.Error('Invalid Log_Index provided');
	if (Target === true) Target = Log_Index - 1;
	else if (Target === false) Target = Log_Index + 1;
	else if (
		!Number.isInteger(Target) ||
		Target < 0 ||
		Target >= Node.Log.length
	) throw new Edit.Error('Invalid Target provided');

	let Log = Node.Log.splice(Log_Index, 1)[0];
	Node.Log.splice(Target, 0, Log);
	return Target;
}
Edit.prototype.Log_Remove = async function (Log_Index, Index) {
	let Node = this.Identify_Node(Index);
	if (
		!Number.isInteger(Log_Index) ||
		Log_Index < 0 ||
		Log_Index >= Node.Log.length
	) throw new Edit.Error('Invalid Log_Index provided');
	let Log = Node.Log.splice(Log_Index, 1)[0];
	return Log;
}
Edit.prototype.Title_Tool = function () {
	return this.Data ? [...new Set(this.Data.map(Node => {return Node.Title}))] : [];
}
Edit.prototype.Node_Tool = function (Options, Base, Defaults, Ignore_Children, Export) {
	let Titles = this.Title_Tool();
	if (!Base) Base = Object.create(null);
	if (typeof Options != 'object' || Options === null) throw new Edit.Error('No Options provided');
	if (typeof Options.Title == 'string' && Options.Title.length > 0 && (Export || !Titles.includes(Options.Title))) Base.Title = Options.Title.trim();
	else if (typeof Options.Title == 'string' && Options.Title.length > 0 && (!Export && Titles.includes(Options.Title))) {
		Options.Title = Options.Title.trim() + ' ';
		while (Titles.includes(Options.Title.trim())) Options.Title += '*';
		Base.Title = Options.Title;
	}
	else if (Options.Title === null || (Defaults && !Base.Title)) Base.Title = 'UNNAMED';
	else if (!Base.Title && !Defaults) throw new Edit.Error('No Title assigned to Node');
	if (typeof Options.Statement == 'string') Base.Statement = Options.Statement;
	else if (Options.Statement == null) delete Options.Statement;
	if (Ignore_Children && Array.isArray(Options.Children)) Base.Children = [...Options.Children];
	else if (!Ignore_Children && Array.isArray(Options.Children)) Base.Children = Options.Children.map(Child => {
		if (Number.isInteger(Child) && Child >= 0 && Child < this.Data.length) return this.Data[Child];
		else if (this.Data.includes(Child)) return Child;
		else return null;
		//else throw new Edit.Error('Invalid Child Assignment');
	}).filter(Child => Child !== null);
	else if (Defaults && !Array.isArray(Options.Children) && !Base.Children) Base.Children = [];
	else if (!Defaults && !Array.isArray(Options.Children) && !Base.Children) throw new Edit.Error('Invalid Children provided');
	if (
		Array.isArray(Options.Links) &&
		Options.Links.every(Link => typeof Link == 'string')
	) Base.Links = Options.Links.map(Link => Link.trim());
	else if (Options.Links === null || (Defaults && !Array.isArray(Options.Links) && !Base.Links)) Base.Links = [];
	else if (
		!Defaults &&
		!Base.Links &&
		(!Array.isArray(Options.Links) ||
		!Options.Links.every(Link => typeof Link == 'string'))
	) throw new Edit.Error('Invalid Links provided');
	if (Array.isArray(Options.Log) && Options.Log.every(Entry => typeof Entry == 'string')) Base.Log = [...Options.Log];
	else if (Options.Log === null || (Defaults && !Array.isArray(Options.Log) && !Base.Log)) Base.Log = [];
	else if (
		!Defaults &&
		!Base.Log &&
		(!Array.isArray(Options.Log) ||
		!Options.Log.every(Entry => typeof Entry == 'string'))
	) throw new Edit.Error('Invalid Log provided');
	if (this.Types.includes(Options.Type)) Base.Type = Options.Type;
	else if (
		!Options.Type ||
		(Defaults && !Base.Type)
	) Base.Type = this.Types[0];
	else if (!this.Types.includes(Options.Type)) throw new Edit.Error('Invalid Type provided');
	if (Array.isArray(Options.Sketch)) Base.Sketch = Options.Sketch.map(Entry => this.Sketch_Tool(Entry, Object.create(null), Defaults));
	else if (Options.Sketch === null || (Defaults && !Array.isArray(Options.Sketch) && !Base.Sketch)) Base.Sketch = [];
	else if (!Defaults && !Base.Sketch && !Array.isArray(Options.Sketch)) throw new Edit.Error('Invalid Sketch provided');
	if (typeof Options.Complete == 'boolean' || Options.Complete === null) Base.Complete = Options.Complete;
	else if (Options.Complete === undefined && Defaults && Base.Complete === undefined) Base.Complete = false;
	else if (typeof Options.Complete != 'boolean' &&
		Options.Complete !== null &&
		Base.Complete === undefined
	) throw new Edit.Error('Invalid Complete provided');
	if (!Export && !this.References.has(Base)) this.References.set(Base, this.Increment++);
	if (Export) {
		Base.Children = Base.Children.map(Child => this.References.get(Child));
		Base.Index = this.References.get(Options);
	}
	return Base;
}
Edit.prototype.Sketch_Tool = function (Options, Base, Defaults) {
	if (!Base) Base = Object.create(null);
	if (typeof Options.X == 'number') Base.X = Options.X;
	else if (typeof Base.X != 'number' && Defaults) Base.X = 0;
	else if (typeof Base.X != 'number') throw new Edit.Error('No X value assigned to Sketch Item');
	if (typeof Options.Y == 'number') Base.Y = Options.Y;
	else if (typeof Base.Y != 'number' && Defaults) Base.Y  = 0;
	else if (typeof Base.Y != 'number') throw new Edit.Error('No Y value assigned to Sketch Item');
	if (typeof Options.Z == 'number') Base.Z = Options.Z;
	else if (typeof Base.Z != 'number' && Defaults) Base.Z = 1;
	else if (typeof Base.Z != 'number') throw new Edit.Error('No Z value assigned to Sketch Item');
	if (Options.Color) Base.Color = Options.Color;
	else if (!Base.Color && Defaults) Base.Color = '#000000';
	else if (!Base.Color) throw new Edit.Error('No Color value assigned to Sketch Item');
	if (Options.Text) Base.Text = Options.Text;
	else if (!Base.Text && Defaults) Base.Text = '?';
	else if (!Base.Text) throw new Edit.Error('No Text value assigned to Sketch Item');
	return Base;
}
Edit.prototype.Types = ['Task', 'Kanban'];
class Edit_Error extends Error {
	constructor (message) {
		super(message);
		this.name = 'Formica Data Error';
	}
}
Edit.Error = Edit_Error;

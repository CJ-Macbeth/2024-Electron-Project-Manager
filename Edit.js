// access to add:
// -- specific child (by index?), and root child
// -- return created data (rather than true/err)
//
// most references are done by direct object reference,
// change that to: return copy of node on request, and Children are by index :)
const Edit = function (Data) {
	this.Data = Data.map(Node => this.Node_Tool(Node, Object.create(null), true, true));
	this.Data = this.Data.map(Node => this.Node_Tool({Children: Node.Children}, Node));
}
Edit.prototype.Identify_Node = function (Node) {
	if (Number.isInteger(Node) && this.Data[Node]) return this.Data[Node];
	else if (!Node) return this.Data[0];
	else if (this.Data.includes(Node)) return Node;
	else throw new Error('Failed to identify node');
}
Edit.prototype.Export = function () {
	return this.Data.map(Node => {
		let Shell = structuredClone(Node);
		Shell.Children = Node.Children.map(Child => this.Data.indexOf(Child)).filter(Child => Child != -1);
		return Shell;
	});
}
Edit.prototype.Node_Add = function (Options) {
	let Shell = this.Node_Tool(Options, Object.create(null), true);
	this.Data.push(Shell);
	return Shell;
}
Edit.prototype.Node_Modify = function (Options, Node) {
	Node = this.Identify_Node(Node);
	return this.Node_Tool(Options, Node);
}
Edit.prototype.Node_Remove = function (Node) {
	if (!Number.isInteger(Node)) Node = this.Data.indexOf(Node);
	if (!this.Data[Node]) return false;
	let Problem_Child = this.Data.splice(Node, 1)[0];
	this.Data.forEach(Node => Node.Children = Node.Children.filter(Child => Child != Problem_Child));
	return true;
}
Edit.prototype.Node_Search = function (Search, Depth, Node) {
	Node = this.Identify_Node(Node);
	let Matches = [];
	let Checked = [];
	let Dive = (Remaining_Depth, Current_Node) => {
		if (Checked.includes(Current_Node)) return;
		else Checked.push(Current_Node);
		Current_Node.Children.forEach(Child => {
			if (
				Child.Title.match(Search) ||
				(Child.Statement &&
				Child.Statement.match(Search))
			) Matches.push(Child);
		});
		if (Remaining_Depth > 0) Current_Node.Children.forEach(Child => Dive(Remaining_Depth - 1, Child));
	}
	Dive(Depth, Node);
	return Matches;
}
Edit.prototype.Node_Orphans = function (Include_Root) {
	let Parented = new Set();
	let Everyone = new Set(this.Data);
	this.Data.forEach(Node => Node.Children.forEach(Child => Parented.add(Child)));
	let Difference = Everyone.difference(Parented);
	let Ordered_Difference = [...Difference].sort((A, B) => this.Data.indexOf(A) < this.Data.indexOf(B) ? -1 : 1);
	if (Include_Root && !Ordered_Difference.includes(this.Data[0])) Ordered_Difference.unshift(this.Data[0]);
	return Ordered_Difference;
}
Edit.prototype.Child_Add = function (Child, Node)  {
	if (!this.Data.includes(Child)) return false;
	Node = this.Identify_Node(Node);
	if (Node.Children.includes(Child)) return false;
	else Node.Children.push(Child);
	return true;
}
Edit.prototype.Child_Move = function (Index, Target, Node) {	
	Node = this.Identify_Node(Node);
	if (!Number.isInteger(Index)) Index = Node.Children.indexOf(Index);
	if (!Node.Children[Index]) return false;
	if (Target === true && Index > 0) {
		let Child = Node.Children.splice(Index, 1)[0];
		Node.Children.splice(Index - 1, 0, Child);
	} else if (Target === false && Index < Node.Children.length) {
		let Child = Node.Children.splice(Index, 1)[0];
		Node.Children.splice(Index + 1, 0, Child);
	} else if (Number.isInteger(Target) && Node.Children[Target]) {
		let Child = Node.Children.splice(Target, 1);
		Node.Children.splice(Target, 0, Child);
	} else return false;
	return true;
}
Edit.prototype.Child_Remove = function (Index, Node) {	
	Node = this.Identify_Node(Node);
	if (!Number.isInteger(Index)) Index = Node.Children.indexOf(Index);
	if (!Node.Children[Index]) return false;
	Node.Children.splice(Index, 1);
	return true;
}
Edit.prototype.Link_Add = function (Link, Node) {
	if (typeof Link != 'string' || Link.length == 0) return false;
	Node = this.Identify_Node(Node);
	Node.Links.push(Link);
	return true;
}
Edit.prototype.Link_Modify = function (Index, Link, Node) {
	if (typeof Link != 'string' || Link.length == 0) return false;
	Node = this.Identify_Node(Node);
	if (!Node.Links[Index]) return false;
	Node.Links[Index] = Link;
	return true;
}
Edit.prototype.Link_Move = function (Index, Target, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Links[Index]) return false;
	if (Target === true && Index > 0) {
		let Link = Node.Links.splice(Index, 1)[0];
		Node.Links.splice(Index - 1, 0, Link);
	} else if (Target === false && Index < Node.Links.length -1) {
		let Link = Node.Links.splice(Index, 1)[0];
		Node.Links.splice(Index + 1, 0, Link);
	} else if (Number.isInteger(Target) && Node.Links[Target]) {
		let Link = Node.Links.splice(Target, 1);
		Node.Links.splice(Target, 0, Link);
	} else return false;
	return true;
}
Edit.prototype.Link_Remove = function (Index, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Links[Index]) return false;
	Node.Links.splice(Index, 1);
	return true;
}
Edit.prototype.Sketch_Add = function (Entry, Node) {	
	Node = this.Identify_Node(Node);
	Node.Sketch.push(this.Sketch_Tool(Entry, Object.create(null), true));
	return true;
}
Edit.prototype.Sketch_Modify = function (Index, Entry, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Sketch[Index]) return false;
	this.Sketch_Tool(Entry, Node.Sketch[Index]);
	return true;
}
Edit.prototype.Sketch_Remove = function (Index, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Sketch[Index]) return false;
	Node.Sketch.splice(Index, 1);
	return true;
}
Edit.prototype.Log_Add = function (Log, Node) {
	if (typeof Log != 'string' || Log.length == 0) return false;
	Node = this.Identify_Node(Node);
	Node.Log.push(Log);
	return true;
}
Edit.prototype.Log_Modify = function (Index, Log, Node) {
	if (typeof Log != 'string' || Log.length == 0) return false;
	Node = this.Identify_Node(Node);
	if (!Node.Log[Index]) return false;
	Node.Log[Index] = Log;
	return true;
}
Edit.prototype.Log_Move = function (Index, Target, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Log[Index]) return false;
	if (Target === true && Index > 0) {
		let Log = Node.Log.splice(Index, 1)[0];
		Node.Log.splice(Index - 1, 0, Log);
	} else if (Target === false && Index < Node.Log.length -1) {
		let Log = Node.Log.splice(Index, 1)[0];
		Node.Log.splice(Index + 1, 0, Log);
	} else if (Number.isInteger(Target) && Node.Log[Target]) {
		let Link = Node.Links.splice(Target, 1);
		Node.Log.splice(Target, 0, Log);
	} else return false;
	return true;
}
Edit.prototype.Log_Remove = function (Index, Node) {
	Node = this.Identify_Node(Node);
	if (!Node.Log[Index]) return false;
	Node.Log.splice(Index, 1);
	return true;
}
Edit.prototype.Title_Tool = function () {
	return this.Data ? [...new Set(this.Data.map(Node => {return Node.Title}))] : [];
}
Edit.prototype.Node_Tool = function (Options, Base, Defaults, Ignore_Children) {
	let Titles = this.Title_Tool();
	if (!Base) Base = Object.create(null);
	if (typeof Options != 'object' || Options === null) throw new Error('No Options provided');
	if (typeof Options.Title == 'string' && Options.Title.length > 0 && !Titles.includes(Options.Title)) Base.Title = Options.Title.trim();
	else if (typeof Options.Title == 'string' && Options.Title.length > 0 && Titles.includes(Options.Title)) {
		Options.Title = Options.Title.trim() + ' ';
		while (Titles.includes(Options.Title)) Options.Title += '*';
		Base.Title = Options.Title;
	}
	else if (Options.Title === null || (Defaults && !Base.Title)) Base.Title = 'UNNAMED';
	else if (!Base.Title && !Defaults) throw new Error('No Title assigned to Node');
	if (typeof Options.Statement == 'string') Base.Statement = Options.Statement;
	else if (Options.Statement == null) delete Options.Statement;
	if (Ignore_Children && Array.isArray(Options.Children)) Base.Children = Options.Children;
	else if (!Ignore_Children && Array.isArray(Options.Children)) Base.Children = Options.Children.map(Child => {
		if (Number.isInteger(Child) && Child >= 0 && Child < this.Data.length) return this.Data[Child];
		else if (this.Data.includes(Child)) return Child;
		else throw new Error('Invalid Child Assignment');
	});
	else if (Defaults && !Array.isArray(Options.Children) && !Base.Children) Base.Children = [];
	else if (!Defaults && !Array.isArray(Options.Children) && !Base.Children) throw new Error('Invalid Children provided');
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
	) throw new Error('Invalid Links provided');
	if (Array.isArray(Options.Log) && Options.Log.every(Entry => typeof Entry == 'string')) Base.Log = Options.Log;
	else if (Options.Log === null || (Defaults && !Array.isArray(Options.Log) && !Base.Log)) Base.Log = [];
	else if (
		!Defaults &&
		!Base.Log &&
		(!Array.isArray(Options.Log) ||
		!Options.Log.every(Entry => typeof Entry == 'string'))
	) throw new Error('Invalid Log provided');
	if (this.Types.includes(Options.Type)) Base.Type = Options.Type;
	else if (
		!Options.Type ||
		(Defaults && !Base.Type)
	) Base.Type = this.Types[0];
	else if (!this.Types.includes(Options.Type)) throw new Error('Invalid Type provided');
	if (Array.isArray(Options.Sketch)) Base.Sketch = Options.Sketch.map(Entry => this.Sketch_Tool(Entry, Object.create(null), Defaults));
	else if (Options.Sketch === null || (Defaults && !Array.isArray(Options.Sketch) && !Base.Sketch)) Base.Sketch = [];
	else if (!Defaults && !Base.Sketch && !Array.isArray(Options.Sketch)) throw new Error('Invalid Sketch provided');
	if (typeof Options.Complete == 'boolean' || Options.Complete === null) Base.Complete = Options.Complete;
	else if (Options.Complete === undefined && Defaults && Base.Complete === undefined) Base.Complete = false;
	else if (typeof Options.Complete != 'boolean' &&
		Options.Complete !== null &&
		Base.Complete === undefined
	) throw new Error('Invalid Complete provided');
	return Base;
}
Edit.prototype.Sketch_Tool = function (Options, Base, Defaults) {
	if (!Base) Base = Object.create(null);
	if (typeof Options.X == 'number') Base.X = Options.X;
	else if (typeof Base.X != 'number' && Defaults) Base.X = 0;
	else if (typeof Base.X != 'number') throw new Error('No X value assigned to Sketch Item');
	if (typeof Options.Y == 'number') Base.Y = Options.Y;
	else if (typeof Base.Y != 'number' && Defaults) Base.Y  = 0;
	else if (typeof Base.Y != 'number') throw new Error('No Y value assigned to Sketch Item');
	if (typeof Options.Z == 'number') Base.Z = Options.Z;
	else if (typeof Base.Z != 'number' && Defaults) Base.Z = 1;
	else if (typeof Base.Z != 'number') throw new Error('No Z value assigned to Sketch Item');
	if (Options.Color) Base.Color = Options.Color;
	else if (!Base.Color && Defaults) Base.Color = '#000000';
	else if (!Base.Color) throw new Error('No Color value assigned to Sketch Item');
	if (Options.Text) Base.Text = Options.Text;
	else if (!Base.Text && Defaults) Base.Text = '?';
	else if (!Base.Text) throw new Error('No Text value assigned to Sketch Item');
	return Base;
}
Edit.prototype.Types = ['Task', 'Kanban'];

function Extension(Path,Ext,Lower){
	Path=Path.trim();
	Ext=Ext.trim();
	if(Ext[0]!='.')Ext='.'+Ext;
	if(Lower)Ext=Ext.toLowerCase();
	let l1=Ext.length;
	let l2=Path.length;
	if((Lower&&Path.substring(l2-l1)==Ext)||(!Lower&&Path.substring(l2-l1).match(/${Ext}/i)))return Path;
	else if(Lower&&Path.substring(l2-l1).match(/${Ext}/i))return Path.substring(0,l2-l1)+Ext;
	else return Path+Ext;
}
Extension.incrementCopy=function(Path,Ext,Check){
	let Increment=1;
	let Match=false;
	do{Match=Check(`${Path}(${++Increment})${Ext}`)}while(!Match);
	return `${Path}(${Increment})${Ext}`;
}
module.exports=Extension;
const fs=require('fs');
const { Project } = require('ts-morph');
const p = new Project({ tsConfigFilePath: 'tsconfig.json' });
const sf = p.getSourceFileOrThrow('src/screens/vault/Flow02AddRecordScreen.tsx');
const t = sf.getFullText();
const ls=[0];for(let i=0;i<t.length;i++)if(t[i]==='\n')ls.push(i+1);
const entries = [[18,19,'radius'],[22,10,'selectedFileName']];
for (const [line,col,name] of entries){
  const pos = ls[line-1]+(col-1);
  const node = sf.getDescendantAtPos(pos);
  console.log(name,'->', node?node.getKindName():'NONE','parent',node&&node.getParent().getKindName());
}

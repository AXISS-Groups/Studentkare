const fs = require('fs');
const { Project } = require('ts-morph');
const diagFile = process.argv[2] || '/tmp/tsc_unused_input.txt';
const text = fs.readFileSync(diagFile, 'utf8');
const re = /^src\/([^(:]+)\((\d+),(\d+)\): error TS\d+: '([^']+)'/gm;
const byFile = {};
let m;
while ((m = re.exec(text))) {
  const file = 'src/' + m[1];
  (byFile[file] = byFile[file] || []).push({ line: +m[2], col: +m[3], name: m[4] });
}
console.log('files parsed:', Object.keys(byFile).length);
const project = new Project({ tsConfigFilePath: 'tsconfig.json' });
let totalEdits = 0;
for (const [file, entries] of Object.entries(byFile)) {
  let sf;
  try { sf = project.getSourceFileOrThrow(file); } catch (e) { console.log('MISSING', file); continue; }
  const full = sf.getFullText();
  const ls=[0];for(let i=0;i<full.length;i++)if(full[i]==='\n')ls.push(i+1);
  const posFor=(line,col)=>(ls[line-1]||0)+(col-1);
  const unusedNodes=new Map();
  for(const e of entries){const node=sf.getDescendantAtPos(posFor(e.line,e.col));if(node)unusedNodes.set(e.name,node);}
  console.log(file,'entries',entries.length,'matched',unusedNodes.size);
  const edits=[];const handled=new Set();
  for(const [name,node] of unusedNodes){
    const parent=node.getParent();const kind=parent&&parent.getKindName();
    if(kind==='BindingElement'){
      const pattern=parent.getParent();const elements=pattern.getElements();
      const used=elements.filter(el=>!unusedNodes.has(el.getName()));
      const stmt=pattern.getParent().getParent();
      if(used.length===0){if(!handled.has(stmt.getStart())){edits.push({start:stmt.getStart(),end:stmt.getEnd(),replacement:''});handled.add(stmt.getStart());}}
      else{const inner=used.map(el=>el.getText()).join(', ');const rep=pattern.getKindName()==='ObjectBindingPattern'?`{ ${inner} }`:`[ ${inner} ]`;edits.push({start:pattern.getStart(),end:pattern.getEnd(),replacement:rep});}
    } else if(kind==='VariableDeclaration'){
      const vList=parent.getParent();
      if(vList.getDeclarations().length===1){const stmt=vList.getParent();if(!handled.has(stmt.getStart())){edits.push({start:stmt.getStart(),end:stmt.getEnd(),replacement:''});handled.add(stmt.getStart());}}
      else{edits.push({start:parent.getStart(),end:parent.getEnd(),replacement:''});}
    }
  }
  edits.sort((a,b)=>b.start-a.start);
  let out=full;for(const ed of edits)out=out.slice(0,ed.start)+ed.replacement+out.slice(ed.end);
  totalEdits+=edits.length;
  if(out!==full)fs.writeFileSync(sf.getFilePath(),out);
}
console.log('edits',totalEdits);

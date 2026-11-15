const {app,BrowserWindow,ipcMain,dialog,protocol,net}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
protocol.registerSchemesAsPrivileged([{scheme:'vona',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.setName('VONA Studio Manager');
let file;
async function atomicWrite(bytes){const temp=file+'.tmp';await fs.writeFile(temp,Buffer.from(bytes));await fs.rename(temp,file);}
app.whenReady().then(()=>{
 file=path.join(app.getPath('userData'),'studio.sqlite');
 const root=path.resolve(__dirname,'../desktop-dist');
 protocol.handle('vona',request=>{const url=new URL(request.url);const relative=decodeURIComponent(url.pathname);const target=path.resolve(root,'.'+relative);if(!target.startsWith(root+path.sep)&&target!==root)return new Response('Forbidden',{status:403});const ext=path.extname(target);return net.fetch(pathToFileURL(ext?target:path.join(root,'index.html')).toString());});
 ipcMain.handle('studio:read',async()=>{try{return Array.from(await fs.readFile(file));}catch(e){if(e.code==='ENOENT')return null;throw e;}});
 ipcMain.handle('studio:write',async(_,bytes)=>atomicWrite(bytes));
 ipcMain.handle('studio:backup',async(_,bytes)=>{const r=await dialog.showSaveDialog({defaultPath:'VONA-Studio-backup.sqlite',filters:[{name:'SQLite database',extensions:['sqlite']}]});if(!r.canceled&&r.filePath)await fs.writeFile(r.filePath,Buffer.from(bytes));});
 ipcMain.handle('studio:restore',async()=>{const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'SQLite database',extensions:['sqlite','db']}]});return r.canceled?null:Array.from(await fs.readFile(r.filePaths[0]));});
 function create(){const w=new BrowserWindow({width:1440,height:960,minWidth:800,minHeight:650,title:'VONA Studio Manager',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.loadURL('vona://studio/');}
 create();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)create();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
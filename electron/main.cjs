const {app,BrowserWindow,ipcMain,dialog,protocol,net}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {dataPath,createStore}=require('./local-files.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'vona',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.setName('VONA Studio Manager');
// Stable, app-specific location, independent of package.json and installation path.
app.setPath('userData',dataPath(app.getPath('appData')));
if(!app.requestSingleInstanceLock()){app.quit();}else{
let store;
let quitting=false;
app.on('before-quit',event=>{if(!store||quitting)return;event.preventDefault();store.flush().then(()=>{quitting=true;app.quit();});});
app.on('second-instance',()=>{const w=BrowserWindow.getAllWindows()[0];if(w){if(w.isMinimized())w.restore();w.focus();}});
app.whenReady().then(()=>{
 store=createStore(app.getPath('userData'));
 if(process.platform==='darwin'&&app.dock)app.dock.setIcon(path.join(__dirname,'icons','icon.png'));
 const root=path.resolve(__dirname,'../desktop-dist');
 protocol.handle('vona',request=>{const url=new URL(request.url);if(url.hostname!=='studio')return new Response('Forbidden',{status:403});const relative=decodeURIComponent(url.pathname);const target=path.resolve(root,'.'+relative);if(!target.startsWith(root+path.sep)&&target!==root)return new Response('Forbidden',{status:403});const ext=path.extname(target);return net.fetch(pathToFileURL(ext?target:path.join(root,'index.html')).toString());});
 ipcMain.handle('studio:read',()=>store.read());
 ipcMain.handle('studio:write',(_,bytes)=>store.write(bytes));
 ipcMain.handle('studio:backup',async(_,bytes)=>{const r=await dialog.showSaveDialog({defaultPath:'VONA-Studio-backup.sqlite',filters:[{name:'Database SQLite',extensions:['sqlite']}]});if(r.canceled||!r.filePath)return false;await fs.writeFile(r.filePath,Buffer.from(bytes));return true;});
 ipcMain.handle('studio:restore',async()=>{const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'Database SQLite',extensions:['sqlite','db']}]});return r.canceled?null:Array.from(await fs.readFile(r.filePaths[0]));});
 function create(){const w=new BrowserWindow({width:1440,height:960,minWidth:800,minHeight:650,title:'VONA Studio Manager',icon:path.join(__dirname,'icons','icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});w.webContents.session.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_,callback)=>callback({cancel:true}));w.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('vona://studio/'))event.preventDefault();});w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.loadURL('vona://studio/');}
 create();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)create();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
}
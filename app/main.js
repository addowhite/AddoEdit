import path from 'path';
import url from 'url';
import { app, BrowserWindow, Menu, dialog, ipcMain } from 'electron';
import langDef from './src/language_and_theme_def.js'

const isDevelopment = (process.env.NODE_ENV === 'development');

let mainWindow = null;
let errorWindow = null;
let forceQuit = false;

ipcMain.on('file-save', saveCurrentFile)
ipcMain.on('file-choose-open', chooseOpenFile)
ipcMain.on('editor-ready', () => mainWindow.webContents.send('editor-ready'))
ipcMain.on('save-session', () => mainWindow.webContents.send('save-session'))
ipcMain.on('set-scroll'  , (ev, msg) => mainWindow.webContents.send('set-scroll', msg))

if (isDevelopment) {
  ipcMain.on('search-stackoverflow', (ev, error) => {
    errorWindow = new BrowserWindow({ title: 'Stack Overflow', width: 1280, height: 1024, show: false });
    errorWindow.loadURL(`http://stackoverflow.com/search?q=[js]${error.message.replace(/ /g, '+')}`);
    errorWindow.webContents.once('did-finish-load', () => errorWindow.show());
  })
}

function getThemeChangerCallback(themeName) {
  return () => mainWindow.webContents.send('theme-change', { msg: themeName })
}

function getFontSizeChangerCallback(fontSize) {
  return () => mainWindow.webContents.send('font-size-change', { msg: fontSize })
}

function getTabSizeChangerCallback(tabSize) {
  return () => mainWindow.webContents.send('tab-size-change', { msg: tabSize })
}

function chooseOpenFile() {
  dialog.showOpenDialog(
    { properties: ['multiSelections'] },
    (fileNames) => {
      if (!fileNames) return
      mainWindow.webContents.send('file-open', { msg: fileNames })
    }
  )
}

function saveCurrentFile() {
  mainWindow.webContents.send('file-save')
}

function formatThemeDisplayName(themeName) {
  return themeName.split(/[\s_]/).map((str) => str[0].toUpperCase() + str.substr(1).toLowerCase()).join(' ')
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const extensions = [
    'REACT_DEVELOPER_TOOLS',
    'REDUX_DEVTOOLS'
  ];
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  for (const name of extensions) {
    try {
      await installer.default(installer[name], forceDownload);
    } catch (e) {
      console.log(`Error installing ${name} extension: ${e.message}`);
    }
  }
};

app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin')
    app.quit();
});

app.on('ready', async () => {
  if (isDevelopment) {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    title: 'AddoEdit',
    width: 1280,
    height: 768,
    darkTheme: true,
    show: false
  });

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'Open', click: chooseOpenFile  },
        { label: 'Save', click: saveCurrentFile }
      ]
    },
    {
      label: 'Appearance',
      submenu: [
        {
          label: 'Theme',
          submenu: langDef.themes.map((themeName) => ({ label: formatThemeDisplayName(themeName), click: getThemeChangerCallback(themeName) }))
        },
        {
          label: 'Font Size',
          submenu: (() => {
            let items = []
            for (let i = 6; i <= 40; ++i)
              items.push({ label: String(i), click: getFontSizeChangerCallback(i) })
            return items
          })()
        },
        {
          label: 'Tab Size',
          submenu: (() => {
            let items = []
            for (let i = 1; i <= 8; ++i)
              items.push({ label: String(i), click: getTabSizeChangerCallback(i) })
            return items
          })()
        }
      ]
    }
  ]))

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));

  // show window once on first load
  mainWindow.webContents.once('did-finish-load', () => {
    mainWindow.show();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    // Handle window logic properly on macOS:
    // 1. App should not terminate if window has been closed
    // 2. Click on icon in dock should re-open the window
    // 3. ⌘+Q should close the window and quit the app
    if (process.platform === 'darwin') {
      mainWindow.on('close', function (e) {
        if (!forceQuit) {
          e.preventDefault();
          mainWindow.hide();
        }
      });

      app.on('activate', () => {
        mainWindow.show();
      });

      app.on('before-quit', () => {
        forceQuit = true;
      });
    } else {
      mainWindow.on('closed', () => {
        mainWindow = null;
      });
    }
  });

  if (isDevelopment) {
    // auto-open dev tools
    mainWindow.webContents.openDevTools();

    // add inspect element on right click menu
    mainWindow.webContents.on('context-menu', (e, props) => {
      Menu.buildFromTemplate([{
        label: 'Inspect element',
        click: () => mainWindow.inspectElement(props.x, props.y)
      }]).popup(mainWindow);
    });
  }
});

const electron = require('electron')
const app = electron.app
const menu = electron.Menu
const dialog = electron.dialog
const ipcRenderer = electron.ipcRenderer
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url  = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

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
  dialog.showOpenDialog((fileNames) => {
    if (!fileNames) return
    mainWindow.webContents.send('file-open', { msg: fileNames })
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'AddoEdit',
    width: 1280, height: 768,
    show: false, darkTheme: true
  })

  menu.setApplicationMenu(menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'Open', click: chooseOpenFile }
      ]
    },
    {
      label: 'Appearance',
      submenu: [
        {
          label: 'Theme',
          submenu: [
            { label: 'Monokai'        , click: getThemeChangerCallback('monokai')         },
            { label: 'Github'         , click: getThemeChangerCallback('github')          },
            { label: 'Tomorrow'       , click: getThemeChangerCallback('tomorrow')        },
            { label: 'Kuroir'         , click: getThemeChangerCallback('kuroir')          },
            { label: 'Twilight'       , click: getThemeChangerCallback('twilight')        },
            { label: 'Xcode'          , click: getThemeChangerCallback('xcode')           },
            { label: 'Textmate'       , click: getThemeChangerCallback('textmate')        },
            { label: 'Solarized Dark' , click: getThemeChangerCallback('solarized_dark')  },
            { label: 'Solarized Light', click: getThemeChangerCallback('solarized_light') },
            { label: 'Terminal'       , click: getThemeChangerCallback('terminal')        }
          ]
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

  mainWindow.once('ready-to-show', mainWindow.show)

  const devUrl = 'http://localhost:3000'

  const prodUrl = url.format({
    pathname: path.join(__dirname, '/../build/index.html'),
    protocol: 'file:',
    slashes: true
  })

  mainWindow.loadURL(process.env.ELECTRON_DEV == '1' ? devUrl : prodUrl)

  // mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => {
    // Set to null to make sure we don't try to it any more
    mainWindow = null
  })
}

app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin')
    app.quit()
})

app.on('activate', () => {
  if (mainWindow === null)
      createWindow()
})

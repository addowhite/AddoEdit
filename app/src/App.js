import React, { Component } from 'react'
import TabStream from './TabStream.js'
import Editor from './Editor.js'

const electron = window.require('electron')
const ipcRenderer = electron.ipcRenderer
const fs = window.require('fs')
const app = electron.remote.app

const webFrame = electron.webFrame
webFrame.registerURLSchemeAsPrivileged('file')

window.onerror = (messageOrEvent, source, lineno, colno, error) => {
  ipcRenderer.send('search-stackoverflow', { message: error.message })
  return true
}

function cancelEvent(ev) {
  ev.preventDefault()
  ev.stopPropagation()
  return false
}

class App extends Component {

  constructor(props) {
    super(props)

    this.onScroll    = this.onScroll.bind(this)
    this.getNewTabId = this.getNewTabId.bind(this)
    this.changeTab   = this.changeTab.bind(this)
    this.onDrop      = this.onDrop.bind(this)
    this.newFile     = this.newFile.bind(this)
    this.restoreFile = this.restoreFile.bind(this)
    this.openFile    = this.openFile.bind(this)
    this.saveFile    = this.saveFile.bind(this)
    this.saveAll     = this.saveAll.bind(this)
    this.loadSession = this.loadSession.bind(this)
    this.saveSession = this.saveSession.bind(this)

    this.nextTabId = 0

    this.state = {}
    this.state.currentFileId = -1
    this.state.files = {}

    this.sessionFilePath = app.getPath('userData') + '\\session.json'

    document.addEventListener('dragover', cancelEvent)
    document.addEventListener('drop', this.onDrop)

    ipcRenderer.on('file-open', (ev, data) => {
      let files = data.msg;
      for (let i = 0; i < files.length; ++i)
        if (files[i] !== '')
          this.openFile(files[i])
    })

    ipcRenderer.on('file-save', this.saveAll)
    ipcRenderer.on('editor-ready', this.loadSession)
    ipcRenderer.on('save-session', this.saveSession)
  }
  
  onScroll(editor) {
    var file = this.state.files[this.state.currentFileId]
    file.scrollTop = editor.session.$scrollTop
  }

  loadSession() {
    if (fs.existsSync(this.sessionFilePath)) {
      fs.readFile(this.sessionFilePath, 'utf-8', (error, data) => {
        if (error) {
          alert('Failed to load settings. ' + error.message)
          return
        }

        let session = JSON.parse(data)
        for (let i = 0; i < session.tabs.length; ++i) {
          let tab = session.tabs[i]
          this.restoreFile(tab)
        }
      })
    }
  }

  saveSession() {
    let selectedFile = this.state.files[this.state.currentFileId]
    let session = {
      tabs: []
    }
    let currentFile
    for (let fileName in this.state.files) {
      if (!this.state.files.hasOwnProperty(fileName)) continue
      currentFile = this.state.files[fileName]
      session.tabs.push({
        mode      : currentFile.mode,
        path      : currentFile.path,
        name      : currentFile.name,
        ext       : currentFile.ext,
        order     : currentFile.tabOrder,
        scrollTop : currentFile.scrollTop,
        contents  : currentFile.contents,
        selected  : (selectedFile === undefined) ? false : currentFile.tabOrder === selectedFile.tabOrder
      })
    }

    fs.writeFileSync(this.sessionFilePath, JSON.stringify(session))
  }

  getNewTabId() {
    return this.nextTabId++
  }

  onDrop(ev) {
    if (!ev || !ev.dataTransfer || !ev.dataTransfer.files || ev.dataTransfer.files.length === 0) return cancelEvent(ev)
    for (let i = 0; i < ev.dataTransfer.files.length; ++i)
      if (ev.dataTransfer.files[i].path !== '')
        this.openFile(ev.dataTransfer.files[i].path)
    return cancelEvent(ev)
  }

  changeTab(tabId) {
    this.setState({ currentFileId: tabId }, () => {
      let currentFile = this.state.files[this.state.currentFileId]
      if (currentFile)
        ipcRenderer.send('set-scroll', { scrollTop: currentFile.scrollTop })
      this.saveSession()
    })
  }

  closeTab(tabId) {
    delete this.state.files[tabId]
    if (Object.keys(this.state.files).length === 0)
      this.changeTab(-1)
    else
      this.changeTab(Number(Object.keys(this.state.files)[0]))
  }
  
  newFile() {
    let file = {}
    file.mode = 'auto'
    file.path = ''
    file.name = 'Untitled'
    file.ext  = 'txt'
    file.contents = ''
    file.tabId = this.getNewTabId()
    file.tabOrder = Object.values(this.state.files).reduce((accumulator, file) => Math.max(accumulator, file.tabOrder), -1) + 1
    file.onTabClick = (ev) => this.changeTab(file.tabId)
    file.onTabClose = (ev) => {
      ev.stopPropagation()
      this.closeTab(file.tabId)
    }
    file.scrollTop = 0
    
    let newFileEntry = {}
    newFileEntry[file.tabId] = file

    let stateChanges = {
      currentFileId: file.tabId,
      files: Object.assign({}, this.state.files, newFileEntry)
    }

    this.setState(stateChanges, this.saveSession)
  }
  
  restoreFile(fileInfo) {
    let file = {}
    file.mode = fileInfo.mode
    file.path = fileInfo.path
    file.name = fileInfo.name
    file.ext  = fileInfo.ext
    file.contents = fileInfo.contents
    file.scrollTop = fileInfo.scrollTop || 0
    file.tabId = this.getNewTabId()
    file.tabOrder = fileInfo.order
    file.onTabClick = (ev) => this.changeTab(file.tabId)
    file.onTabClose = (ev) => {
      ev.stopPropagation()
      this.closeTab(file.tabId)
    }
    
    if (!file.name || file.name === '')
      file.name = file.path.substr(Math.max(file.path.lastIndexOf('\\'), file.path.lastIndexOf('/')) + 1)
    
    let addTab = ((ev, fileContents) => {
      if (fileContents)
        file.contents = fileContents
      
      let newFileEntry = {}
      newFileEntry[file.tabId] = file
  
      let stateChanges = { files: Object.assign({}, this.state.files, newFileEntry) }
      
      if (fileInfo.selected)
        stateChanges.currentFileId = file.tabId
  
      this.setState(stateChanges, () => {
        if (fileInfo.selected)
          ipcRenderer.send('set-scroll', { scrollTop: file.scrollTop })
        this.saveSession()
      })
    }).bind(this)
    
    if (!file.contents) {
      fs.readFile(file.path, 'utf-8', addTab)
    } else {
      addTab()
    }
  }

  openFile(filePath, tabOrder, select) {
    select = (select === undefined ? true : select)

    fs.readFile(filePath, 'utf-8', (error, data) => {
      if (error) {
        alert('Failed to read file: \'' + filePath + '\'. ' + error.message)
        return
      }
      let file = {};
      file.mode = 'auto'
      file.path = filePath
      file.name = filePath.substr(Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/')) + 1)
      file.ext  = filePath.substr(filePath.lastIndexOf('.') + 1)
      file.contents = data
      file.tabId = this.getNewTabId()
      file.tabOrder = tabOrder
      file.onTabClick = (ev) => this.changeTab(file.tabId)
      file.onTabClose = (ev) => {
        ev.stopPropagation()
        this.closeTab(file.tabId)
      }
      file.scrollTop = 0

      if (file.tabOrder === undefined)
        file.tabOrder = Object.values(this.state.files).reduce((accumulator, file) => Math.max(accumulator, file.tabOrder), -1) + 1

      let newFileEntry = {}
      newFileEntry[file.tabId] = file

      let stateChanges = { files: Object.assign({}, this.state.files, newFileEntry) }

      if (select)
        stateChanges.currentFileId = file.tabId

      this.setState(stateChanges, this.saveSession)
    })
  }

  saveFile(file) {
    if (!file || file.path === '') return
    fs.writeFile(file.path, file.contents, (error) => {
      if (error) {
        alert('Failed to write file: \'' + file.path + '\'. ' + error.message)
        return
      }
    })
  }

  saveAll() {
    for (let fileId in this.state.files)
      if (this.state.files.hasOwnProperty(fileId))
        this.saveFile(this.state.files[fileId])
  }

  render() {
    return (
      <div className="app">
        <TabStream currentFileId={this.state.currentFileId} files={this.state.files} newFileCallback={this.newFile} />
        <Editor currentFileId={this.state.currentFileId} files={this.state.files} onScroll={this.onScroll} />
      </div>
    )
  }
}

export default App

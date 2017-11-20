import React, { Component } from 'react'
import TabStream from './TabStream.js'
import Editor from './Editor.js'

const electron = window.require('electron')
const ipcRenderer = electron.ipcRenderer
const fs = window.require('fs')

const webFrame = electron.webFrame
webFrame.registerURLSchemeAsPrivileged('file')

function cancelEvent(ev) {
  ev.preventDefault()
  ev.stopPropagation()
  return false
}

class App extends Component {

  constructor(props) {
    super(props);

    this.getNewTabId = this.getNewTabId.bind(this);
    this.changeTab   = this.changeTab.bind(this);
    this.onDrop      = this.onDrop.bind(this)
    this.openFile    = this.openFile.bind(this);
    this.saveFile    = this.saveFile.bind(this);
    this.saveAll     = this.saveAll.bind(this);

    this.nextTabId = 0;

    this.state = {};
    this.state.currentFileId = -1;
    this.state.files = {};

    document.addEventListener('dragover', cancelEvent)
    document.addEventListener('drop', this.onDrop)

    ipcRenderer.on('file-open', (ev, data) => {
      let files = data.msg;
      for (let i = 0; i < files.length; ++i)
        if (files[i] !== '')
          this.openFile(files[i])
    })

    // ipcRenderer.on('file-save', () => this.saveFile(this.state.files[this.state.currentFileId]))
    ipcRenderer.on('file-save', () => this.saveAll())
  }

  getNewTabId() {
    return this.nextTabId++;
  }

  onDrop(ev) {
    if (!ev || !ev.dataTransfer || !ev.dataTransfer.files || ev.dataTransfer.files.length === 0) return cancelEvent(ev)
    for (let i = 0; i < ev.dataTransfer.files.length; ++i)
      if (ev.dataTransfer.files[i].path !== '')
        this.openFile(ev.dataTransfer.files[i].path)
    return cancelEvent(ev)
  }

  changeTab(tabId) {
    this.setState({ currentFileId: tabId })
  }

  closeTab(tabId) {
    delete this.state.files[tabId]
    if (Object.keys(this.state.files).length === 0)
      this.changeTab(-1)
    else
      this.changeTab(Number(Object.keys(this.state.files)[0]))
  }

  openFile(filePath) {
    fs.readFile(filePath, 'utf-8', (error, data) => {
      if (error) {
        alert('Failed to read file: \'' + filePath + '\'. ' + error.message)
        return
      }
      let file = {};
      file.path = filePath;
      file.name = filePath.substr(Math.max(filePath.lastIndexOf('\\'), filePath.lastIndexOf('/')) + 1);
      file.contents = data;
      file.tabId = this.getNewTabId();
      file.onTabClick = () => this.changeTab(file.tabId);
      file.onTabClose = (ev) => {
        ev.stopPropagation()
        this.closeTab(file.tabId)
      }
      file.scrollTop = 0;

      let newFileEntry = {}
      newFileEntry[file.tabId] = file

      this.setState({
        files: Object.assign({}, this.state.files, newFileEntry),
        currentFileId: file.tabId
      });
    });
  }

  saveFile(file) {
    if (!file) return
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
        <TabStream currentFileId={this.state.currentFileId} files={this.state.files} />
        <Editor currentFileId={this.state.currentFileId} files={this.state.files} />
      </div>
    )
  }
}

export default App
